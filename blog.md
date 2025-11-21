---
layout: default
title: Blog
permalink: /blog/
---

# Blog Posts

<ul class="post-list">
  {% for note in site.notes %}
    {% if note.categories contains "Blog" %}
      <li style="margin-bottom: 30px;">
        <h3><a class="post-link" href="{{ note.url }}">{{ note.title | escape }}</a></h3>
        {% if note.subtitle %}
          <p class="post-subtitle">{{ note.subtitle }}</p>
        {% endif %}
        
        <div class="post-tags">
          {% for cat in note.categories %}
            <a class="post-tag" href="/categories/#{{ cat | slugify }}">{{ cat }}</a>
          {% endfor %}
        </div>
      </li>
    {% endif %}
  {% endfor %}
</ul>