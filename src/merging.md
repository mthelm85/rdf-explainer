---
title: Merging data
---

```js
import {html} from "htl";
import {indexQuads, toggle, mergeFigure} from "./components/figures.js";

const quads = await FileAttachment("data/ecosystem.json").json();
const index = indexQuads(quads);
```

# Merging data

<p class="lede">Because names are shared, combining datasets is just pouring their triples together.</p>

Below, an employer, a college and a worker each publish their own data. Nobody agreed on a database schema, only on the names.

```js
const mergeMode = view(toggle([{value: "separate", label: "Separate"}, {value: "merged", label: "Merged"}], "separate", "Datasets"));
```

<figure class="md-figure">

```js
const merge = mergeFigure({
  quads,
  index,
  width: width - 32,
  panels: [
    {graph: "https://jobs.acme-robotics.example/graph", title: "Employer"},
    {graph: "https://catalog.riverbend-cc.example/graph", title: "College"},
    {graph: "https://wallet.example/maria-graph", title: "Worker"}
  ]
});
```

```js
const reach = merge.render(mergeMode);
display(merge);
```

```js
display(html`<p class="md-caption">${mergeMode === "merged"
  ? html`Merged: Maria now connects to <b>${reach.jobs} job${reach.jobs === 1 ? "" : "s"}</b> through <b>${reach.skills} shared skills</b>.`
  : html`Separate: no dataset on its own links Maria to a job.`}</p>`);
```

</figure>


When the graphs merge, nodes with the same IRI become one node, and new paths appear. The blue lines trace Maria's credential to the skills it certifies, and on to every job that asks for them. None of the three publishers held that information alone.

<p class="md-caption">Organizations, people and <code>.example</code> addresses in this notebook are fictional. <a href="https://github.com/mthelm85/rdf-explainer">Source and data</a>.</p>
