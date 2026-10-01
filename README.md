# RDF, briefly

A short, minimal explainer of the **Resource Description Framework (RDF)**, and of why shared, linked data could reduce frictions between workers, employers, colleges and apprenticeship programs.

Live at **https://mthelm85.github.io/rdf-explainer/**. Built with [Observable Framework](https://observablehq.com/framework/), [D3](https://d3js.org) and [Observable Plot](https://observablehq.com/plot/).

## What's on the page

1. **A fact has three parts.** Triples, and how they chain into a graph.
2. **One name for one thing.** Four phrasings of a skill, joined by one shared IRI.
3. **Data that merges.** An employer's, a college's and a worker's data merging on shared names.
4. **Why it matters.** Matching jobs by each organization's own wording versus by shared skill IRIs.

## Data

`src/data/ecosystem.trig` describes a fictional regional ecosystem, with each publisher in its own named graph. A Framework data loader (`src/data/ecosystem.json.js`) parses it with [N3.js](https://github.com/rdfjs/N3.js) at build time, so the page ships plain JSON. `src/data/phrasing.js` records how each organization worded each skill, which powers the keyword-matching comparison.

## Develop

```sh
npm install
npm run dev      # preview at http://127.0.0.1:3000
npm run build    # static site in ./dist
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

All organizations, people and `.example` identifiers are fictional.
