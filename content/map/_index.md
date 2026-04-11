---
title: "Rhizomatic Map"
type: docs
weight: 1
bookToC: false
bookSearchExclude: true
---

This is the Tauira rhizomatic map — a force-directed visualisation of the knowledge graph built from classroom encounters, participant nodes, and relational edges.

**Legend:**
- 🟢 **Material (M)** — physical objects, spaces, technologies
- 🟣 **Knowledge (K)** — concepts, curricula, skills
- 🟡 **Instinctual (I)** — affects, habits, embodied responses

<div id="tauira-graph" style="width:100%;height:560px;border-radius:8px;"></div>
<button id="btn-fullscreen" class="ctrl-btn" aria-label="Fullscreen graph"
        style="margin-top:.5rem">⛶ Fullscreen</button>

> **Note:** This map visualises the Tauira schema-based rhizomatic graph (`static/graph/tauira-graph.json`), which is distinct from the Amethyst wikilink graph displayed in footers. The rhizomatic graph is built from `data/nodes/` and `data/edges/` and represents the autoethnographic knowledge network.
