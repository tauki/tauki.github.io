---
layout: default
title: Home
---

# Welcome

This is my personal website where I share my thoughts and experiences.

## Recent Posts

{% for post in site.posts %}
- [{{ post.title }}]({{ post.url | relative_url }}) - {{ post.date | date: "%B %-d, %Y" }} - {% include reading_time.html content=post.content %}
{% endfor %} 