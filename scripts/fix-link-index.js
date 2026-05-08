#!/usr/bin/env node
/**
 * fix-link-index.js
 *
 * hugo-obsidian writes wikilink targets as bare slugs (e.g. /memo-001)
 * but sources as full subfolder paths (e.g. /memos/memo-001).
 *
 * This script builds an authoritative slug → fullPath map by walking the
 * actual content/ directory on disk — NOT from the index keys, which may
 * themselves contain bare slugs and cause the old resolve() to short-circuit.
 *
 * Every target in links[], index.links values, and index.backlinks values
 * is unconditionally rewritten to its full path.
 * Every key in index.backlinks is also rewritten.
 */

const fs   = require('fs');
const path = require('path');

const contentDir = path.resolve(__dirname, '../content');
const indexPath  = path.resolve(__dirname, '../assets/indices/linkIndex.json');

// ── 1. Build slug → fullPath from the content filesystem ────────────────────
// Walk every section subfolder, collect .md filenames (excluding _index.md),
// and map bare-slug → /section/slug.
// e.g. content/encounters/enc-2025-T1-W3-L2.md  →  /enc-2025-T1-W3-L2 → /encounters/enc-2025-T1-W3-L2

const slugToFull = new Map();

const entries = fs.readdirSync(contentDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const section = entry.name;                         // e.g. "encounters"
  const sectionDir = path.join(contentDir, section);
  const files = fs.readdirSync(sectionDir);
  for (const file of files) {
    if (!file.endsWith('.md') || file === '_index.md') continue;
    const slug     = '/' + path.basename(file, '.md');          // e.g. /enc-2025-T1-W3-L2
    const fullPath = '/' + section + slug;                      // e.g. /encounters/enc-2025-T1-W3-L2
    slugToFull.set(slug, fullPath);                             // map bare slug
    slugToFull.set(fullPath, fullPath);                         // idempotent: full path maps to itself
  }
}

console.log(`Built slug map with ${slugToFull.size} entries:`);
for (const [k, v] of slugToFull) console.log(`  ${k} → ${v}`);

// ── 2. Resolve a single path string ─────────────────────────────────────────
function resolve(p) {
  if (!p) return p;
  // Direct hit (full path already known)
  if (slugToFull.has(p)) return slugToFull.get(p);
  // Try with leading slash normalised
  const withSlash = p.startsWith('/') ? p : '/' + p;
  if (slugToFull.has(withSlash)) return slugToFull.get(withSlash);
  // Unknown — return as-is and warn
  console.warn(`  [WARN] Could not resolve: "${p}"`);
  return p;
}

function fixArray(arr) {
  return arr.map(link => ({
    ...link,
    source: resolve(link.source),
    target: resolve(link.target),
  }));
}

// ── 3. Patch the JSON ────────────────────────────────────────────────────────
const raw = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Fix top-level links[]
raw.links = fixArray(raw.links);

// Fix index.links — rewrite both keys and values
const fixedLinks = {};
for (const [key, arr] of Object.entries(raw.index.links)) {
  const resolvedKey = resolve(key);
  fixedLinks[resolvedKey] = fixArray(arr);
}
raw.index.links = fixedLinks;

// Fix index.backlinks — rewrite both keys and values
const fixedBacklinks = {};
for (const [key, arr] of Object.entries(raw.index.backlinks)) {
  const resolvedKey = resolve(key);
  fixedBacklinks[resolvedKey] = fixArray(arr);
}
raw.index.backlinks = fixedBacklinks;

fs.writeFileSync(indexPath, JSON.stringify(raw, null, 2));
console.log('linkIndex.json fully normalised — all bare slug targets resolved to full paths.');
