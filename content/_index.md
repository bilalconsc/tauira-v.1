---
title: "📓 Tauira"
enableToc: false
---

## Tauira — Autoethnographic Knowledge Graph

**Tauira** maps the entanglements of a collaborative classroom as a living rhizomatic network. Each node is a participant — Material, Knowledge, or Instinctual — and each edge records a relational force between them across encounters.

**Legend:**
- 🟢 **Material (M)** — physical objects, spaces, technologies
- 🟣 **Knowledge (K)** — concepts, curricula, skills
- 🟡 **Instinctual (I)** — affects, habits, embodied responses

<div id="tauira-controls" aria-label="Graph controls">

  <!-- Category filter -->
  <div class="ctrl-group" aria-label="Filter by category">
    <button class="ctrl-chip ctrl-chip--active" data-filter-cat="M">M Material</button>
    <button class="ctrl-chip ctrl-chip--active" data-filter-cat="K">K Knowledge</button>
    <button class="ctrl-chip ctrl-chip--active" data-filter-cat="I">I Instinctual</button>
  </div>

  <!-- Relationship type filter (populated dynamically) -->
  <div class="ctrl-group" id="rel-filters" aria-label="Filter by relationship"></div>

  <!-- Community selector (populated after Louvain runs) -->
  <div class="ctrl-group" id="community-filters" aria-label="Filter by community"></div>

  <!-- Search -->
  <div class="ctrl-group">
    <input id="graph-search" type="search" placeholder="Search nodes…"
           aria-label="Search graph nodes" autocomplete="off" />
  </div>

  <!-- Actions -->
  <div class="ctrl-group ctrl-group--actions">
    <button id="btn-reset"      class="ctrl-btn" aria-label="Reset filters">Reset</button>
    <button id="btn-fullscreen" class="ctrl-btn" aria-label="Fullscreen graph">⛶ Fullscreen</button>
  </div>

</div>

<div id="tauira-graph" style="width:100%;height:560px;border-radius:8px;"></div>

> Explore encounters in the sidebar, or open the [Rhizomatic Map]({{< relref "/map" >}}) to navigate by term.
