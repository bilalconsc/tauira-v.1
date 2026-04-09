#!/usr/bin/env node
/**
 * generate-rag-chunks.js
 *
 * Generates embedding-ready JSONL chunks from encounter content.
 * Output: scripts/fine-tuning/rag-chunks.jsonl
 *
 * Usage: node scripts/fine-tuning/generate-rag-chunks.js
 *
 * Each chunk includes:
 *   encounterId, chunkType, nodeRefs, assemblages, date, baseURL, text
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const encountersDir = path.resolve(__dirname, '../../content/encounters');
const outputPath = path.resolve(__dirname, 'rag-chunks.jsonl');
const BASE_URL = '/tauira/';

function main() {
  const files = fs.readdirSync(encountersDir)
    .filter(f => f.endsWith('.md') && f !== '_index.md');

  if (files.length === 0) {
    console.log('No encounter files found. Writing empty rag-chunks.jsonl.');
    fs.writeFileSync(outputPath, '');
    return;
  }

  const chunks = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(encountersDir, file), 'utf-8');
    const { data, content } = matter(raw);

    const encounterId = data.id || path.basename(file, '.md');
    const date = data.date || '';
    const nodeRefs = data.nodeRefs || [];
    const assemblages = data.assemblages || [];
    const fieldnote = data.fieldnote || {};

    // Chunk the fieldnote parts
    const fieldnoteParts = ['scene', 'agency', 'care', 'vignette'];
    for (const part of fieldnoteParts) {
      const text = fieldnote[part];
      if (text) {
        chunks.push(JSON.stringify({
          encounterId,
          chunkType: `fieldnote.${part}`,
          nodeRefs,
          assemblages,
          date,
          baseURL: BASE_URL,
          text
        }));
      }
    }

    // Chunk the body text (if any)
    const body = content.trim();
    if (body) {
      chunks.push(JSON.stringify({
        encounterId,
        chunkType: 'body',
        nodeRefs,
        assemblages,
        date,
        baseURL: BASE_URL,
        text: body
      }));
    }
  }

  fs.writeFileSync(outputPath, chunks.join('\n') + (chunks.length ? '\n' : ''));
  console.log(`Generated ${chunks.length} chunks from ${files.length} encounters.`);
}

main();
