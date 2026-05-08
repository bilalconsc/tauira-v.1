import Graph from "graphology";
import Sigma from "sigma";

const DEFAULT_NODE_COLOR = "#666666";
const DEFAULT_EDGE_COLOR = "#cccccc";

const FILTER_IDS = {
  category: "tauira-filter-category",
  relationship: "tauira-filter-relationship",
  reset: "tauira-filter-reset",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) return "-";
  return items.map((item) => escapeHtml(item)).join(", ");
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeNode(node) {
  return {
    id: node.id,
    label: node.label || node.id,
    x: isFiniteNumber(node.x) ? node.x : 0,
    y: isFiniteNumber(node.y) ? node.y : 0,
    size: isFiniteNumber(node.size) ? node.size : 4,
    color: node.color || DEFAULT_NODE_COLOR,
    category: node.category || "",
    subcategory: node.subcategory || "",
    description: node.description || "",
    tags: Array.isArray(node.tags) ? node.tags : [],
    encounterRefs: Array.isArray(node.encounterRefs) ? node.encounterRefs : [],
    contentURL: node.contentURL || "",
  };
}

function normalizeEdge(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    size: isFiniteNumber(edge.size) ? edge.size : 1,
    color: edge.color || DEFAULT_EDGE_COLOR,
    weight: isFiniteNumber(edge.weight) ? edge.weight : 0.5,
    relationshipType: edge.relationshipType || "co-presence",
    encounterRefs: Array.isArray(edge.encounterRefs) ? edge.encounterRefs : [],
    notes: edge.notes || "",
  };
}

function buildGraph(data) {
  const graph = new Graph();

  for (const rawNode of data.nodes || []) {
    if (!rawNode || !rawNode.id || graph.hasNode(rawNode.id)) continue;
    const node = normalizeNode(rawNode);
    graph.addNode(node.id, node);
  }

  for (const rawEdge of data.edges || []) {
    if (!rawEdge || !rawEdge.id || graph.hasEdge(rawEdge.id)) continue;
    if (!graph.hasNode(rawEdge.source) || !graph.hasNode(rawEdge.target)) continue;

    const edge = normalizeEdge(rawEdge);
    graph.addEdgeWithKey(edge.id, edge.source, edge.target, edge);
  }

  return graph;
}

function enableFullscreen(container, renderer) {
  const btn = document.getElementById("btn-fullscreen");

  if (!btn) {
    console.log("❌ Fullscreen button not found");
    return;
  }

  console.log("✅ Fullscreen button wired");

  btn.addEventListener("click", () => {
    console.log("🔥 Fullscreen clicked");

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    setTimeout(() => renderer.refresh(), 100);
  });
}

function updateDetails(panel, kind, id, attrs) {
  if (!panel) return;

  if (!attrs) {
    panel.innerHTML = "<p>Select a node or edge to inspect it.</p>";
    return;
  }

  if (kind === "node") {
    panel.innerHTML = `
      <h3>${escapeHtml(attrs.label || id)}</h3>
      <p><strong>ID:</strong> ${escapeHtml(id)}</p>
      <p><strong>Category:</strong> ${escapeHtml(attrs.category || "-")}</p>
      <p><strong>Subcategory:</strong> ${escapeHtml(attrs.subcategory || "-")}</p>
      <p><strong>Degree:</strong> ${escapeHtml(attrs.degree ?? "-")}</p>
      <p><strong>Neighbors:</strong> ${formatList(attrs.neighbors)}</p>
      <p><strong>Description:</strong> ${escapeHtml(attrs.description || "-")}</p>
      <p><strong>Tags:</strong> ${formatList(attrs.tags)}</p>
      <p><strong>Encounters:</strong> ${formatList(attrs.encounterRefs)}</p>
      ${
        attrs.contentURL
          ? `<p><a href="${escapeHtml(attrs.contentURL)}">Open related content</a></p>`
          : ""
      }
    `;
    return;
  }

  if (kind === "edge") {
    panel.innerHTML = `
      <h3>${escapeHtml(id)}</h3>
      <p><strong>Source:</strong> ${escapeHtml(attrs.source || "-")}</p>
      <p><strong>Target:</strong> ${escapeHtml(attrs.target || "-")}</p>
      <p><strong>Relationship:</strong> ${escapeHtml(attrs.relationshipType || "-")}</p>
      <p><strong>Weight:</strong> ${escapeHtml(attrs.weight ?? "-")}</p>
      <p><strong>Notes:</strong> ${escapeHtml(attrs.notes || "-")}</p>
      <p><strong>Encounters:</strong> ${formatList(attrs.encounterRefs)}</p>
    `;
    return;
  }

  panel.innerHTML = "<p>Select a node or edge to inspect it.</p>";
}

