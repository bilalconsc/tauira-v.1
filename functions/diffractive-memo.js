/**
 * Tauira Diffractive Memo Endpoint
 * Generates gap suggestions and diffractive framings using GPT.
 *
 * POST body: { "fieldnote": { "scene": "", "agency": "", "care": "", "vignette": "" }, "body": "" }
 * Response: { "gapSuggestions": [], "diffractiveFocus": [] }
 */

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = [
  'You are a diffractive reading assistant for an autoethnographic educator-researcher.',
  'You have been given a four-part fieldnote (scene, agency, care, vignette) and an analytic memo.',
  'You also have a knowledge graph of participant nodes (Material, Knowledge, Instinctual) and their co-occurrence edges.',
  '',
  'Your tasks:',
  '1. Identify 2–3 structural gaps: concepts or node-clusters that are conspicuously absent from this memo but appear frequently elsewhere in the graph.',
  '2. Suggest 2–3 alternative diffractive framings: "What if you foregrounded [X] as the apparatus here?"',
  '3. Ask one bridging question that connects this encounter to an under-explored area of the graph.',
  '',
  'Return your response as a JSON object with keys: "gapSuggestions" (array of strings) and "diffractiveFocus" (array of strings).',
  'Do not invent new node IDs. Reference only the node labels provided in the context.'
].join('\n');

/**
 * Load graph data.
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

  const fieldnote = body.fieldnote;
  const memoBody = body.body;

  if (!fieldnote || !fieldnote.scene || !fieldnote.agency || !fieldnote.care || !fieldnote.vignette) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or incomplete "fieldnote" object' }) };
  }

  if (!memoBody || typeof memoBody !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid "body" field' }) };
  }

  const graph = loadGraph();

  const nodeLabels = (graph.nodes || []).map(function (n) {
    return n.label + ' (' + n.category + ')';
  }).join(', ');

  const userMessage = [
    '## Fieldnote',
    '**Scene:** ' + fieldnote.scene,
    '**Agency:** ' + fieldnote.agency,
    '**Care:** ' + fieldnote.care,
    '**Vignette:** ' + fieldnote.vignette,
    '',
    '## Analytic Memo',
    memoBody,
    '',
    '## Available Graph Nodes',
    nodeLabels || '(no nodes yet)'
  ].join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices[0].message.content;
    let result;
    try {
      result = JSON.parse(raw);
    } catch (parseErr) {
      result = { gapSuggestions: [raw], diffractiveFocus: [] };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gapSuggestions: result.gapSuggestions || [],
        diffractiveFocus: result.diffractiveFocus || []
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API error: ' + err.message })
    };
  }
};
