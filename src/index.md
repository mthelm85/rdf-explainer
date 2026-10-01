---
title: Overview
---

```js
import * as Inputs from "@observablehq/inputs";
import {chainFigure, namesFigure} from "./components/figures.js";
```

# RDF, briefly

<p>The Resource Description Framework is a simple way to write down facts so that data from different organizations fits together on its own. This short notebook shows how it works, and why it matters for connecting workers, employers and educators.</p>

<div class="grid grid-cols-3">
  <div class="card"><h2><a href="./syntax">Writing RDF</a></h2>Three small graphs in Turtle and JSON-LD.</div>
  <div class="card"><h2><a href="./merging">Merging data</a></h2>How shared names make datasets combine.</div>
  <div class="card"><h2><a href="./why">Why it matters</a></h2>Fewer missed matches in the labor market.</div>
</div>

## A fact has three parts

Every statement in RDF is a *triple*: a subject, a predicate and an object. Triples chain together into a graph, and following the arrows lets software answer questions nobody wrote code for.

<div class="card">

```js
display(chainFigure(width - 32));
```

<p class="small muted">Three triples. Maria holds a degree, the degree certifies a skill, and a job requires that skill. So Maria may fit the job.</p>
</div>

## One name for one thing

An employer, a college, an apprenticeship program and a worker can all describe the same skill in different words. People see the connection; software sees unrelated text.

RDF names things with web addresses (IRIs) such as `https://skills.riverbend.example/skill/plc-programming`. When everyone points to the same address, a match is no longer a guess.

```js
const namesMode = view(Inputs.radio(new Map([["As text", "text"], ["With RDF", "rdf"]]), {label: "View", value: "text"}));
```

<div class="card">

```js
const names = namesFigure(width - 32);
display(names);
```

```js
names.update(namesMode);
```

</div>

