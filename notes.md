---
layout: default
title: Notes
permalink: /notes/
---

Here is a collection of my notes.
<ul class="post-list">
  {% assign sorted_notes = site.notes | where_exp: "item", "item.layout != 'book'" | sort: 'date' | reverse %}
  {% for note in sorted_notes %}
    <li>
      <a class="post-link-inline" href="{{ note.url }}">{{ note.title | escape }}</a>
      <span class="post-meta-inline">
        - {{ note.date | date: "%b %-d, %Y" }}
      </span>
    </li>
  {% endfor %}
</ul>
