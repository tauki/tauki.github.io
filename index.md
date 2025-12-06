---
layout: default
title: Home
---



<div class="home-container">
  
  <div class="home-main">
    {% assign prose_categories = site.prose_categories %}
    {% assign notes = site.notes | sort: 'date' | reverse %}
    {% for note in notes %}
      {% assign show_post = false %}
      
      {% if note.categories.size == 0 %}
        {% assign show_post = true %}
      {% else %}
        {% for category in note.categories %}
          {% unless prose_categories contains category %}
            {% assign show_post = true %}
            {% break %}
          {% endunless %}
        {% endfor %}
      {% endif %}
      
      {% unless show_post %}
        {% continue %}
      {% endunless %}
      <div class="post-item" data-categories="{{ note.categories | join: ' ' | downcase }}">
        <div class="post-date-side">
          {{ note.date | date: "%b %-d, %Y" }}
          <span class="read-time">
            {{ note.content | number_of_words | divided_by: 180 | plus: 1 }} min read
          </span>
        </div>
        
        <div class="post-content-side">
          <div class="post-content-wrapper">
            <div class="post-text-col">
              <h3><a class="post-link" href="{{ note.url | relative_url }}">{{ note.title | escape }}</a></h3>
              
              {% if note.categories.size > 0 %}
              <div class="post-tags">
                {% for category in note.categories %}
                  <span class="post-tag">{{ category }}</span>
                {% endfor %}
              </div>
              {% endif %}

              {% if note.subtitle %}
                <p class="post-subtitle">{{ note.subtitle }}</p>
              {% elsif note.layout == 'prose' %}
                <p class="post-subtitle">{{ note.content | strip_html | truncate: 200 }}</p>
              {% endif %}
            </div>
            
            {% if note.image %}
              <img src="{{ note.image }}" alt="{{ note.title }}" class="post-thumbnail">
            {% endif %}
          </div>
        </div>
      </div>
    {% endfor %}
  </div>

  <aside class="home-sidebar">
    <h3>Categories</h3>
    <ul class="category-list">
      <li><a href="#" onclick="filterPosts('all'); return false;" class="category-link active" data-category="all">All</a></li>
      {% assign all_categories = site.notes | map: "categories" | flatten | uniq | sort %}
      {% for category in all_categories %}
        {% if prose_categories contains category %}
          {% continue %}
        {% endif %}
        <li><a href="#" onclick="filterPosts('{{ category | downcase }}'); return false;" class="category-link" data-category="{{ category | downcase }}">{{ category }}</a></li>
      {% endfor %}
      <li><a href="#" onclick="filterPosts('uncategorized'); return false;" class="category-link" data-category="uncategorized">Uncategorized</a></li>
    </ul>
  </aside>

</div>

<script>
function filterPosts(category) {
  // Update active state
  document.querySelectorAll('.category-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.category === category) {
      link.classList.add('active');
    }
  });

  // Filter posts
  const posts = document.querySelectorAll('.post-item');
  posts.forEach(post => {
    const categories = post.dataset.categories.trim().split(' ').filter(c => c !== "");
    
    if (category === 'all') {
      post.style.display = 'flex';
    } else if (category === 'uncategorized') {
      if (categories.length === 0) {
        post.style.display = 'flex';
      } else {
        post.style.display = 'none';
      }
    } else {
      if (categories.includes(category)) {
        post.style.display = 'flex';
      } else {
        post.style.display = 'none';
      }
    }
  });
}
</script>