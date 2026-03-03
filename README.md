# 🌿 Obsidian Knowledge Garden

A fully static knowledge garden that bridges an Obsidian vault with an Astro-powered website, deployed automatically to GitHub Pages via GitHub Actions. Notes are organized by folder, support wikilinks, tags, and backlinks, and are rendered as clean HTML pages.

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321) in your browser.

## Configuration Before Deploying

Before deploying to GitHub Pages, edit **`astro.config.mjs`** and update these two lines:

```javascript
site: 'https://YOUR_USERNAME.github.io',   // Replace YOUR_USERNAME with your GitHub username
base: '/YOUR_REPO_NAME',                   // Replace YOUR_REPO_NAME with your repository name
```

## Enabling GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**
4. Push to the `main` branch — the workflow will build and deploy automatically

## Adding Notes

Place Markdown files anywhere inside the `vault/` directory. The folder path becomes the URL path. For example:
- `vault/topics/my-note.md` → `/topics/my-note`
- `vault/essays/intro.md` → `/essays/intro`

Use standard Obsidian frontmatter:
```yaml
---
title: My Note Title
tags: [example, notes]
created: 2026-01-01
description: A brief description.
---
```

## Obsidian Git Plugin (Recommended)

Install the **Obsidian Git** community plugin to sync your vault with GitHub automatically:

1. Open Obsidian → Settings → Community Plugins → Browse
2. Search for "Obsidian Git" and install it
3. Recommended settings:
   - **Vault backup interval**: 10 minutes
   - **Auto pull interval**: 10 minutes
   - **Commit message**: `vault backup: {{date}}`
   - **Pull updates on startup**: enabled

## Project Structure

```
vault/          # Your Obsidian notes live here
src/            # Astro source files
  components/   # Backlinks, TagList, Breadcrumb
  layouts/      # Base HTML layout
  pages/        # Route handlers
  lib/          # Utility functions
public/         # Static assets
```
