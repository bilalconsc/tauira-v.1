/**
 * Tauira Rhizomatic Map Renderer
 * Renders the knowledge graph in-browser using Canvas.
 * Fetches graph data from the specified path and draws nodes + edges.
 */

/* eslint-env browser */

// MKI category colours
var CATEGORY_COLORS = {
  M: '#01696f', // Material — teal
  K: '#5b4fcf', // Knowledge — indigo
  I: '#d19900'  // Instinctual — amber
};

/**
 * Initialise the Tauira graph renderer.
 * @param {HTMLElement} container - DOM element to render into.
 * @param {string} dataPath - URL path to tauira-graph.json.
 */
function initTauiraGraph(container, dataPath) {
  if (!container) return;

  fetch(dataPath)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load graph data: ' + res.status);
      return res.json();
    })
    .then(function (graph) {
      renderGraph(container, graph);
    })
    .catch(function (err) {
      container.textContent = 'Could not load graph: ' + err.message;
    });
}

/**
 * Render graph data onto a canvas inside the container.
 * Uses a simple force-directed–style random layout.
 */
function renderGraph(container, graph) {
  var nodes = graph.nodes || [];
  var edges = graph.edges || [];

  if (nodes.length === 0) {
    container.textContent = 'No graph data available yet.';
    return;
  }

  var canvas = document.createElement('canvas');
  canvas.width = container.clientWidth || 800;
  canvas.height = container.clientHeight || 400;
  container.innerHTML = '';
  container.appendChild(canvas);

  var ctx = canvas.getContext('2d');

  // Assign positions using a simple circular layout
  var positions = {};
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  var radius = Math.min(cx, cy) - 40;

  nodes.forEach(function (node, i) {
    var angle = (2 * Math.PI * i) / nodes.length;
    positions[node.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  });

  // Draw edges
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  edges.forEach(function (edge) {
    var src = positions[edge.source];
    var tgt = positions[edge.target];
    if (src && tgt) {
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.globalAlpha = edge.weight || 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  // Draw nodes
  var nodeRadius = 8;
  nodes.forEach(function (node) {
    var pos = positions[node.id];
    if (!pos) return;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = CATEGORY_COLORS[node.category] || '#666';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.label || node.id, pos.x, pos.y - nodeRadius - 4);
  });
}
