#!/usr/bin/env node
/**
 * generate-training-data.js
 *
 * Generates GPT fine-tuning prompt-completion pairs from encounters + memos.
 * Output: scripts/fine-tuning/training-data.jsonl
 *
 * Usage: node scripts/fine-tuning/generate-training-data.js
 *
 * Reads:
 *   - content/encounters/*.md  (front matter: fieldnote, rqAlignment)
 *   - content/memos/*.md       (body text = memo completion)
 *
 * Format per line:
 *   {"prompt":"Scene: ...\nAgency: ...\nCare: ...\nVignette: ...\n\nWrite an analytic memo addressing RQ1a:","completion":"..."}
 */

const fs = require('fs');
const path = require('path');

const encountersDir = path.resolve(__dirname, '../../content/encounters');
const memosDir = path.resolve(__dirname, '../../content/memos');
const outputPath = path.resolve(__dirname, 'training-data.jsonl');

/**
 * Minimal YAML front-matter parser (extracts between --- delimiters).
 * For production use, consider a library like gray-matter.
 */
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { rawYaml: '', body: '' };
  const body = content.slice(match[0].length).trim();
  return { rawYaml: match[1], body };
}

function main() {
  const encounterFiles = fs.readdirSync(encountersDir)
    .filter(f => f.endsWith('.md') && f !== '_index.md');

  const memoFiles = fs.readdirSync(memosDir)
    .filter(f => f.endsWith('.md') && f !== '_index.md');

  if (encounterFiles.length === 0) {
    console.log('No encounter files found. Writing empty training-data.jsonl.');
    fs.writeFileSync(outputPath, '');
    console.log(`Pairs: 0\nAvg completion length: 0\nMemos under 100 words: 0`);
    return;
  }

  // Build memo lookup by filename slug
  const memoIndex = {};
  for (const file of memoFiles) {
    const raw = fs.readFileSync(path.join(memosDir, file), 'utf-8');
    const { body } = parseFrontMatter(raw);
    const slug = path.basename(file, '.md');
    memoIndex[slug] = body;
  }

  const pairs = [];
  let totalLen = 0;
  let shortMemos = 0;

  for (const file of encounterFiles) {
    const raw = fs.readFileSync(path.join(encountersDir, file), 'utf-8');
    const { rawYaml, body } = parseFrontMatter(raw);

    // Extract fieldnote parts (simplified regex extraction)
    const sceneMatch = rawYaml.match(/scene:\s*"?(.+?)"?\s*$/m);
    const agencyMatch = rawYaml.match(/agency:\s*"?(.+?)"?\s*$/m);
    const careMatch = rawYaml.match(/care:\s*"?(.+?)"?\s*$/m);
    const vignetteMatch = rawYaml.match(/vignette:\s*"?(.+?)"?\s*$/m);
    const memoRefMatch = rawYaml.match(/memoRef:\s*"?(.+?)"?\s*$/m);

    if (!sceneMatch || !memoRefMatch) continue;

    const scene = sceneMatch[1].trim();
    const agency = agencyMatch ? agencyMatch[1].trim() : '';
    const care = careMatch ? careMatch[1].trim() : '';
    const vignette = vignetteMatch ? vignetteMatch[1].trim() : '';
    const memoRef = memoRefMatch[1].trim();

    const completion = memoIndex[memoRef] || body || '';
    if (!completion) continue;

    const wordCount = completion.split(/\s+/).length;
    if (wordCount < 100) shortMemos++;
    totalLen += completion.length;

    // Determine RQ focus
    const rqFocus = rawYaml.includes('RQ1a') ? 'RQ1a' :
                    rawYaml.includes('RQ1b') ? 'RQ1b' : 'RQ1';

    const prompt = `Scene: ${scene}\nAgency: ${agency}\nCare: ${care}\nVignette: ${vignette}\n\nWrite an analytic memo addressing ${rqFocus}:`;

    pairs.push(JSON.stringify({ prompt, completion }));
  }

  fs.writeFileSync(outputPath, pairs.join('\n') + (pairs.length ? '\n' : ''));
  console.log(`Pairs: ${pairs.length}`);
  console.log(`Avg completion length: ${pairs.length ? Math.round(totalLen / pairs.length) : 0} chars`);
  console.log(`Memos under 100 words: ${shortMemos}`);
}

main();
