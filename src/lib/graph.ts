import type { CollectionEntry } from 'astro:content';
import { getNoteTitle } from './content';

export interface GraphNode {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  tags: string[];
  description?: string;
  slug: string;
  connectionCount: number;
  chapterNum: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'sequential' | 'wikilink' | 'prerequisite';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Determine the top-level category and subcategory from a slug. */
function getCategories(slug: string): { category: string; subcategory: string } {
  const parts = slug.split('/');
  const top = parts[0] ?? 'general';
  if (top === 'pharmacology') {
    const sub = parts[1] ?? '';
    if (sub.includes('drug') || sub.includes('calculation')) {
      return { category: 'drug-calculations', subcategory: 'Drug Calculations' };
    }
    return { category: 'pharmacology', subcategory: 'Pharmacology' };
  }
  if (top === 'essays') return { category: 'essays', subcategory: 'Essays' };
  if (top === 'topics') return { category: 'topics', subcategory: 'Topics' };
  return { category: 'general', subcategory: top };
}

/** Extract a chapter number from a slug segment if present. */
function extractChapterNum(slug: string): number | null {
  const match = slug.match(/chapter-(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Build a graph of nodes and edges from all vault notes.
 *
 * Three edge types are created:
 *  - "sequential": implied prerequisite between consecutive chapters in the same folder
 *  - "prerequisite": explicit prerequisite declared in note frontmatter
 *  - "wikilink": [[wikilink]] reference found in note body
 */
export function buildGraphData(notes: CollectionEntry<'vault'>[]): GraphData {
  const wikilinkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;

  // Build lookup maps
  const slugToNote = new Map<string, CollectionEntry<'vault'>>();
  for (const note of notes) {
    slugToNote.set(note.slug, note);
  }

  // Map "normalized last segment" → slug for wikilink resolution
  const normalizedToSlug = new Map<string, string>();
  // Also build a suffix-indexed map for partial slug matching
  const suffixToSlug = new Map<string, string>();
  for (const note of notes) {
    const lastSeg = note.slug.split('/').at(-1) ?? '';
    normalizedToSlug.set(lastSeg.toLowerCase(), note.slug);
    // Index every suffix segment for O(1) "ends with" lookups
    suffixToSlug.set(lastSeg.toLowerCase(), note.slug);
    // Also index by full title (normalized) if available
    const title = note.data.title;
    if (title) {
      normalizedToSlug.set(title.toLowerCase().replace(/ /g, '-'), note.slug);
    }
  }

  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  function addEdge(source: string, target: string, type: GraphEdge['type']) {
    if (source === target) return;
    const key = `${type}:${source}→${target}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source, target, type });
  }

  // --- Sequential chapter edges ---
  // Group notes by their parent folder
  const byFolder = new Map<string, Array<{ note: CollectionEntry<'vault'>; chapterNum: number }>>();
  for (const note of notes) {
    const chapterNum = extractChapterNum(note.slug);
    if (chapterNum === null) continue;
    const folder = note.slug.split('/').slice(0, -1).join('/');
    const existing = byFolder.get(folder) ?? [];
    existing.push({ note, chapterNum });
    byFolder.set(folder, existing);
  }
  for (const group of byFolder.values()) {
    group.sort((a, b) => a.chapterNum - b.chapterNum);
    for (let i = 1; i < group.length; i++) {
      addEdge(group[i - 1].note.slug, group[i].note.slug, 'sequential');
    }
  }

  // --- Wikilink and prerequisite edges ---
  for (const note of notes) {
    // Wikilinks from body
    const body = note.body ?? '';
    const matches = [...body.matchAll(wikilinkRegex)];
    for (const match of matches) {
      const raw = match[1].trim();
      const normalized = raw.toLowerCase().replace(/ /g, '-');
      const targetSlug =
        normalizedToSlug.get(normalized) ??
        suffixToSlug.get(normalized) ??
        suffixToSlug.get(raw.toLowerCase());
      if (targetSlug) addEdge(note.slug, targetSlug, 'wikilink');
    }

    // Explicit prerequisites from frontmatter
    const prereqs: string[] = (note.data as { prerequisites?: string[] }).prerequisites ?? [];
    for (const prereq of prereqs) {
      const normalized = prereq.toLowerCase().replace(/ /g, '-');
      const prereqSlug =
        normalizedToSlug.get(normalized) ??
        suffixToSlug.get(normalized);
      if (prereqSlug) addEdge(prereqSlug, note.slug, 'prerequisite');
    }
  }

  // --- Build connection counts ---
  const connectionCounts = new Map<string, number>();
  for (const edge of edges) {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) ?? 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) ?? 0) + 1);
  }

  // --- Build nodes ---
  const nodes: GraphNode[] = notes.map(note => {
    const { category, subcategory } = getCategories(note.slug);
    return {
      id: note.slug,
      title: getNoteTitle(note),
      category,
      subcategory,
      tags: note.data.tags ?? [],
      description: note.data.description,
      slug: note.slug,
      connectionCount: connectionCounts.get(note.slug) ?? 0,
      chapterNum: extractChapterNum(note.slug),
    };
  });

  return { nodes, edges };
}
