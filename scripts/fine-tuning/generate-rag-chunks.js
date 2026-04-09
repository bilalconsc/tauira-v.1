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

const encountersDir = path.resolve(__dirname, '../../content/encounters');
const outputPath = path.resolve(__dirname, 'rag-chunks.jsonl');
const BASE_URL = '/tauira/';

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { rawYaml: '', body: '' };
  const body = content.slice(match[0].length).trim();
  return { rawYaml: match[1], body };
}

function extractYamlList(yaml, key) {
  const regex = new RegExp(`${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)*)`, 'm');
  const match = yaml.match(regex);
  if (!match) return [];
  return match[1].match(/-\s+(.+)/g)?.map(l => l.replace(/^-\s+/, '').replace(/["']/g, '').trim()) || [];
}

function extractYamlValue(yaml, key) {
  const regex = new RegExp(`^\\s*${key}:\\s*"?(.+?)"?\\s*$`, 'm');
  const match = yaml.match(regex);
  return match ? match[1].trim() : '';
}

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
    const { rawYaml, body } = parseFrontMatter(raw);

    const encounterId = extractYamlValue(rawYaml, 'id') || path.basename(file, '.md');
    const date = extractYamlValue(rawYaml, 'date');
    const nodeRefs = extractYamlList(rawYaml, 'nodeRefs');
    const assemblages = extractYamlList(rawYaml, 'assemblages');

    // Chunk the fieldnote parts
    const fieldnoteParts = ['scene', 'agency', 'care', 'vignette'];
    for (const part of fieldnoteParts) {
      const text = extractYamlValue(rawYaml, part);
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
