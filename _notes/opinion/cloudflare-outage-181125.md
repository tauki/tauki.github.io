---
layout: post
title: About The Cloudflare Outage
subtitle: That happened on November 18, 2025
date: 2025-11-19
categories:
  - Opinion
  - system-design
image: /assets/images/notes/cloudflare-outage-181125-1.png
published: true
---

--- 
<details>
  <summary>TL;DR (AI)</summary>
  Cloudflare’s global outage wasn’t caused by one bug; it was a chain reaction. A ClickHouse permissions change exposed extra metadata, breaking a query that silently assumed only one database. That bad query generated oversized ML feature configs, which were then pushed globally without safeguards. Those configs exceeded a hard limit in the proxy’s Bot Management module, triggering a Rust .unwrap() panic and causing widespread 5xx errors. The fix involved stopping the bad configs, pushing a safe one, and restarting the proxy fleet.
 
<br/><br/>
<b>Core lessons:</b> make assumptions explicit, validate configs like code, avoid unwrap() in critical paths, and build systems that fail safely. Modern outages are rarely one failure, they’re interacting, compounding assumptions breaking at the same time.
</details>

--- 

On November 18th, Cloudflare experienced a global outage that resulted in intermittent 5xx errors and degraded performance across its network. (Everyone knows that this happened; let's take a moment to think about the scale and appreciate the beauty of it.) Their post-incident report makes something very clear: this wasn’t the result of a single line of code, but a sequence of interacting failures.

![picture from Cloudflare post-mortem blog post](/assets/images/notes/cloudflare-outage-181125-1.png)

Here’s a walkthrough of what happened, and what we can learn from it.

### 1. A Change to ClickHouse Permissions Altered Metadata Visibility

Cloudflare’s analytics systems use ClickHouse, and their clusters expose:

- A `default` database with distributed tables
- An `r0` database containing the underlying shard tables

Historically, when querying `system.columns`, only the `default` database was visible.

At 11:05 UTC, permissions were adjusted so that users could also see columns from the `r0` database. This was a security improvement; queries would now execute under the requesting user instead of an internal account. {% include marginnote.html id="mn1" content="This is the first key assumption break: “system.columns only shows default tables” stopped being true." %}

But this also changed the shape of the metadata exposed by `system.columns`. 

### 2. A Query Assumed an Invariant That Was No Longer True
Bot Management’s feature configuration generator uses this query:

```sql
select name, type
from system.columns
where table = 'http_requests_features'
order by name;
```
{% include marginnote.html id="mn2"  content="Notice what’s missing: no filter on database." %}

This query implicitly assumed:

- `system.columns` Only returned entries from the `default` database
- The number of features (columns) would remain within an expected range

Before the permissions change, that was (accidentally) fine because `system.columns` only returned columns from `default`.

After the permissions change, this query now returned:

- Columns from `default.http_requests_features`
- Columns from `r0.http_requests_features` on each shard 

That effectively more than doubled the number of rows (features) the feature generator saw. {% include marginnote.html id="3" content="bad SQL / bad assumption" %}

### 3. The Feature File Became Oversized and Propagated Globally 

Bot Management uses a feature configuration file that lists all the features used by the ML model. It’s regenerated every few minutes from that ClickHouse query and pushed to the entire network.

After the permissions change, whenever the query ran on a ClickHouse node that had the new grants, it produced an “inflated” file (with duplicated features). This led to:

- Intermittent generation of feature files containing far more data than normal
- Those oversized files are being pushed into global distribution
- Every 5 minutes, there was a kind of “coin flip” as to whether a good or bad file would be generated and propagated. Hence, an oscillation between healthy and unhealthy behavior every few minutes.

So now, we have a periodically regenerated configuration file that is sometimes valid, sometimes oversized, and eagerly rolled out. 

> This is an important takeaway: configuration is code, and configuration rollouts need the same safety guarantees as software deployments.

### 4. A Hard Cap on the Number of Supported Features Was Exceeded

On the proxy side:

- The Bot Management module has a hard limit on “how many features” it supports at runtime, currently 200. In practice, they use ~60 features. 
- For performance reasons, they preallocate memory based on that limit.

When the bad file (with more than 200 features) gets loaded:

- A check detects “> 200 features”.
- That check returns an error Result in the Rust code.
- Then comes the line: the code calls .unwrap() on that Result, which panics when it’s an Err. 

> thread fl2_worker_thread panicked: called Result::unwrap() on an Err value 

That panic bubbles up inside FL2 and results in HTTP 5xx responses for traffic that goes through the bots module.

So: the feature file crosses a size limit → module hits limit → code panics → proxy thread dies → users see 5xx.

### 5. The Runtime Reaction Led to Traffic Impact

This "bots module" is part of the core proxy path (FL / FL2). Most traffic goes through FL → Pingora and has Bot Management evaluated along the way. 

When the oversized feature file was loaded:

- In FL2 (the newer proxy engine), the module encountered the “exceeded limit” condition and returned an error. 
- That error was not handled in a way that allowed graceful degradation. 
- The worker thread terminated, resulting in HTTP 5xx errors.

In the older FL engine, the behavior was different: it didn’t error, but instead assigned all traffic a bot score of zero, which disrupted bot-based rules.

They initially suspected a hyper-scale DDoS (especially because the status page also had issues, coincidentally). Only after digging into logs/observability did they realize the root cause was the feature file + bots module. 

Mitigation:

- Stop generating and propagating the bad feature file.
- Manually push a known-good file into the distribution queue.
- Restart the core proxy everywhere.

By 14:30, core traffic was mostly back; all systems were normal by 17:06. 

## Where the query / design went wrong
### Query assumed a particular metadata shape
- It assumed system.columns only exposed the default DB. That was never encoded in the query (database = 'default') or contract.
- Once permissions changed, the same query meant something different.

### No robust upper bound or guardrail at the data side
- The system had a hard limit of 200 features, but that constraint wasn’t enforced where the data was generated.
- You'd expect:
```sql
select name, type
from system.columns
where table = 'http_requests_features'
  and database = 'default'
order by name;
```
or even:
```sql
... limit 200
```
plus a sanity check “if new feature count >> old feature count, don’t roll out.”

### Config rollouts lacked “safe failure” semantics
- A single bad feature file could take down the system. 
- There was no “if the new config looks insane, keep the old one” mechanism. 
- No canary or staged rollout where only a subset of the fleet consumes new configs first. 

### Cluster migration + config generation coupling
- They were gradually changing permissions on a live ClickHouse cluster that was a source of global configuration. 
- As nodes flipped from “old behavior” to “new behavior”, config oscillated accordingly.

All of those are architectural / query / system-design fails. Even with perfect error handling in code, you’d still have a nasty situation unless you design the config pipeline to fail safe.

## Where the Rust unwrap() went wrong
Now, the Rust side:
- The module had a check along the lines of: “Is feature_count <= 200? If not, return an error.”
- That error was wrapped in a Result.
- Then someone wrote .unwrap() on it in FL2, causing a panic if the limit was exceeded.

###  Why this is bad in this context
- This is not a “this can literally never fail or the process should die” scenario. It’s config loading, which is exactly where you expect occasional weird data.
- In a global edge system, panicking a worker thread under config load → taking out real user traffic → is not an acceptable failure mode. 

###  Reasonable alternatives
- Log error, reject new config, keep using last known good config. 
- Start in “bots disabled / degraded mode” but continue serving traffic.
- Trip a circuit breaker and alert SRE, but don’t panic the worker. 

So yes, the unwrap() is absolutely a bug in error handling and resilience. 

But, "and this is important", it’s downstream of the data/assumption bug. It’s the fuse blowing, not the overloaded circuit being designed badly in the first place.

## How can someone harden for something like this?

>(These are options. You should do what you need in your case.)

### 1. Make assumptions explicit
Queries that rely on cluster-specific behavior should encode that intent:
```sql
where database = 'default'
```
is more robust than relying on historical behavior.

### 2. Make config rollouts safe
Treat config like code deployment:
- Validate size & shape.
- Staged rollout (1% → 10% → 100%).
- Automatic rollback on failure.

### 3. Change error behavior in modules
- Never panic on config load unless you absolutely must.

Implement: 
- “Reject new config & keep old”. 
- “Disable non-critical module but keep serving traffic”.

### 4. Improve testing around infra changes
When changing ClickHouse permissions/behavior, run “blast radius” tests on all consumers of system.* tables. Even metadata visibility changes can break brittle assumptions.

## The Real Lesson: Outages Rarely Have a Single Cause

This incident is a classic example of how modern distributed systems fail:

1. ***A controlled infrastructure change***  → altered the shape of a dataset.
2. ***A query built on implicit assumptions*** → produced output that violated downstream constraints.
3. ***A configuration pipeline without safety checks*** → propagated the abnormal data globally.
4. ***A runtime module with strict limits but no safe fallback*** → escalated an invalid state into user-visible errors. 

Each step alone is trivial.

Combined, they create a systemic failure.

And that’s the key takeaway.

Large-scale systems don’t usually fail because of one bad line of code. They fail when multiple small, reasonable decisions intersect in unexpected ways. Cloudflare’s transparency in documenting this incident gives the entire engineering community a chance to learn from a real example. We should take this chance to applaud their effort and thank them for their transparency and for holding down this big machine that is connecting so many people every second.

![picture from Cloudflare post-mortem blog post, shows number of request per second being served 500](/assets/images/notes/cloudflare-outage-181125-2.png)

That's ~30M req/s 👏👏

---
> Reference: [https://blog.cloudflare.com/18-november-2025-outage/](https://blog.cloudflare.com/18-november-2025-outage/)