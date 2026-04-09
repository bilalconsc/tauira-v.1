/**
 * Tauira Rhizome Chat Endpoint
 * Performs retrieval-augmented generation using the knowledge graph.
 *
 * POST body: { "query": "string" }
 * Response: { "query": "", "response": "", "referencedNodes": [], "referencedEncounters": [] }
 */

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Load graph data from the published static file.
 */
function loadGraph() {
  const graphPath = path.join(__dirname, '..', 'static', 'graph', 'tauira-graph.json');
  try {
    const raw = fs.readFileSync(graphPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { nodes: [], edges: [] };
  }
}

/**
 * Retrieve relevant nodes and encounters based on keyword matching.
 */
function retrieveContext(graph, query) {
  const terms = query.toLowerCase().split(/\s+/);
  const matchedNodes = [];
  const matchedEncounters = new Set();

  for (const node of graph.nodes || []) {
    const text = [node.label, node.category, node.subcategory || ''].join(' ').toLowerCase();
    if (terms.some(function (t) { return text.includes(t); })) {
      matchedNodes.push(node);
    }
  }

  return {
    nodes: matchedNodes.slice(0, 10),
    encounters: Array.from(matchedEncounters).slice(0, 5)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const query = body.query;
  if (!query || typeof query !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid "query" field' }) };
  }

  const graph = loadGraph();
  const context = retrieveContext(graph, query);

  const contextSummary = context.nodes.map(function (n) {
    return n.label + ' (' + n.category + ')';
  }).join(', ');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: [
            'You are a research assistant for Tauira, an autoethnographic knowledge graph.',
            'You have access to participant nodes categorised as Material (M), Knowledge (K), or Instinctual (I).',
            'Ground your answers in the provided graph data. Do not invent node or encounter IDs.',
            '',
            'Available nodes: ' + contextSummary
          ].join('\n')
        },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        response: response,
        referencedNodes: context.nodes.map(function (n) { return n.id; }),
        referencedEncounters: context.encounters
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API error: ' + err.message })
    };
  }
};
