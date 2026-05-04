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

const CATEGORY_COLORS = {
  M: '#01696f',
  K: '#5b4fcf',
  I: '#d19900',
};

const EDGE_COLORS = {
  affect: '#d17c7c',
  'co-presence': '#b8b8b8',
  constraint: '#c46a3a',
  enables: '#4d9a67',
  disrupts: '#c85656',
  mediates: '#7aa6c2',
  assembles: '#9a84d6',
  diffracts: '#d19900',
};

const DEFAULT_NODE_COLOR = '#666666';
const DEFAULT_EDGE_COLOR = '#cccccc';

function loadJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const ENCOUNTER_CENTERS = {
  'enc-2025-T1-W3-L2': { x: -130, y: -55 },
  'enc-2025-T1-W4-L1': { x: 130, y: -55 },
  'enc-2025-T1-W5-L3': { x: 0, y: 120 },
};

const CATEGORY_OFFSETS = {
  M: { x: -24, y: 10 },
  K: { x: 0, y: -18 },
  I: { x: 24, y: 10 },
};

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function primaryEncounter(node) {
  return Array.isArray(node.encounterRefs) && node.encounterRefs.length > 0
    ? node.encounterRefs[0]
    : '';
}

function clusterCenter(node) {
  const encounter = ENCOUNTER_CENTERS[primaryEncounter(node)] || { x: 0, y: 0 };
  const category = CATEGORY_OFFSETS[node.category] || { x: 0, y: 0 };
  return {
    x: encounter.x + category.x,
    y: encounter.y + category.y,
  };
}

function computeForceLayout(nodes, edges) {
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const positions = new Map();
  const velocities = new Map();

  sortedNodes.forEach((node) => {
    const center = clusterCenter(node);
    const hash = stableHash(node.id);
    const angle = ((hash % 360) * Math.PI) / 180;
    const radius = 14 + (hash % 29);

    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
    velocities.set(node.id, { x: 0, y: 0 });
  });

  const validEdges = edges.filter((edge) => positions.has(edge.source) && positions.has(edge.target));
  const iterations = 480;
  const repulsion = 1550;
  const springLength = 58;
  const springStrength = 0.028;
  const clusterStrength = 0.012;
  const categoryStrength = 0.006;
  const damping = 0.86;

  for (let step = 0; step < iterations; step++) {
    const temperature = 1 - step / iterations;

    for (let i = 0; i < sortedNodes.length; i++) {
      const a = sortedNodes[i];
      const posA = positions.get(a.id);
      const velA = velocities.get(a.id);

      for (let j = i + 1; j < sortedNodes.length; j++) {
        const b = sortedNodes[j];
        const posB = positions.get(b.id);
        const velB = velocities.get(b.id);
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distanceSq = Math.max(dx * dx + dy * dy, 25);
        const distance = Math.sqrt(distanceSq);
        const force = repulsion / distanceSq;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        velA.x += fx;
        velA.y += fy;
        velB.x -= fx;
        velB.y -= fy;
      }
    }

    for (const edge of validEdges) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      const sourceVelocity = velocities.get(edge.source);
      const targetVelocity = velocities.get(edge.target);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const strength = springStrength * (edge.weight ?? 0.5);
      const force = (distance - springLength) * strength;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      sourceVelocity.x += fx;
      sourceVelocity.y += fy;
      targetVelocity.x -= fx;
      targetVelocity.y -= fy;
    }

    for (const node of sortedNodes) {
      const position = positions.get(node.id);
      const velocity = velocities.get(node.id);
      const encounterCenter = ENCOUNTER_CENTERS[primaryEncounter(node)] || { x: 0, y: 0 };
      const center = clusterCenter(node);

      velocity.x += (encounterCenter.x - position.x) * clusterStrength;
      velocity.y += (encounterCenter.y - position.y) * clusterStrength;
      velocity.x += (center.x - position.x) * categoryStrength;
      velocity.y += (center.y - position.y) * categoryStrength;

      position.x += velocity.x * temperature;
      position.y += velocity.y * temperature;
      velocity.x *= damping;
      velocity.y *= damping;
    }
  }

  let maxAbs = 1;
  for (const position of positions.values()) {
    maxAbs = Math.max(maxAbs, Math.abs(position.x), Math.abs(position.y));
  }

  const scale = 150 / maxAbs;
  for (const [id, position] of positions) {
    positions.set(id, {
      x: Number((position.x * scale).toFixed(3)),
      y: Number((position.y * scale).toFixed(3)),
    });
  }

  return positions;
}

function main() {
  const nodes = loadJsonFiles(nodesDir);
  const edges = loadJsonFiles(edgesDir);

  const nodeIds = new Set(nodes.map((n) => n.id));
  const categories = { M: 0, K: 0, I: 0 };

  for (const node of nodes) {
    if (node.category in categories) {
      categories[node.category]++;
    }
  }

  const validEdges = [];
  const invalidEdges = [];

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      validEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight ?? 0.5,
        relationshipType: edge.relationshipType || 'co-presence',
        encounterRefs: edge.encounterRefs || [],
        notes: edge.notes || '',
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

  const degreeByNode = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of validEdges) {
    degreeByNode.set(edge.source, (degreeByNode.get(edge.source) || 0) + 1);
    degreeByNode.set(edge.target, (degreeByNode.get(edge.target) || 0) + 1);
  }

  const positions = computeForceLayout(nodes, validEdges);

  const exportedNodes = nodes
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => {
      const degree = degreeByNode.get(node.id) || 0;
      const position = positions.get(node.id) || { x: 0, y: 0 };

      return {
        id: node.id,
        label: node.label,
        category: node.category,
        subcategory: node.subcategory || '',
        description: node.description || '',
        tags: node.tags || [],
        encounterRefs: node.encounterRefs || [],
        x: position.x,
        y: position.y,
        size: Number((4 + Math.sqrt(degree) * 2).toFixed(2)),
        color: CATEGORY_COLORS[node.category] || DEFAULT_NODE_COLOR,
        ...(node.contentURL ? { contentURL: node.contentURL } : {}),
      };
    });

  const exportedEdges = validEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    weight: edge.weight,
    size: Number(clamp(1 + edge.weight * 2, 1, 4).toFixed(2)),
    color: EDGE_COLORS[edge.relationshipType] || DEFAULT_EDGE_COLOR,
    relationshipType: edge.relationshipType,
    encounterRefs: edge.encounterRefs,
    notes: edge.notes,
  }));

  const graphExport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: exportedNodes.length,
      edgeCount: exportedEdges.length,
      schemaVersion: 'v1',
      baseURL: '/tauira/',
      categories,
      sigmaReady: true,
      layout: 'force-directed',
      layoutHints: {
        clusteredBy: ['encounterRefs', 'category', 'edges'],
        deterministic: true,
      },
      visualEncodingVersion: 'v1',
    },
    nodes: exportedNodes,
    edges: exportedEdges,
  };

  fs.writeFileSync(outputPath, JSON.stringify(graphExport, null, 2) + '\n');
  console.log(`Graph exported: ${exportedNodes.length} nodes, ${exportedEdges.length} edges`);
  console.log(`Categories: M=${categories.M} K=${categories.K} I=${categories.I}`);
}

main();
