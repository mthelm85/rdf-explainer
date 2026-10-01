---
title: Overview
---

```js
import {toggle, chainFigure, namesFigure} from "./components/figures.js";
```

# RDF, briefly

<p class="lede">The Resource Description Framework is a simple way to write down facts so that data from different organizations fits together on its own. This short notebook shows how it works, and why it matters for connecting workers, employers and educators.</p>

<nav class="md-card-grid" aria-label="In this notebook">
  <a class="md-card" href="./syntax"><span class="md-card-overline">Next</span><span class="md-card-title">Writing RDF</span><span class="md-card-body">Three small graphs in Turtle and JSON-LD.</span></a>
  <a class="md-card" href="./merging"><span class="md-card-overline">Then</span><span class="md-card-title">Merging data</span><span class="md-card-body">How shared names make datasets combine.</span></a>
  <a class="md-card" href="./why"><span class="md-card-overline">Finally</span><span class="md-card-title">Why it matters</span><span class="md-card-body">Fewer missed matches in the labor market.</span></a>
</nav>

## A fact has three parts

Every statement in RDF is a *triple*: a subject, a predicate and an object. Triples chain together into a graph, and following the arrows lets software answer questions nobody wrote code for.

<figure class="md-figure">

```js
display(chainFigure(width - 32));
```

<figcaption>Three triples. Maria holds a degree, the degree certifies a skill, and a job requires that skill. So Maria may fit the job.</figcaption>
</figure>

## One name for one thing

An employer, a college, an apprenticeship program and a worker can all describe the same skill in different words. People see the connection; software sees unrelated text.

RDF names things with web addresses (IRIs) such as `https://skills.riverbend.example/skill/plc-programming`. When everyone points to the same address, a match is no longer a guess.

```js
const namesMode = view(toggle([{value: "text", label: "As text"}, {value: "rdf", label: "With RDF"}], "text", "View"));
```

<figure class="md-figure">

```js
const names = namesFigure(width - 32);
display(names);
```

```js
names.update(namesMode);
```

</figure>

<p class="md-caption">Organizations, people and <code>.example</code> addresses in this notebook are fictional. <a href="https://github.com/mthelm85/rdf-explainer">Source and data</a>.</p>