function nodeMatchesCategory(attrs, category) {
  return !category || attrs.category === category;
}

function edgeMatchesRelationship(attrs, relationshipType) {
  return !relationshipType || attrs.relationshipType === relationshipType;
}

function isNodeVisible(graph, node, state) {
  const attrs = graph.getNodeAttributes(node);

  if (!nodeMatchesCategory(attrs, state.category)) return false;
  if (!state.relationshipType) return true;

  return graph.edges(node).some((edge) => {
    const edgeAttrs = graph.getEdgeAttributes(edge);
    return edgeMatchesRelationship(edgeAttrs, state.relationshipType);
  });
}

function isEdgeVisible(graph, edge, state) {
  const attrs = graph.getEdgeAttributes(edge);
  if (!edgeMatchesRelationship(attrs, state.relationshipType)) return false;

  const [source, target] = graph.extremities(edge);
  return isNodeVisible(graph, source, state) && isNodeVisible(graph, target, state);
}

function bindFilterControls(renderer, detailsPanel, state) {
  const categorySelect = document.getElementById(FILTER_IDS.category);
  const relationshipSelect = document.getElementById(FILTER_IDS.relationship);
  const resetButton = document.getElementById(FILTER_IDS.reset);

  if (categorySelect) {
    categorySelect.addEventListener("change", (event) => {
      state.category = event.target.value;
      state.selectedNode = null;
      state.selectedEdge = null;
      updateDetails(detailsPanel, null, null, null);
      renderer.refresh();
    });
  }

  if (relationshipSelect) {
    relationshipSelect.addEventListener("change", (event) => {
      state.relationshipType = event.target.value;
      state.selectedNode = null;
      state.selectedEdge = null;
      updateDetails(detailsPanel, null, null, null);
      renderer.refresh();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      state.category = "";
      state.relationshipType = "";
      state.selectedNode = null;
      state.selectedEdge = null;
      state.hoveredNode = null;

      if (categorySelect) categorySelect.value = "";
      if (relationshipSelect) relationshipSelect.value = "";

      updateDetails(detailsPanel, null, null, null);
      renderer.refresh();
    });
  }
}

function attachInteractions(renderer, graph, detailsPanel) {
  const state = {
    category: "",
    relationshipType: "",
    selectedNode: null,
    selectedEdge: null,
    hoveredNode: null,
  };

  renderer.on("enterNode", ({ node }) => {
    state.hoveredNode = node;
    renderer.refresh();
  });

  renderer.on("leaveNode", () => {
    state.hoveredNode = null;
    renderer.refresh();
  });

  renderer.on("clickNode", ({ node }) => {
    state.selectedNode = node;
    state.selectedEdge = null;

    const attrs = graph.getNodeAttributes(node);
    updateDetails(detailsPanel, "node", node, {
      ...attrs,
      degree: graph.degree(node),
      neighbors: graph.neighbors(node),
    });

    renderer.refresh();
  });

  renderer.on("clickEdge", ({ edge }) => {
    state.selectedNode = null;
    state.selectedEdge = edge;

    const attrs = graph.getEdgeAttributes(edge);
    const [source, target] = graph.extremities(edge);

    updateDetails(detailsPanel, "edge", edge, {
      ...attrs,
      source,
      target,
    });

    renderer.refresh();
  });

  renderer.on("clickStage", () => {
    state.selectedNode = null;
    state.selectedEdge = null;
    updateDetails(detailsPanel, null, null, null);
    renderer.refresh();
  });

  renderer.setSetting("nodeReducer", (node, data) => {
    if (!isNodeVisible(graph, node, state)) {
      return { ...data, hidden: true };
    }

    const focusNode = state.hoveredNode || state.selectedNode;
    if (!focusNode) return data;

    const neighbors = new Set(graph.neighbors(focusNode));
    if (node === focusNode || neighbors.has(node)) {
      return data;
    }

    return {
      ...data,
      color: "#e0e0e0",
      label: "",
    };
  });

  renderer.setSetting("edgeReducer", (edge, data) => {
    if (!isEdgeVisible(graph, edge, state)) {
      return { ...data, hidden: true };
    }

    const [source, target] = graph.extremities(edge);

    if (state.selectedEdge && edge === state.selectedEdge) {
      return {
        ...data,
        color: "#444444",
        size: (data.size || 1) + 1.5,
      };
    }

    const focusNode = state.hoveredNode || state.selectedNode;
    if (!focusNode) return data;

    if (source === focusNode || target === focusNode) {
      return {
        ...data,
        color: "#7a7a7a",
        size: (data.size || 1) + 1,
      };
    }

    return {
      ...data,
      color: "#efefef",
    };
  });

  bindFilterControls(renderer, detailsPanel, state);
}

