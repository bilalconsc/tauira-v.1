# Tauira — GitHub Copilot Agent Prompt

## Project Identity

You are working on **Tauira**, a Hugo-based static website and knowledge graph for an autoethnographic educator-researcher project. The site captures classroom entanglements as a rhizomatic text network using nodes, edges, encounters, memos, essays, artefacts, and GPT-assisted diffractive memos.

The governing JSON schema is at `tauira-schema.json` in the repo root. Every piece of content, data file, and template you generate **must validate against this schema**. When in doubt, read the schema before writing any file.

## Repository Layout (Canonical — Do Not Deviate)

```
tauira/
├── .github/
│   ├── copilot-instructions.md     ← this file
│   └── prompts/                    ← reusable prompt files
├── hugo.yaml                       ← Hugo site config
├── tauira-schema.json              ← master JSON schema (source of truth)
├── content/
│   ├── encounters/                 ← one .md per encounter
│   ├── memos/                      ← one .md per analytic memo
│   ├── essays/                     ← one .md per autoethnographic essay
│   └── artefacts/                  ← one .md per artefact
├── data/
│   ├── nodes/                      ← one .json per participant node
│   ├── edges/                      ← one .json per relational edge
│   ├── maps/                       ← one .json per rhizomatic map snapshot
│   └── tours/                      ← one .json per RQ-guided tour
├── static/
│   └── graph/                      ← tauira-graph.json (full graph export)
├── assets/
│   └── js/
│       ├── rhizome.js              ← in-browser graph renderer
│       └── chat.js                 ← rhizome chat widget
├── layouts/
│   ├── encounters/single.html
│   ├── memos/single.html
│   ├── essays/single.html
│   ├── artefacts/single.html
│   ├── index.json.json             ← JSON output template (graph export)
│   └── partials/
│       ├── node-badge.html
│       ├── graph-embed.html
│       └── rq-alignment.html
└── functions/                      ← serverless functions (Netlify Functions / Node.js)
    ├── chat.js                     ← rhizome chat endpoint (RAG + OpenAI)
    └── diffractive-memo.js         ← GPT gap-suggestion endpoint
```

## Domain Vocabulary

| Term | Meaning |
|---|---|
| **Encounter** | A single classroom lesson event; the primary unit of data |
| **Node** | A named participant categorised as M (Material), K (Knowledge), or I (Instinctual) |
| **Edge** | A relationship between two nodes that co-appear in an encounter |
| **Fieldnote** | Four-part embedded sub-object: scene · agency · care · vignette |
| **Assemblage** | A named cluster of nodes that recurs across encounters |
| **Diffractive reading** | Re-reading an encounter through an alternative theoretical framing |
| **RQ alignment** | Mapping of an encounter or essay to RQ1, RQ1a, RQ1b |
| **Rhizomatic map** | In-browser graph visualisation of nodes + edges for a given filter state |
| **RQ-guided tour** | GPT-generated reading path anchored to a research question |
| **Gap suggestion** | InfraNodus-style structural gap in the text network, surfaced by GPT |
| **MKI** | The three node categories: Material, Knowledge, Instinctual |

## Coding Rules

### Hugo Content Files

1. Every content file lives under its correct `content/<section>/` directory.
2. Front matter is **YAML**, delimited by `---`.
3. Schema fields map to front matter under the `params:` key (Hugo v0.123+ style).
4. Required fields from the schema (`id`, `date`, `nodeRefs`, `rqAlignment`, `fieldnote`) **must always be present**.
5. The `id` field in `params` must match the filename slug.
6. Body text (Markdown prose) goes below the closing `---`.
7. Do not invent node IDs in `nodeRefs` — only reference IDs that exist in `data/nodes/`.

### Data Files

1. Each entity is a **single JSON file** named by its `id`.
2. Files must validate against `tauira-schema.json`.
3. `category` must be exactly `"M"`, `"K"`, or `"I"`.
4. `relationshipType` on edges must be one of: `co-presence`, `affect`, `constraint`, `enables`, `disrupts`, `mediates`, `assembles`, `diffracts`.
5. `weight` on edges is a float between 0 and 1.
6. Never duplicate an `id` across files of the same type.

### Templates

1. Access node data with: `{{ $node := index .Site.Data.nodes "node-XXX" }}`
2. The `node-badge.html` partial renders the node label with a colour-coded category pill: M = teal (#01696f), K = indigo (#5b4fcf), I = amber (#d19900).
3. The `rq-alignment.html` partial renders RQ1, RQ1a, RQ1b annotations if present.
4. The JSON output template at `layouts/index.json.json` exports all nodes and edges as a valid graph object.

## Research Questions

> **RQ1** — What characterises my experience as a teacher-researcher in a typical collaborative classroom setting?
> **RQ1a** — In what ways do participants in such a setting affect my being-with them?
> **RQ1b** — What assemblages of participants and materials shape these experiences?

Every encounter, memo, and essay must be legible through at least one of these three lenses.

## Constraints

- **Never remove `additionalProperties: false`** from schema definitions.
- **Never use `localStorage`** in front-end JS.
- **Always anonymise student data** — set `anonymised: true` on all artefacts involving student work.
- **The schema is the single source of truth** — if the schema and this prompt conflict, the schema wins.
- **All cross-references use string IDs**.
- **Hugo version** — target Hugo Extended v0.128+.
