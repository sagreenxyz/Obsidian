import { defineConfig } from 'astro/config';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

function copyAttachments() {
  return {
    name: 'copy-obsidian-attachments',
    buildStart() {
      const src = 'vault/attachments';
      const dest = 'public/attachments';
      if (!existsSync(src)) return;
      mkdirSync(dest, { recursive: true });
      for (const file of readdirSync(src)) {
        copyFileSync(join(src, file), join(dest, file));
      }
    }
  };
}

export default defineConfig({
  site: 'https://YOUR_USERNAME.github.io',   // Replace with your GitHub username
  base: '/YOUR_REPO_NAME',                   // Replace with your repository name
  vite: { plugins: [copyAttachments()] },
  markdown: {
    remarkPlugins: [
      ['remark-wiki-link', {
        hrefTemplate: (permalink) => `/${permalink}`,
        pageResolver: (name) => [name.toLowerCase().replace(/ /g, '-')],
        aliasDivider: '|'
      }]
    ]
  }
});
