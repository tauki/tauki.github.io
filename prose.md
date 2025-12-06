---
layout: default
title: Prose
permalink: /prose/
---

<div class="prose-journal">
  <div class="journal-controls">
    <div id="journal-tags" class="journal-tags"></div>
    <button id="toggle-all-btn" class="journal-toggle-btn">Collapse</button>
  </div>

  <div id="journal-container"></div>
  <div id="loading-indicator" class="loading-indicator">Loading...</div>
  <div id="scroll-sentinel"></div>
</div>

<script src="/assets/js/prose.js?v={{ site.time | date: '%s' }}"></script>