// ─── HOISTED: declared before initTauiraSigma so it is never called before
//     its definition. Fixes the ReferenceError-in-waiting and eliminates the
//     duplicate-edge Graphology crash caused by the previous double-call. ────
function addCrossEncounterEdges(graph) {
  const nodes = graph.nodes();

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      const aAttrs = graph.getNodeAttributes(a);
      const bAttrs = graph.getNodeAttributes(b);

      const aEnc = new Set(aAttrs.encounterRefs || []);
      const bEnc = new Set(bAttrs.encounterRefs || []);

      // Nodes that already share an encounter get a direct edge from buildGraph;
      // bridge only nodes that share NO encounter and have no edge yet.
      const shared = [...aEnc].some((e) => bEnc.has(e));

      if (!shared && !graph.hasEdge(a, b) && Math.random() < 0.15) {
        const edgeId = `bridge-${a}-${b}`;

        // Idempotency guard — never add the same key twice.
        if (graph.hasEdge(edgeId)) continue;

        graph.addEdgeWithKey(edgeId, a, b, {
          size: 0.5,
          weight: 0.15,
          color: "#eeeeee",
          relationshipType: "cross-encounter",
          encounterRefs: [],
          isSynthetic: true,
        });
      }
    }
  }
}

function normalizeEdgeWeights(graph) {
  graph.forEachEdge((edge, attrs) => {
    const w = attrs.weight || 0.5;
    // Compress range so strong edges don't dominate as much.
    const normalized = 0.3 + w * 0.5;
    graph.setEdgeAttribute(edge, "weight", normalized);
    graph.setEdgeAttribute(edge, "size", normalized * 2);
  });
}

async function initTauiraSigma(container, dataPath, detailsSelector = "#tauira-graph-details") {
  if (!container) return;

  const detailsPanel = document.querySelector(detailsSelector);

  try {
    const response = await fetch(dataPath);
    if (!response.ok) {
      throw new Error(`Failed to load graph data: ${response.status}`);
    }

    const data = await response.json();

    if (data.metadata && data.metadata.sigmaReady === false) {
      throw new Error("Graph JSON is not marked as Sigma-ready.");
    }

    const graph = buildGraph(data);

    // Correct order: normalise weights first, then stitch cross-encounter
    // bridge edges ONCE. Previously addCrossEncounterEdges was called twice
    // (before and after normalizeEdgeWeights, with its declaration sandwiched
    // between them), causing Graphology to throw on duplicate edge keys.
    normalizeEdgeWeights(graph);
    addCrossEncounterEdges(graph);

    if (graph.order === 0) {
      container.textContent = "No graph data available yet.";
      updateDetails(detailsPanel, null, null, null);
      return;
    }

    container.innerHTML = "";

    const renderer = new Sigma(graph, container, {
      allowInvalidContainer: false,
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 10,
      defaultEdgeType: "line",
      defaultNodeType: "circle",
      minCameraRatio: 0.2,
      maxCameraRatio: 8,
    });

    requestAnimationFrame(() => {
      enableFullscreen(container, renderer);
    });

    attachInteractions(renderer, graph, detailsPanel);
    updateDetails(detailsPanel, null, null, null);

    window.tauiraSigma = { graph, renderer };
  } catch (error) {
    container.textContent = `Could not load graph: ${error.message}`;
    updateDetails(detailsPanel, null, null, null);
  }
}
