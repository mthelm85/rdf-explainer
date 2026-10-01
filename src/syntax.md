---
title: Writing RDF
---

```js
import {html} from "htl";
import * as Inputs from "@observablehq/inputs";
import {exampleGraph, highlight} from "./components/figures.js";

const examples = await FileAttachment("data/examples.json").json();
```

# Writing RDF

<p>RDF is a data model, not a file format. The same graph can be written in several standard syntaxes. Two matter most: <b>Turtle</b>, which is compact and easy to read, and <b>JSON-LD</b>, which is ordinary JSON with a little context added.</p>

Each example below shows a small graph, then the same triples written both ways. Prefixes such as `schema:` are shorthand for long web addresses, declared once at the top.

```js
const READINGS = {
  job: "Acme Robotics is hiring an Automation Technician at $68,000. The job requires two skills, named by IRIs from a shared skills framework.",
  record: "Maria holds a credential from Riverbend Community College. The credential describes the skills it certifies, using the same skill IRIs as the job posting.",
  skill: "The skills framework defines PLC Programming once, lists the other ways people say it, and places it under a broader category."
};
function exampleCard(ex) {
  const tabs = Inputs.radio(new Map([["Turtle", "turtle"], ["JSON-LD", "jsonld"]]), {label: "Syntax", value: "turtle"});
  const code = html`<pre tabindex="0"></pre>`;
  const copy = html`<button type="button">Copy</button>`;
  const show = () => {
    const text = tabs.value === "turtle" ? ex.turtle : ex.jsonld;
    code.innerHTML = highlight(text, tabs.value);
    code.setAttribute("aria-label", `${ex.title} in ${tabs.value === "turtle" ? "Turtle" : "JSON-LD"}`);
  };
  copy.onclick = async () => {
    await navigator.clipboard?.writeText(tabs.value === "turtle" ? ex.turtle : ex.jsonld);
    copy.textContent = "Copied";
    setTimeout(() => (copy.textContent = "Copy"), 1500);
  };
  tabs.addEventListener("input", show);
  show();
  return html`<div class="card">
    <p>${READINGS[ex.id]}</p>
    ${exampleGraph(ex.triples, Math.min(width, 640) - 32)}
    <p class="small muted">${ex.triples.length} triples. Dots are things with IRIs; boxes are plain values${ex.id === "record" ? "; the dashed line joins two mentions of the same credential" : ""}.</p>
    <div style="display: flex; align-items: center; justify-content: space-between;">${tabs}${copy}</div>
    ${code}
  </div>`;
}
```

## Example 1: a job posting

```js
display(exampleCard(examples[0]));
```

In Turtle, `;` means "same subject, next predicate" and `,` means "same predicate, next object", so a description reads almost like a sentence. In JSON-LD, the `@context` says which keys are vocabulary terms, and `@id` gives the thing its name.

## Example 2: a worker’s record

```js
display(exampleCard(examples[1]));
```

JSON-LD can nest one thing inside another, which is how most APIs already shape their data. Setting `"@vocab"` to schema.org lets plain keys like `name` stand for full vocabulary terms. That is often all it takes to turn an existing JSON API into linked data.

## Example 3: a skill with its synonyms

```js
display(exampleCard(examples[2]));
```

This is what makes the four phrasings on the [overview](./) line up: a skills framework publishes one IRI per skill, with its preferred label and its alternatives, using the [SKOS](https://www.w3.org/TR/skos-reference/) vocabulary.

<p class="small muted">Each pair is checked when the site is built: the Turtle and JSON-LD versions must produce exactly the same triples, or the build fails.</p>

