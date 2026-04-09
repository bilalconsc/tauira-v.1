#!/usr/bin/env node
/**
 * regenerate-graph.js
 *
 * Builds static/graph/tauira-graph.json from data/nodes/ and data/edges/.
 * Validates all edge references before writing.
 *
 * Usage: node scripts/regenerate-graph.js
 */

const fs = require('fs');
const path = require('path');

const nodesDir = path.resolve(__dirname, '../data/nodes');
const edgesDir = path.resolve(__dirname, '../data/edges');
const outputPath = path.resolve(__dirname, '../static/graph/tauira-graph.json');

function loadJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const results = [];
  let hasError = false;
  for (const f of files) {
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
    } catch (e) {
      console.error(`Error parsing ${f}:`, e.message);
      hasError = true;
    }
  }
  if (hasError) {
    console.error('Aborting: one or more JSON files could not be parsed.');
    process.exit(1);
  }
  return results;
}

function main() {
  const nodes = loadJsonFiles(nodesDir);
  const edges = loadJsonFiles(edgesDir);

  const nodeIds = new Set(nodes.map(n => n.id));
  const categories = { M: 0, K: 0, I: 0 };

  for (const node of nodes) {
    if (node.category in categories) {
      categories[node.category]++;
    }
  }

  // Validate edges
  const validEdges = [];
  const invalidEdges = [];
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      validEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight ?? 0.5,
        relationshipType: edge.relationshipType || 'co-presence'
      });
    } else {
      invalidEdges.push(edge);
    }
  }

  if (invalidEdges.length > 0) {
    console.warn(`Warning: ${invalidEdges.length} edge(s) have invalid source/target references:`);
    for (const e of invalidEdges) {
      console.warn(`  ${e.id}: ${e.source} -> ${e.target}`);
    }
  }

  const graphExport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: validEdges.length,
      schemaVersion: 'v1',
      baseURL: '/tauira/',
      categories
    },
    nodes: nodes.map(n => ({
      id: n.id,
      label: n.label,
      category: n.category,
      subcategory: n.subcategory || ''
    })),
    edges: validEdges
  };

  fs.writeFileSync(outputPath, JSON.stringify(graphExport, null, 2) + '\n');
  console.log(`Graph exported: ${nodes.length} nodes, ${validEdges.length} edges`);
  console.log(`Categories: M=${categories.M} K=${categories.K} I=${categories.I}`);
}

main();
