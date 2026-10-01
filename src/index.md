---
title: RDF, briefly
toc: false
---

```js
import * as d3 from "d3";
import * as Plot from "@observablehq/plot";
import {html} from "htl";
import {indexQuads, toggle, chainFigure, namesFigure, mergeFigure, SK} from "./components/figures.js";
import {PHRASING, sourceOf} from "./data/phrasing.js";

const quads = await FileAttachment("data/ecosystem.json").json();
const index = indexQuads(quads);
```

# RDF, briefly

<p class="lede">The Resource Description Framework is a simple way to write down facts so that data from different organizations fits together on its own. Here is how it works, and why it matters for connecting workers, employers and educators.</p>

## A fact has three parts

Every statement in RDF is a *triple*: a subject, a predicate and an object. Triples chain together into a graph, and following the arrows lets software answer questions nobody wrote code for.

```js
display(chainFigure(width));
```

<p class="caption">Three triples. Read left to right: Maria holds a degree, the degree certifies a skill, and a job requires that skill. So Maria may fit the job.</p>

## One name for one thing

An employer, a college, an apprenticeship program and a worker can all describe the same skill in different words. People see the connection; software sees unrelated text.

RDF names things with web addresses (IRIs) such as `https://skills.riverbend.example/skill/plc-programming`. When everyone points to the same address, a match is no longer a guess.

```js
const namesMode = view(toggle([{value: "text", label: "As text"}, {value: "rdf", label: "With RDF"}]));
```

```js
const names = namesFigure(width);
display(names);
```

```js
names.update(namesMode);
```

## Data that merges

Because names are shared, combining datasets is just pouring their triples together. Below, an employer, a college and a worker each publish their own data. Nobody agreed on a database schema, only on the names.

```js
const mergeMode = view(toggle([{value: "separate", label: "Separate"}, {value: "merged", label: "Merged"}]));
```

```js
const merge = mergeFigure({
  quads,
  index,
  width,
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
display(html`<p class="caption">${mergeMode === "merged"
  ? html`Merged: Maria now connects to <b>${reach.jobs} job${reach.jobs === 1 ? "" : "s"}</b> through <b>${reach.skills} shared skills</b>.`
  : html`Separate: no dataset on its own links Maria to a job.`}</p>`);
```

## Why it matters

Much of the friction in the labor market is about information. Employers can't easily tell what a credential certifies. Workers struggle to prove skills learned on the job or in an apprenticeship. Colleges hear about changing demand slowly. And every pair of systems that wants to exchange data needs its own custom mapping, so costs grow with the square of the number of participants.

Shared names change that. Here is the same region with the same people, jobs and skills, matched two ways: by comparing each organization's own wording, and by comparing shared skill IRIs.

```js
const worker = view(toggle([
  {value: "https://wallet.example/maria", label: "Maria"},
  {value: "https://wallet.example/jordan", label: "Jordan"},
  {value: "https://wallet.example/sam", label: "Sam"}
]));
```

```js
const S = "https://schema.org/";
const out = d3.group(quads, (q) => q.s);
const objs = (s, p) => (out.get(s) ?? []).filter((q) => q.p === S + p).map((q) => q.o);
const local = (iri) => iri.slice(SK.length);
const norm = (s) => (s ?? "").toLowerCase().trim();

const skills = new Map(); // skill IRI → how the worker's evidence words it
for (const cred of objs(worker, "hasCredential"))
  for (const s of objs(cred, "competencyRequired")) skills.set(s, PHRASING[sourceOf(cred)]?.[local(s)]);
for (const s of objs(worker, "knowsAbout")) skills.set(s, PHRASING[sourceOf(worker)]?.[local(s)]);
const words = new Set([...skills.values()].map(norm));

const matches = [...out.keys()]
  .filter((s) => index.types(s).includes(S + "JobPosting"))
  .map((job) => {
    const req = objs(job, "skills");
    const keyword = req.filter((s) => words.has(norm(PHRASING[sourceOf(job)]?.[local(s)]))).length;
    const linked = req.filter((s) => skills.has(s)).length;
    return {title: index.label(job), required: req.length, keyword, linked};
  })
  .sort((a, b) => b.linked / b.required - a.linked / a.required);
```

```js
display(
  Plot.plot({
    width,
    height: 40 + matches.length * 36,
    marginLeft: Math.min(200, width * 0.42),
    marginRight: 40,
    x: {domain: [0, 1], ticks: [0, 0.5, 1], tickFormat: "%", label: "Required skills the worker can show", labelAnchor: "left"},
    y: {domain: matches.map((d) => d.title), label: null, tickSize: 0},
    marks: [
      Plot.ruleY(matches, {y: "title", x1: 0, x2: 1, stroke: "var(--rule)"}),
      Plot.link(matches, {y1: "title", y2: "title", x1: (d) => d.keyword / d.required, x2: (d) => d.linked / d.required, stroke: "var(--accent)", strokeOpacity: 0.35, strokeWidth: 2}),
      Plot.dot(matches, {y: "title", x: (d) => d.keyword / d.required, r: 4.5, stroke: "var(--muted)", fill: "var(--bg)", strokeWidth: 1.5}),
      Plot.dot(matches, {y: "title", x: (d) => d.linked / d.required, r: 4.5, fill: "var(--accent)"}),
      Plot.text(matches, {y: "title", x: 1, text: (d) => `${d.linked}/${d.required}`, dx: 22, fill: "var(--muted)"}),
      Plot.tip(matches, Plot.pointerY({y: "title", x: (d) => d.linked / d.required, title: (d) => `${d.title}\nby wording: ${d.keyword} of ${d.required}\nby shared IRI: ${d.linked} of ${d.required}`}))
    ]
  })
);
```

```js
const kw = d3.sum(matches, (d) => d.keyword), lk = d3.sum(matches, (d) => d.linked);
display(html`<p class="caption"><span class="key hollow"></span> by wording &nbsp; <span class="key"></span> by shared IRI. Across all ${matches.length} jobs, wording finds ${kw} skill matches; shared IRIs find ${lk}.</p>`);
```

Nothing about the people changed, only how the data names things. The same idea lets a college check its courses against live demand, lets an apprenticeship count as evidence alongside a degree, and lets each organization map its data once, to a shared vocabulary, instead of once per partner.

## Where to start

Standards for this already exist: [schema.org](https://schema.org/JobPosting) for job postings, [CTDL](https://credreg.net/ctdl/handbook) for credentials, [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/) for verifiable achievements, and [SKOS](https://www.w3.org/TR/skos-reference/) for skill frameworks. All of them can be published as ordinary JSON with one extra line, an `@context`, which is often the first step.

<p class="caption">Organizations, people and <code>.example</code> addresses on this page are fictional. <a href="https://github.com/mthelm85/rdf-explainer">Source and data</a>.</p>
