# RDF, Explained

An illustrated, interactive explainer of the **Resource Description Framework (RDF)** — and of how shared, linked data could reduce frictions in the education and workforce ecosystem by letting information flow between employers, colleges, apprenticeship programs and workers.

Built with [Observable Framework](https://observablehq.com/framework/). Two pages:

| Page | Audience | What's on it |
|---|---|---|
| **The explainer** (`src/index.md`) | Everyone, plus ⚙ deep-dive notes for engineers | Animated hero graph · "four names, one skill" · triple composer · IRI anatomy · datasets merging live · Turtle playground re-serialized to JSON-LD / N-Triples / RDF/XML · vocabulary landscape · SPARQL workbench with highlighted results · integration-cost scaling · ecosystem feedback loop · keyword vs. linked-skill matching · friction table · adoption roadmap |
| **Engineer's field guide** (`src/engineering.md`) | Architects & IT engineers | Clickable reference architecture · RDF vs. SQL vs. property graphs · live JSON-LD lab · SHACL validation lab · named-graph provenance · Open Badges 3.0 / Verifiable Credential example · storage engines · sharp edges · starter checklist |

Everything interactive runs in the browser on real standards tooling: [Oxigraph](https://github.com/oxigraph/oxigraph) (a Rust RDF store and SPARQL 1.1 engine compiled to WebAssembly) is vendored in `src/lib/oxigraph/` and parses Turtle, TriG and JSON-LD and executes SPARQL queries client-side.

## The example dataset

`src/data/ecosystem.trig` describes a fictional regional talent ecosystem ("Riverbend"): two employers, a community college, an electrical apprenticeship program, a workforce board's skills framework (SKOS) and three workers' wallets. Each publisher's data lives in its **own named graph**; they share only vocabularies (schema.org, SKOS, CTDL) and skill IRIs. Every visualization, query and match on the site is computed from this one file, so editing it changes the whole site.

`src/data/phrasing.js` records how each publisher *wrote* each skill in free text, which powers the keyword-matching comparison.

## Develop

```sh
npm install
npm run dev      # local preview with live reload at http://127.0.0.1:3000
npm run build    # static site in ./dist
```

All JavaScript libraries (d3, Observable Plot, Inputs, htl) are imported from `node_modules` and bundled into the build, so the built site does not depend on a CDN. Fonts load from Google Fonts with system fallbacks.

`dist/` is a plain static site: deploy it to any static host (GitHub Pages, Netlify, S3, Observable with `npm run deploy`). The host should serve `engineering.html` for `/engineering` (most do by default).

## Layout

```
src/
  index.md, engineering.md     pages
  style.css                    theme (light + dark), typography, components
  components/                  D3 visualizations and RDF helpers
    rdf.js                     prefixes, compaction, quads → graph, Turtle/JSON-LD printers
    store.js                   Oxigraph loader + SPARQL helper
    forceGraph.js              reusable force-directed RDF graph
    hero.js, babel.js, mergeViz.js, loop.js, integrations.js, triple.js, seg.js
  data/ecosystem.trig          the example dataset
  lib/oxigraph/                vendored Oxigraph WebAssembly build (MIT / Apache-2.0)
```

All organizations, people and `.example` identifiers are fictional.
