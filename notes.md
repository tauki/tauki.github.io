---
layout: default
title: Notes
permalink: /notes/
---

Here is a collection of my notes.
<ul class="post-list">
  {% for note in site.notes %}
    <li>
      <a class="post-link-inline" href="{{ note.url }}">{{ note.title | escape }}</a>
      <span class="post-meta-inline">
        - {{ note.date | date: "%b %-d, %Y" }}
      </span>
    </li>
  {% endfor %}
</ul>
