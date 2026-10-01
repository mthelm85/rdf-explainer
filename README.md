# RDF, briefly

A short, minimal explainer of the **Resource Description Framework (RDF)**, and of why shared, linked data could reduce frictions between workers, employers, colleges and apprenticeship programs.

Live at **https://mthelm85.github.io/rdf-explainer/**. Built with [SvelteKit](https://svelte.dev/docs/kit), [D3](https://d3js.org) and [Observable Plot](https://observablehq.com/plot/), and prerendered to a static site.

## What's on the page

One page, with a vertical menu that tracks your place:

1. **A fact has three parts.** Triples, and how they chain into a graph.
2. **One name for one thing.** Four phrasings of a skill, joined by one shared IRI.
3. **Writing it down.** Three small graphs (a job posting, a worker's record, a skill with synonyms) in Turtle and JSON-LD.
4. **Data that merges.** An employer's, a college's and a worker's data merging on shared names.
5. **Why it matters.** The integration explosion (point-to-point vs. shared vocabularies), and keyword vs. linked-skill matching.
6. **Where to start.** The standards that already exist.

## Data

`src/lib/data/ecosystem.trig` describes a fictional regional ecosystem, with each publisher in its own named graph. `src/lib/server/data.js` parses it with [N3.js](https://github.com/rdfjs/N3.js) when the site is built, so the page ships plain JSON.

The examples in `src/lib/data/examples/` are written twice, as Turtle and JSON-LD. The build parses both (N3.js and [jsonld.js](https://github.com/digitalbazaar/jsonld.js)) and fails if they don't produce exactly the same triples.

`src/lib/data/phrasing.js` records how each organization worded each skill, which powers the keyword-matching comparison.

## Develop

```sh
npm install
npm run dev      # preview at http://localhost:5173
npm run build    # static site in ./build
npm run check    # type and template checks
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`, which sets `BASE_PATH` so the site works under `/rdf-explainer/`.

## Layout

```
src/
  app.css, app.html            global styles (light theme) and page shell
  routes/+layout.svelte        vertical menu and footer
  routes/+page.svelte          the page
  routes/+page.server.js       build-time data
  lib/sections/                one component per section
  lib/components/              Figure (D3/Plot wrapper), Toggle, Example
  lib/figures.js               the D3 figures
  lib/server/data.js           TriG parsing and the Turtle/JSON-LD check
  lib/data/                    the dataset, examples and phrasings
```

All organizations, people and `.example` identifiers are fictional.
