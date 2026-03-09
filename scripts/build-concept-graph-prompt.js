#!/usr/bin/env node
/**
 * build-concept-graph-prompt.js
 *
 * Reads vault/concept-graph-manifest.json and outputs a ready-to-use LLM prompt
 * that asks the model to analyze the chapter summaries and produce/update
 * vault/concept-graph.json.
 *
 * Usage:
 *   node scripts/build-concept-graph-prompt.js [--domain <domain>] [--output <file>]
 *
 * Options:
 *   --domain <domain>   Only include chapters from a specific domain (e.g. "Cardiovascular")
 *   --output <file>     Write prompt to a file instead of stdout
 *
 * Examples:
 *   node scripts/build-concept-graph-prompt.js
 *   node scripts/build-concept-graph-prompt.js --domain Cardiovascular
 *   node scripts/build-concept-graph-prompt.js --output /tmp/prompt.txt
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Parse CLI arguments ---
const args = process.argv.slice(2);
let domainFilter = null;
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--domain' && args[i + 1]) {
    domainFilter = args[++i];
  } else if (args[i] === '--output' && args[i + 1]) {
    outputFile = args[++i];
  }
}

// --- Load manifest ---
const manifestPath = join(ROOT, 'vault', 'concept-graph-manifest.json');
if (!existsSync(manifestPath)) {
  console.error('ERROR: vault/concept-graph-manifest.json not found.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// --- Load existing graph (for context, optional) ---
const graphPath = join(ROOT, 'vault', 'concept-graph.json');
const existingGraph = existsSync(graphPath)
  ? JSON.parse(readFileSync(graphPath, 'utf8'))
  : null;

// --- Collect chapter summaries ---
const chapterSections = [];

for (const book of manifest.books) {
  const bookChapters = domainFilter
    ? book.chapters.filter(ch => ch.domain === domainFilter)
    : book.chapters;

  if (bookChapters.length === 0) continue;

  for (const chapter of bookChapters) {
    const filePath = join(ROOT, book.path, chapter.file);
    if (!existsSync(filePath)) {
      console.warn(`WARNING: File not found, skipping: ${filePath}`);
      continue;
    }
    const content = readFileSync(filePath, 'utf8');
    chapterSections.push(
      `### [${chapter.id}] ${chapter.title} (${book.title} — domain: ${chapter.domain})\n\n${content.trim()}`
    );
  }
}

if (chapterSections.length === 0) {
  console.error('ERROR: No chapter files found. Check vault/concept-graph-manifest.json and file paths.');
  process.exit(1);
}

// --- Build existing graph snippet (for incremental updates) ---
let existingGraphNote = '';
if (existingGraph) {
  const nodeCount = existingGraph.nodes?.length ?? 0;
  const edgeCount = existingGraph.edges?.length ?? 0;
  existingGraphNote = `
> **Note:** An existing concept graph is already tracked in \`vault/concept-graph.json\`
> (${nodeCount} nodes, ${edgeCount} edges). You may extend or refine it rather than
> rebuilding from scratch. Preserve existing node IDs where possible.
`;
}

const domainNote = domainFilter
  ? `\n> **Domain filter applied:** Only chapters from the "${domainFilter}" domain are included below. Merge your output with the existing graph.\n`
  : '';

// --- Assemble the prompt ---
const prompt = `## System

You are a nursing education expert and knowledge graph specialist. Your job is to analyze
nursing textbook chapter summaries and identify conceptual dependencies between topics —
meaning, which concepts must be understood before another concept can be properly learned.

## Instructions
${domainNote}${existingGraphNote}
Below are markdown chapter summaries from nursing textbooks. Analyze them and produce a
dependency graph in JSON format.

For each concept you identify:
- Give it a short, canonical **id** using snake_case (e.g., \`cardiac_output\`)
- Give it a human-readable **label** (e.g., "Cardiac Output")
- List which concepts it **directly depends on** (prerequisites) as graph edges
- Note which chapter id(s) it appears in (use the bracketed ids like \`pharm_ch1\`)
- Assign a **domain** (e.g., Cardiovascular, Renal, Pharmacology, Fundamentals)

**Output format** — return ONLY the JSON block, no prose:
\`\`\`json
{
  "nodes": [
    { "id": "cardiac_output", "label": "Cardiac Output", "domain": "Cardiovascular", "chapters": ["pharm_ch24"] },
    ...
  ],
  "edges": [
    { "from": "cardiac_output", "to": "heart_failure_drugs", "relationship": "prerequisite" },
    ...
  ]
}
\`\`\`

**Rules:**
1. Only draw an edge if the dependency is **genuine and meaningful** — not just because two
   topics appear in the same chapter.
2. Add \`"ambiguous": true\` to any edge where the dependency direction is uncertain.
3. Prioritize accuracy over completeness.
4. Preserve existing node ids where they already exist in the current graph.

## Chapter Summaries

${chapterSections.join('\n\n---\n\n')}
`;

// --- Output ---
if (outputFile) {
  writeFileSync(outputFile, prompt, 'utf8');
  console.log(`Prompt written to: ${outputFile}`);
  console.log(`Chapters included: ${chapterSections.length}`);
} else {
  process.stdout.write(prompt);
}
