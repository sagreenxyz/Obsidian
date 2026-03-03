import type { CollectionEntry } from 'astro:content';

// Build a map of slug → array of slugs that link to it
export function buildBacklinksIndex(
  notes: CollectionEntry<'vault'>[]
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const wikilinkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;

  for (const note of notes) {
    const matches = [...(note.body ?? '').matchAll(wikilinkRegex)];
    for (const match of matches) {
      const target = match[1].trim().toLowerCase().replace(/ /g, '-');
      const existing = index.get(target) ?? [];
      index.set(target, [...existing, note.slug]);
    }
  }
  return index;
}

// Extract all wikilinks from a note body
export function extractWikilinks(body: string): string[] {
  const regex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  return [...body.matchAll(regex)].map(m => m[1].trim());
}
