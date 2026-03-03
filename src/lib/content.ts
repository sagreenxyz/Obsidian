import type { CollectionEntry } from 'astro:content';

// Derive a display title from frontmatter or filename
export function getNoteTitle(note: CollectionEntry<'vault'>): string {
  if (note.data.title) return note.data.title;
  const filename = note.slug.split('/').at(-1) ?? note.slug;
  return filename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Get breadcrumb segments from a slug
export function getBreadcrumbs(slug: string): { label: string; href: string }[] {
  const parts = slug.split('/');
  return parts.slice(0, -1).map((part, i) => ({
    label: part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    href: '/' + parts.slice(0, i + 1).join('/')
  }));
}
