# Website Content Guide

This repository hosts a static website built with Jekyll. Here is how to add and manage content.

## Adding Content

All content lives in the `_notes/` directory. You can organize files into subfolders if you wish; the site will treat them all the same.

To add a new post or note, simply create a Markdown (`.md`) file in `_notes/`.

## Front Matter

Every file must start with a "Front Matter" block at the very top. This tells the site how to handle the file.

```yaml
---
title: "My New Post"
categories: [Technology, General]
date: 2024-01-01 12:00:00 +0000
---
```

### Fields Explained

*   **`title`**: The title of your post as it will appear on the site.
*   **`categories`**: A list of categories.
    *   **Important**: If you include `Blog` in this list (e.g., `[Blog, Tech]`), the post will automatically appear on the dedicated **Blog** page.
    *   All other categories will group the post on the Homepage and Categories page.
    *   If you omit this, the post will appear under "Uncategorized".
*   **`date`** (Optional): The publication date.
    *   Format: `YYYY-MM-DD HH:MM:SS +/-TTTT` (e.g., `2023-05-15 10:00:00 +0000`).
    *   If omitted, the site uses the file's creation date or today's date.

## Custom Layouts

The site uses the `default` layout automatically. To use a different layout for a specific page:

1.  **Create**: Add a new HTML file in `_layouts/` (e.g., `minimal.html`).
2.  **Use**: In your note's front matter, override the default:

```yaml
---
layout: minimal
title: "My Special Page"
---
```

## Images

Store your images in `assets/images/notes/`.
Link to them using the absolute path:

```markdown
![Image Description](/assets/images/notes/my-image.jpg)
```

## Running Locally

To preview the site on your computer:

1.  Open a terminal in this folder.
2.  Run: `sh run.sh`
3.  Open `http://localhost:4000` in your browser.