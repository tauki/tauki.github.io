---
layout: default
title: Categories
permalink: /categories/
---



{% assign all_categories = site.notes | map: "categories" | flatten | uniq | sort %}

<h2 id="uncategorized">Uncategorized</h2>
<ul class="post-list">
  {% for note in site.notes %}
    {% if note.categories.size == 0 %}
      <li style="margin-bottom: 30px;">
        <h3><a class="post-link" href="{{ note.url }}">{{ note.title | escape }}</a></h3>
        {% if note.subtitle %}
          <p class="post-subtitle">{{ note.subtitle }}</p>
        {% endif %}
        <span class="post-meta" style="font-size: 0.9rem; color: var(--meta-color);">
          {{ note.date | date: "%b %-d, %Y" }}
        </span>
      </li>
    {% endif %}
  {% endfor %}
</ul>

{% for category in all_categories %}
  <h2 id="{{ category | slugify }}">{{ category }}</h2>
  <ul class="post-list">
    {% for note in site.notes %}
      {% if note.categories contains category %}
        <li style="margin-bottom: 30px;">
          <h3><a class="post-link" href="{{ note.url }}">{{ note.title | escape }}</a></h3>
          {% if note.subtitle %}
            <p class="post-subtitle">{{ note.subtitle }}</p>
          {% endif %}
          <span class="post-meta" style="font-size: 0.9rem; color: var(--meta-color);">
            {{ note.date | date: "%b %-d, %Y" }}
          </span>
        </li>
      {% endif %}
    {% endfor %}
  </ul>
{% endfor %}
