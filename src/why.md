---
title: Why it matters
---

```js
import * as d3 from "d3";
import * as Plot from "@observablehq/plot";
import {html} from "htl";
import * as Inputs from "@observablehq/inputs";
import {indexQuads, networkMini, SK} from "./components/figures.js";
import {PHRASING, sourceOf} from "./data/phrasing.js";

const quads = await FileAttachment("data/ecosystem.json").json();
const index = indexQuads(quads);
```

# Why it matters

Much of the friction in the labor market is about information. Employers can't easily tell what a credential certifies. Workers struggle to prove skills learned on the job or in an apprenticeship. Colleges hear about changing demand slowly. And connecting their systems is expensive.

## The integration explosion

Without shared names, every pair of organizations that wants to exchange data needs its own custom mapping. That cost grows with the *square* of the number of participants. With shared vocabularies and identifiers, each organization maps its data once, to the commons, and can then exchange data with everyone else.

```js
const nOrgs = view(Inputs.range([2, 40], {label: "Organizations", step: 1, value: 12}));
```

<div class="card">

```js
const p2p = (nOrgs * (nOrgs - 1)) / 2;
const curve = d3.range(2, 41).flatMap((n) => [
  {n, integrations: (n * (n - 1)) / 2, approach: "Point-to-point"},
  {n, integrations: n, approach: "Shared vocabulary"}
]);
const mini = Math.min(220, (width - 32 - 16) / 2);
display(html`<div class="grid grid-cols-2">
  <div><h2>Point-to-point</h2><span class="big" style="color: var(--md-tertiary)">${p2p.toLocaleString()}</span> <span class="muted">custom mappings</span>${networkMini(nOrgs, "p2p", mini)}</div>
  <div><h2>Shared vocabulary</h2><span class="big" style="color: var(--md-primary)">${nOrgs}</span> <span class="muted">mappings</span>${networkMini(nOrgs, "hub", mini)}</div>
</div>`);
```

```js
display(
  Plot.plot({
    width: width - 32,
    height: 260,
    marginLeft: 44,
    marginRight: 120,
    x: {label: "Organizations", domain: [2, 40]},
    y: {label: "Mappings to build", grid: true},
    color: {domain: ["Point-to-point", "Shared vocabulary"], range: ["var(--md-tertiary)", "var(--md-primary)"]},
    marks: [
      Plot.ruleY([0], {stroke: "var(--md-outline)"}),
      Plot.ruleX([nOrgs], {stroke: "var(--md-outline)", strokeDasharray: "3 3"}),
      Plot.line(curve, {x: "n", y: "integrations", stroke: "approach", strokeWidth: 2}),
      Plot.dot(curve.filter((d) => d.n === nOrgs), {x: "n", y: "integrations", fill: "approach", r: 5, stroke: "var(--md-surface-container-low)", strokeWidth: 2}),
      Plot.text(curve.filter((d) => d.n === 40), {x: "n", y: "integrations", text: "approach", dx: 8, textAnchor: "start", fill: "var(--md-on-surface)"}),
      Plot.tip(curve, Plot.pointerX({x: "n", y: "integrations", title: (d) => `${d.approach}\n${d.n} organizations → ${d.integrations.toLocaleString()} mappings`}))
    ]
  })
);
```

<p class="small muted">Point-to-point mappings grow as n(n − 1)/2. Mapping once to shared vocabularies grows as n. Real ecosystems are never fully connected, but the shape holds: every new participant adds value and, without a commons, adds cost.</p>
</div>

## Fewer missed matches

Shared names change that. Here is the same region with the same people, jobs and skills, matched two ways: by comparing each organization's own wording, and by comparing shared skill IRIs.

```js
const worker = view(Inputs.radio(new Map([
  ["Maria", "https://wallet.example/maria"],
  ["Jordan", "https://wallet.example/jordan"],
  ["Sam", "https://wallet.example/sam"]
]), {label: "Worker", value: "https://wallet.example/maria"}));
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

<div class="card">

```js
display(
  Plot.plot({
    width: width - 32,
    height: 40 + matches.length * 36,
    marginLeft: Math.min(200, width * 0.42),
    marginRight: 40,
    x: {domain: [0, 1], ticks: [0, 0.5, 1], tickFormat: "%", label: "Required skills the worker can show", labelAnchor: "left"},
    y: {domain: matches.map((d) => d.title), label: null, tickSize: 0},
    marks: [
      Plot.ruleY(matches, {y: "title", x1: 0, x2: 1, stroke: "var(--md-outline-variant)"}),
      Plot.link(matches, {y1: "title", y2: "title", x1: (d) => d.keyword / d.required, x2: (d) => d.linked / d.required, stroke: "var(--md-primary)", strokeOpacity: 0.35, strokeWidth: 2}),
      Plot.dot(matches, {y: "title", x: (d) => d.keyword / d.required, r: 4.5, stroke: "var(--md-on-surface-variant)", fill: "var(--md-surface)", strokeWidth: 1.5}),
      Plot.dot(matches, {y: "title", x: (d) => d.linked / d.required, r: 4.5, fill: "var(--md-primary)"}),
      Plot.text(matches, {y: "title", x: 1, text: (d) => `${d.linked}/${d.required}`, dx: 22, fill: "var(--md-on-surface-variant)"}),
      Plot.tip(matches, Plot.pointerY({y: "title", x: (d) => d.linked / d.required, title: (d) => `${d.title}\nby wording: ${d.keyword} of ${d.required}\nby shared IRI: ${d.linked} of ${d.required}`}))
    ]
  })
);
```

```js
const kw = d3.sum(matches, (d) => d.keyword), lk = d3.sum(matches, (d) => d.linked);
display(html`<p class="small muted"><svg width="10" height="10" style="vertical-align: -1px"><circle cx="5" cy="5" r="4" fill="none" stroke="var(--md-on-surface-variant)" stroke-width="1.5"/></svg> by wording &nbsp; <svg width="10" height="10" style="vertical-align: -1px"><circle cx="5" cy="5" r="4.5" fill="var(--md-primary)"/></svg> by shared IRI. Across all ${matches.length} jobs, wording finds ${kw} skill matches; shared IRIs find ${lk}.</p>`);
```

</div>

Nothing about the people changed, only how the data names things. The same idea lets a college check its courses against live demand, lets an apprenticeship count as evidence alongside a degree, and lets each organization map its data once, to a shared vocabulary, instead of once per partner.

## Where to start

Standards for this already exist: [schema.org](https://schema.org/JobPosting) for job postings, [CTDL](https://credreg.net/ctdl/handbook) for credentials, [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/) for verifiable achievements, and [SKOS](https://www.w3.org/TR/skos-reference/) for skill frameworks. All of them can be published as ordinary JSON with one extra line, an `@context`, which is often the first step.

