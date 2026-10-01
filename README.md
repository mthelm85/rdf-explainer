# RDF, briefly

A short Observable notebook explaining of the **Resource Description Framework (RDF)**, and of why shared, linked data could reduce frictions between workers, employers, colleges and apprenticeship programs.

Live at **https://mthelm85.github.io/rdf-explainer/**. Built with [Observable Framework](https://observablehq.com/framework/), [D3](https://d3js.org) and [Observable Plot](https://observablehq.com/plot/).

## What's in the notebook

| Page | Contents |
|---|---|
| **Overview** | Triples and how they chain into a graph; four phrasings of one skill joined by a shared IRI. |
| **Writing RDF** | Three small graphs (a job posting, a worker's record, a skill with synonyms) in Turtle and JSON-LD. |
| **Merging data** | An employer's, a college's and a worker's data merging on shared names. |
| **Why it matters** | The integration explosion (point-to-point vs. shared vocabularies), and keyword vs. linked-skill matching. |

## Design

The notebook follows **Material Design 3**: color roles generated with [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) (tonal-spot scheme, seed `#2563EB`) in light and dark, the MD3 type scale in Roboto Flex, navigation drawer, segmented buttons, cards and state layers. All text meets WCAG AA contrast (≥ 4.5:1) and meaningful graphics meet 3:1. Tokens live at the top of `src/style.css`.

## Data

`src/data/ecosystem.trig` describes a fictional regional ecosystem, with each publisher in its own named graph. A Framework data loader (`src/data/ecosystem.json.js`) parses it with [N3.js](https://github.com/rdfjs/N3.js) at build time, so the page ships plain JSON.

The examples in `src/data/examples/` are written twice, as Turtle and JSON-LD. `src/data/examples.json.js` parses both (N3.js and [jsonld.js](https://github.com/digitalbazaar/jsonld.js)) and fails the build if they don't produce exactly the same triples. `src/data/phrasing.js` records how each organization worded each skill, which powers the keyword-matching comparison.

## Develop

```sh
npm install
npm run dev      # preview at http://127.0.0.1:3000
npm run build    # static site in ./dist
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

All organizations, people and `.example` identifiers are fictional.
