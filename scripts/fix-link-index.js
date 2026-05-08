#!/usr/bin/env node
/**
 * fix-link-index.js
 *
 * hugo-obsidian writes wikilink targets as bare slugs (e.g. /memo-001)
 * but writes sources as full subfolder paths (e.g. /memos/memo-001).
 * This mismatch means graph.js BFS lookups in index.links always miss.
 *
 * This script:
 * 1. Builds a map of slug → full path from all index.links source keys
 * 2. Rewrites every target in links[], index.links, and index.backlinks
 *    to use the full path if a match is found
 * 3. Rewrites every key in index.backlinks similarly
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../assets/indices/linkIndex.json');

const raw = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Build slug → fullPath from all keys in index.links
// e.g. "/encounters/enc-2025-T1-W3-L2" → slug is "enc-2025-T1-W3-L2"
const slugToFull = new Map();
for (const fullPath of Object.keys(raw.index.links)) {
  const slug = '/' + fullPath.split('/').pop();
  slugToFull.set(slug, fullPath);
  // Also map the bare slug without leading slash, just in case
  slugToFull.set(fullPath.split('/').pop(), fullPath);
}

function resolve(target) {
  // If a full path already exists in index.links, keep it
  if (raw.index.links[target] !== undefined) return target;
  // Otherwise try to resolve via slug map
  return slugToFull.get(target) || slugToFull.get('/' + target.replace(/^\//, '')) || target;
}

function fixLinkArray(arr) {
  return arr.map(link => ({
    ...link,
    source: resolve(link.source),
    target: resolve(link.target),
  }));
}

// Fix top-level links array
raw.links = fixLinkArray(raw.links);

// Fix index.links values
for (const [key, arr] of Object.entries(raw.index.links)) {
  raw.index.links[key] = fixLinkArray(arr);
}

// Fix index.backlinks — both keys and values
const fixedBacklinks = {};
for (const [key, arr] of Object.entries(raw.index.backlinks)) {
  const resolvedKey = resolve(key);
  fixedBacklinks[resolvedKey] = fixLinkArray(arr);
}
raw.index.backlinks = fixedBacklinks;

fs.writeFileSync(indexPath, JSON.stringify(raw, null, 2));
console.log('linkIndex.json normalised: bare slug targets resolved to full paths');
