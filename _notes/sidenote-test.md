---
layout: default
title: "Sidenote Test"
subtitle: "Exploring marginalia and layout features"
image: https://placehold.co/120x80
categories: [Tech]
published: false
---

# Testing Sidenotes

This is a paragraph to test the sidenote feature. Sidenotes are marginalia that appear on the side of the text on large screens. {% include sidenote.html id="1" content="This is a sidenote! It should appear in the right margin on desktop." %}

They are great for adding context without breaking the flow of reading. Unlike footnotes, you don't have to jump to the bottom of the page. {% include sidenote.html id="2" content="Sidenotes keep the context right next to the text." %}

## Mobile Behavior

On mobile devices, these notes should be hidden by default and revealed when you click the number. {% include sidenote.html id="3" content="I am a hidden note on mobile! Click me to see." %}

Let's see how it looks!
