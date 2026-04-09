# Tauira

> *Capturing entanglements of an educator-researcher experience.*

Tauira is a living research site built on [Hugo](https://gohugo.io/) and the
[Amethyst](https://github.com/64bitpandas/amethyst) theme. It publishes
fieldnotes, analytic memos, essays, artefacts, and rhizomatic maps produced
during an ongoing autoethnographic study of classroom experience as a
teacher-researcher.

The site translates classroom data into a **rhizomatic text network** — nodes
representing participants categorised as Material (M), Knowledge (K), or
Instinctual (I), and edges representing the relationships between them.

**Live site →** [bibymaths.github.io/tauira](https://bibymaths.github.io/tauira/)

---

## Research Questions

| Code | Question |
|---|---|
| **RQ1** | What characterises my experience as a teacher-researcher in a typical collaborative classroom setting? |
| **RQ1a** | In what ways do participants in such a setting affect my being-with them? |
| **RQ1b** | What assemblages of participants and materials shape these experiences? |

---

## Participant Categories

| Category | Label | Examples | Colour |
|---|---|---|---|
| **M** | Material | Room dimensions, tables, chairs, lesson plans, students | `#01696f` |
| **K** | Knowledge | Theories, policy, curricular constructs, ideas | `#5b4fcf` |
| **I** | Instinctual | Feelings, emotions, boredom, laughter, aggressiveness | `#d19900` |

---

## Content Types

| Folder | Type | Description |
|---|---|---|
| `content/encounters/` | Encounter | Four-part fieldnote: scene, agency, care, vignette |
| `content/memos/` | Analytic Memo | RQ-oriented reflection with GPT gap suggestions |
| `content/essays/` | Essay | Expanded autoethnographic narrative |
| `content/artefacts/` | Artefact | Lesson plans, unit planners, anonymised student work |
| `content/map/` | Rhizomatic Map | In-browser sigma.js graph of nodes and edges |

---

## Data Schema

All structured data is validated against **`tauira-schema.json`** (JSON Schema Draft-07).

| Folder | Contents |
|---|---|
| `data/nodes/` | Participant nodes (M / K / I) |
| `data/edges/` | Relational edges between nodes |
| `data/maps/` | Rhizomatic map snapshots |
| `data/tours/` | RQ-guided examiner reading paths |
| `static/graph/tauira-graph.json` | Compiled graph export for sigma.js |

### Two separate graphs

There are two distinct graph systems on this site — do not confuse them:

1. **Amethyst wikilink graph** — auto-generated from `[[wikilinks]]` in
   content files by `hugo-obsidian`. Controlled by `data/graphConfig.yaml`.
   Never edit `assets/indices/` by hand.
2. **Tauira rhizomatic map** — built from `data/nodes/` and `data/edges/`,
   compiled into `static/graph/tauira-graph.json`, rendered in-browser via
   sigma.js on `/map/` pages.

---

## Local Development

### Requirements

| Tool | Version | Install |
|---|---|---|
| Go | 1.16+ | [go.dev/dl](https://go.dev/dl/) |
| Hugo Extended | 0.93+ | [github.com/gohugoio/hugo/releases](https://github.com/gohugoio/hugo/releases) |
| hugo-obsidian | latest | `go install github.com/jackyzha0/hugo-obsidian@latest` |

### Commands

```bash
# Serve locally at http://localhost:1313/tauira/
make serve

# Build for production
make build

# Regenerate wikilink index after adding content
hugo-obsidian -input=content -output=assets/indices -index -root=.
```

> Restart `make serve` after adding new content files — Hugo requires a
> restart to update sidebar navigation and the wikilink index.

---

## GitHub Copilot Prompts

| Prompt | Invoke | Purpose |
|---|---|---|
| `.github/prompts/tauira-seed.prompt.md` | `/tauira-seed` | Populate an empty repo with dummy data and verify all features |
| `.github/prompts/tauira-longterm.prompt.md` | `/tauira-longterm` | Graph health audit, schema evolution, GPT fine-tuning prep |

Baseline agent rules: `.github/copilot-instructions.md`

---

## Customisation

Override theme behaviour without editing theme internals:

| File | Purpose |
|---|---|
| `config.yaml` | Site-wide Hugo configuration |
| `data/graphConfig.yaml` | Amethyst wikilink graph display settings |
| `assets/_custom.scss` | SCSS overrides |
| `assets/_variables.scss` | Theme variable overrides |
| `assets/_colors.scss` | Colour scheme |
| `assets/_fonts.scss` | Font replacement |
| `static/favicon.png` | Replace default Amethyst favicon |
| `layouts/partials/docs/inject/` | Extension points: head, body, menu, content, ToC |

---

## Deployment

Deploys automatically to GitHub Pages on push to `main`.

**Live URL:** `https://bibymaths.github.io/tauira/`

`baseURL` in `config.yaml` must remain:
```yaml
baseURL: "https://bibymaths.github.io/tauira/"
```

---

## Amethyst Documentation

| Resource | Link |
|---|---|
| Demo + full docs | [amethyst.bencuan.me](https://amethyst.bencuan.me) |
| Getting started | [amethyst.bencuan.me/setup](https://amethyst.bencuan.me/setup/) |
| Editing content | [amethyst.bencuan.me/setup/editing](https://amethyst.bencuan.me/setup/editing/) |
| Obsidian vault integration | [amethyst.bencuan.me/setup/obsidian](https://amethyst.bencuan.me/setup/obsidian/) |
| Hosting on GitHub Pages | [amethyst.bencuan.me/setup/hosting](https://amethyst.bencuan.me/setup/hosting/) |
| Customisation reference | [amethyst.bencuan.me/setup/config](https://amethyst.bencuan.me/setup/config/) |
| Troubleshooting & FAQ | [amethyst.bencuan.me/setup/troubleshooting](https://amethyst.bencuan.me/setup/troubleshooting/) |
| Amethyst GitHub repo | [github.com/64bitpandas/amethyst](https://github.com/64bitpandas/amethyst) |
| Hugo documentation | [gohugo.io/documentation](https://gohugo.io/documentation/) |
| hugo-obsidian | [github.com/jackyzha0/hugo-obsidian](https://github.com/jackyzha0/hugo-obsidian) |

---

## License

Research content © the author. Code and configuration: MIT.

---

## Hugo Installation (Pinned Version)

This project requires **Hugo v0.96.0 (Extended)** for SCSS support. The standard version will fail during build.

### Windows Setup (PyCharm / PowerShell)

1. Download the correct binary from Hugo releases:
   File name:

   ```
   hugo_extended_0.96.0_windows-amd64.zip
   ```

2. Extract the archive. You should get:

   ```
   hugo.exe
   ```

3. Place the binary inside the project:

   **Option A (recommended — project-local)**

   ```powershell
   mkdir tools\hugo
   move hugo.exe tools\hugo\
   ```

   Then add it to PATH for the session:

   ```powershell
   $env:PATH="$PWD\tools\hugo;$env:PATH"
   ```

   **Option B (inside Python virtual environment)**

   ```powershell
   move hugo.exe .venv\Scripts\
   ```

4. Verify installation:

   ```powershell
   hugo version
   ```

   Expected output must include:

   ```
   +extended
   ```

5. Run the server:

   ```powershell
   hugo serve
   ```

---

### Linux Setup

1. Download:

   ```
   hugo_extended_0.96.0_Linux-64bit.tar.gz
   ```

2. Extract:

   ```bash
   tar -xzf hugo_extended_0.96.0_Linux-64bit.tar.gz
   ```

3. Place binary:

   **Option A (recommended)**

   ```bash
   mkdir -p tools/hugo
   mv hugo tools/hugo/
   export PATH=$PWD/tools/hugo:$PATH
   ```

   **Option B (.venv)**

   ```bash
   mv hugo .venv/bin/
   chmod +x .venv/bin/hugo
   ```

4. Verify:

   ```bash
   hugo version
   ```

---

### Important Notes

* Only **Extended** Hugo supports SCSS (`TOCSS`); without it, the build will fail.
* Always confirm:

  ```
  hugo version → must include "+extended"
  ```
* Avoid global installs; keep Hugo version pinned per project for reproducibility.
