---
title: RDF, explained
toc: true
---

```js
import * as d3 from "d3";
import * as Plot from "@observablehq/plot";
import * as Inputs from "@observablehq/inputs";
import {html} from "htl";
import {loadOxigraph, plainQuads, select} from "./components/store.js";
import {PREFIXES, KINDS, compact, indexQuads, quadsToGraph, toTurtle, toJSONLD, toNTriples, sparqlPrefixes, RDF_TYPE} from "./components/rdf.js";
import {forceGraph, kindLegend, escapeHtml} from "./components/forceGraph.js";
import {heroGraph} from "./components/hero.js";
import {babelViz} from "./components/babel.js";
import {mergeViz} from "./components/mergeViz.js";
import {tripleDiagram} from "./components/triple.js";
import {loopViz, STAGES} from "./components/loop.js";
import {networkMini} from "./components/integrations.js";
import {seg} from "./components/seg.js";
import {PHRASING, sourceOf} from "./data/phrasing.js";
```

```js
// Oxigraph: a standards-compliant RDF store and SPARQL engine, compiled from Rust to WebAssembly.
const oxigraph = await loadOxigraph(await FileAttachment("lib/oxigraph/web_bg.wasm").url());
const trig = await FileAttachment("data/ecosystem.trig").text();
const store = new oxigraph.Store();
store.load(trig, {format: "application/trig"});
const allQuads = plainQuads(store.match());
const index = indexQuads(allQuads);
const graphNames = [...new Set(allQuads.map((q) => q.graph.value))];
```

```js
const hero = html`<div class="hero">
  ${heroGraph(allQuads, {width, height: width < 640 ? 760 : 560, invalidation})}
  <div class="hero-scrim"></div>
  <div class="hero-copy">
    <div class="kicker">An illustrated guide to the Resource Description Framework</div>
    <h1>The web of <em>meaning</em></h1>
    <p>How a simple idea from the W3C lets employers, colleges, apprenticeship programs and workers describe skills in a way every computer understands — and why that could take real friction out of the labor market.</p>
    <div class="hero-stats">
      <div><b>${allQuads.length}</b>statements in the graph behind this picture</div>
      <div><b>${graphNames.length}</b>independent publishers</div>
      <div><b>0</b>lines of integration code to connect them</div>
    </div>
  </div>
  <div class="hero-caption">Every dot is a thing; every line is a fact. Colors: <span style="color:#3987e5">people</span> · <span style="color:#d95926">organizations</span> · <span style="color:#9085e9">jobs</span> · <span style="color:#199e70">programs</span> · <span style="color:#d55181">credentials</span> · <span style="color:#e0a42a">skills</span></div>
</div>`;
display(hero);
```

<div class="paths">
  <div class="path"><div class="tag" style="color:var(--c-person)">For everyone</div><h4>Read straight through</h4><p>No background needed. Every idea comes with a picture you can poke at.</p></div>
  <div class="path"><div class="tag" style="color:var(--c-job)">For engineers</div><h4>Open the ⚙ panels</h4><p>Specs, syntax, edge cases and design trade-offs are tucked into expandable notes — plus a full <a href="./engineering">field guide</a>.</p></div>
  <div class="path"><div class="tag" style="color:var(--c-org)">For leaders</div><h4>Jump to <a href="#why-this-matters-for-the-labor-market">the labor market</a></h4><p>What shared, linked data could change for employers, educators, apprenticeship sponsors and workers.</p></div>
</div>

<p class="eyebrow">1 · The problem</p>

## Four documents, one skill, zero matches

Imagine a regional labor market. A manufacturer is hiring an automation technician. A community college runs a program that trains them. An electrical union runs an apprenticeship that covers much of the same ground. A worker has the skills already. Everyone is describing *the same capability* — but each in their own words.

```js
const babelMode = view(seg([
  {value: "people", label: "How a person reads it"},
  {value: "machines", label: "How software reads it"},
  {value: "rdf", label: "With RDF"}
], {label: "View"}));
```

```js
const babel = babelViz(width);
display(babel);
```

```js
babel.update?.(babelMode);
```

A person connects these instantly. Software can't: to a computer, “ladder logic” and “PLC Programming” are unrelated strings of characters. So job boards miss qualified candidates, colleges can't easily check their curriculum against what employers are asking for, and workers re-explain themselves on every application.

The usual fix is a pile of custom translations — a spreadsheet mapping one system's codes to another's, rebuilt for every new partner. The **Resource Description Framework (RDF)** takes a different approach: give every *thing* — a skill, a job, a credential, a person, an organization — a globally unique name, and write every fact as a tiny, uniform sentence that uses those names. When everyone points to the same name, the match is no longer a guess.

<p class="pull">RDF is a way of writing down facts so that data from different places can be combined as easily as web pages link to one another.</p>

<p class="eyebrow">2 · The atom</p>

## Every fact is a sentence with three parts

RDF has one data structure: the **triple**. A triple is a statement of the form *subject → predicate → object*. “Maria holds the Mechatronics degree.” “The Automation Technician job requires PLC programming.” That's it. Every RDF dataset in the world, from Wikidata's hundreds of millions of facts to a single job posting, is just a set of these.

Try composing one. Any combination is *allowed* — RDF lets anyone say anything about anything — but some sentences make more sense than others.

```js
const SUBJECTS = [
  "https://wallet.example/maria",
  "https://jobs.acme-robotics.example/job-automation-technician",
  "https://catalog.riverbend-cc.example/program-aas-mechatronics",
  "https://catalog.riverbend-cc.example/credential-aas-mechatronics",
  "https://jobs.acme-robotics.example/org"
];
const PREDICATES = ["hasCredential", "knowsAbout", "skills", "teaches", "competencyRequired", "hiringOrganization", "name"].map((p) => PREFIXES.schema + p);
const OBJECTS = [
  "https://skills.riverbend.example/skill/plc-programming",
  "https://skills.riverbend.example/skill/python",
  "https://catalog.riverbend-cc.example/credential-aas-mechatronics",
  "https://jobs.acme-robotics.example/org",
  "literal:Maria Alvarez",
  "literal:Automation Technician"
];
const nice = (iri) => (iri.startsWith("literal:") ? `“${iri.slice(8)}”` : index.label(iri) ?? compact(iri));
const PREDICATE_GLOSS = {
  hasCredential: "holds the credential",
  knowsAbout: "knows about",
  skills: "requires the skill",
  teaches: "teaches",
  competencyRequired: "certifies the competency",
  hiringOrganization: "is hiring for",
  name: "has the name"
};
```

<div class="grid grid-cols-3" style="margin-top:1rem;grid-auto-rows:auto">

```js
const tS = view(Inputs.select(SUBJECTS, {label: "Subject", value: SUBJECTS[0], format: nice}));
```

```js
const tP = view(Inputs.select(PREDICATES, {label: "Predicate", value: PREDICATES[0], format: (p) => compact(p)}));
```

```js
const tO = view(Inputs.select(OBJECTS, {label: "Object", value: OBJECTS[2], format: nice}));
```

</div>

```js
const termOf = (iri) =>
  iri.startsWith("literal:")
    ? {kind: "literal", label: iri.slice(8)}
    : {kind: index.kind(iri), label: index.label(iri) ?? compact(iri)};
const pLocal = tP.slice(PREFIXES.schema.length);
const subj = termOf(tS), obj = termOf(tO);
const sensible = {
  hasCredential: ["person", "credential"],
  knowsAbout: ["person", "skill"],
  skills: ["job", "skill"],
  teaches: ["program", "skill"],
  competencyRequired: ["credential", "skill"],
  hiringOrganization: ["job", "org"],
  name: [null, "literal"]
}[pLocal];
const makesSense = (sensible[0] == null || sensible[0] === subj.kind) && sensible[1] === obj.kind;
```

```js
display(html`<div class="card">
  <div class="triple-sentence">
    <span class="chip" style="color:${KINDS[subj.kind].color}">${subj.label}</span>
    <span style="color:var(--ink-2)"> ${PREDICATE_GLOSS[pLocal]} </span>
    <span class="chip" style="color:${obj.kind === "literal" ? "var(--ink-2)" : KINDS[obj.kind].color}">${obj.kind === "literal" ? `“${obj.label}”` : obj.label}</span>
  </div>
  ${resize((w) => tripleDiagram({subject: subj, predicate: {curie: compact(tP), label: pLocal}, object: obj, width: w}))}
  <div class="small" style="margin-top:6px">${makesSense
    ? html`<span class="status-ok">✓ A sensible statement.</span> <span class="muted">This exact triple could appear in the regional dataset.</span>`
    : html`<span style="color:var(--warn);font-weight:600">⚠ Legal RDF, odd meaning.</span> <span class="muted">RDF won't stop you — vocabularies and validation rules (see SHACL, later) are what keep data sensible.</span>`}</div>
  <pre style="margin-top:12px"><span class="muted"># The same statement, written in N-Triples (one triple per line, full names):</span>
&lt;${tS}&gt;
  &lt;${tP}&gt;
  ${tO.startsWith("literal:") ? `"${tO.slice(8)}"` : `<${tO}>`} .</pre>
</div>`);
```

Each of the three parts has a job:

- The **subject** is the thing being described.
- The **predicate** (also called a *property*) is the relationship or attribute.
- The **object** is either another thing — which makes the data a *graph* — or a plain value like a name, number or date, called a **literal**.

Chain triples together and they form a network: the object of one statement is the subject of the next. Maria → *holds* → Mechatronics degree → *certifies* → PLC programming ← *requires* ← Automation Technician job. Following those arrows is how a computer can discover that Maria is a strong candidate for that job, without anyone writing code specifically for that question.

<details class="hood">
<summary>The formal model</summary>

An RDF graph is a *set* of triples ⟨s, p, o⟩ where s ∈ IRI ∪ BlankNode, p ∈ IRI, and o ∈ IRI ∪ BlankNode ∪ Literal ([RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/)). Because it is a set, duplicates collapse and order is meaningless — merging two graphs is set union. A **dataset** adds *named graphs*: a quad ⟨s, p, o, g⟩ records which graph a triple belongs to, which is how this page keeps track of *who published what*.

Predicates are always IRIs, so properties are first-class resources: you can make statements *about* `schema:skills` itself (its label, its domain, its inverse). RDF 1.2, now moving through the W3C process, adds *triple terms* so a statement can also be the object of another statement — useful for attaching confidence or provenance to an individual claim.

</details>

<p class="eyebrow">3 · Names</p>

## Names that work everywhere

The trick that makes RDF work across organizations is how things are named. Instead of local IDs like `skill_042` or `PLC-1` — which mean something only inside one database — RDF names things with **IRIs**: web-style addresses that are globally unique because they're rooted in a domain someone controls.

```js
display(html`<div class="iri-anatomy" aria-label="Anatomy of an IRI">
  <span style="border-color:var(--ink-3)" data-label="scheme">https://</span>
  <span style="border-color:var(--c-org)" data-label="authority">skills.riverbend.example</span>
  <span style="border-color:var(--c-program)" data-label="path">/skill/</span>
  <span style="border-color:var(--c-skill)" data-label="local name">plc-programming</span>
</div>
<p class="small muted" style="margin-top:4px">The <b>authority</b> is the domain controlled by whoever mints the name. Write it short with a <b>prefix</b>: declare <code>sk:</code> = <code>https://skills.riverbend.example/skill/</code> and the IRI becomes <code>sk:plc-programming</code>.</p>`);
```

Because the Riverbend Workforce Board controls `skills.riverbend.example`, nobody else will accidentally mint the same name for something different. And because it looks like a web address, it can *be* one: visit it and you could get back a description of the skill — its label, its synonyms, its broader category. Data that describes itself this way is called **Linked Data**.

The same discipline applies to the *predicates*. Rather than every organization inventing a column called `skills_req`, they reuse properties from shared **vocabularies**: [schema.org](https://schema.org) (used by search engines to read job postings), [SKOS](https://www.w3.org/TR/skos-reference/) (for taxonomies of concepts like skills), and [CTDL](https://credreg.net/ctdl/handbook) (for describing credentials). We'll come back to those.

<div class="grid grid-cols-3">
  <div class="card">
    <div class="figure-title"><span style="color:var(--c-skill)">●</span> IRIs name things</div>
    <p class="small"><code>sk:python</code>, <code>wallet:maria</code>, <code>schema:JobPosting</code> — people, jobs, skills, and even types and properties.</p>
  </div>
  <div class="card">
    <div class="figure-title"><span style="color:var(--c-literal)">▭</span> Literals are values</div>
    <p class="small"><code>"Maria Alvarez"</code>, <code>68000</code>, <code>"2026-09-14"^^xsd:date</code>, <code>"Data Analysis"@en</code> — with an optional datatype or language tag.</p>
  </div>
  <div class="card">
    <div class="figure-title"><span style="color:var(--c-other)">○</span> Blank nodes are anonymous</div>
    <p class="small">Things that matter only in context — like “a salary range of 60–75k” — can be nodes without a global name: <code>_:b0</code>.</p>
  </div>
</div>

<details class="hood">
<summary>IRIs, URLs, and identifier strategy</summary>

An IRI is a Unicode-capable URI ([RFC 3987](https://www.rfc-editor.org/rfc/rfc3987)). It does not *have* to resolve, but following the [Linked Data principles](https://www.w3.org/DesignIssues/LinkedData.html) — use HTTP IRIs, make them dereferenceable, return useful RDF via content negotiation (`Accept: text/turtle` or `application/ld+json`), and link to other IRIs — makes data self-documenting.

Practical rules: mint IRIs under a domain you will control for decades; never put mutable facts (names, versions, status) in the path; prefer opaque or slug identifiers (`/skill/plc-programming`, or CTDL-style `ce-<uuid>` CTIDs); version *documents*, not *identities*. Reuse an existing IRI for a thing rather than minting your own whenever one exists — that reuse is what produces network effects. When two IRIs denote the same thing, link them with `owl:sameAs` (strong, logical identity) or `skos:exactMatch` (safer for concepts across schemes).

</details>

<p class="eyebrow">4 · The superpower</p>

## Graphs merge themselves

Here's what makes RDF different from a spreadsheet or a typical database. Below are three datasets published *independently*: Acme Robotics' job postings, Riverbend Community College's catalog, and Maria's personal record from her digital wallet. Nobody coordinated a schema. They only agreed to use the same vocabularies and the regional skills framework.

Merging RDF requires no joins, no mapping tables, no ETL — you simply pour the triples together. Wherever two datasets used the **same IRI**, the nodes become one, and new paths appear.

```js
const mergeMode = view(seg([
  {value: "separate", label: "① Three separate datasets"},
  {value: "merged", label: "② Pour them together"}
], {label: "Merge mode"}));
```

```js
const merge = mergeViz({
    quads: allQuads,
    index,
    width: width - 42,
    invalidation,
    panels: [
      {graph: PREFIXES.acme + "graph", title: "Acme Robotics", subtitle: "jobs.acme-robotics.example"},
      {graph: PREFIXES.rcc + "graph", title: "Riverbend Community College", subtitle: "catalog.riverbend-cc.example"},
      {graph: "https://wallet.example/maria-graph", title: "Maria’s wallet", subtitle: "wallet.example/maria"}
    ]
  });
```

```js
const mergeStats = merge.render?.(mergeMode);
```

```js
display(html`<div class="card">
  ${kindLegend(["person", "org", "job", "program", "credential", "skill"])}
  ${merge}
  <div class="stats">
    <div class="stat"><b>${mergeStats?.nodes}</b><span>distinct nodes on screen</span></div>
    <div class="stat"><b>${mergeStats?.links}</b><span>links</span></div>
    <div class="stat"><b>${mergeStats?.jobsReachable}</b><span>Acme jobs reachable from Maria</span></div>
    <div class="stat"><b>${mergeStats?.sharedSkills}</b><span>skills connecting her to them</span></div>
  </div>
  <p class="small muted" style="margin:.5rem 0 0">Dashed rings mark skill IRIs that appear in more than one dataset. Hover any node to see its IRI. Drag to rearrange.</p>
</div>`);
```

Before the merge, Maria's wallet only knows she holds a credential. The college knows what that credential certifies. Acme knows what its jobs require. *None of them alone* can say Maria is qualified. After the merge, the path Maria → credential → skills → job simply exists in the data.

This is the core idea behind every labor-market argument later in this guide: **interoperability as a side effect of naming**, rather than as a project.

<details class="hood">
<summary>Why merging is safe — and where it isn't</summary>

Merging is safe because RDF has no notion of a "row" that two sources might disagree on: every fact stands alone, and identical triples deduplicate. Two things to design for:

1. **Blank nodes don't merge.** `_:b0` in one file is unrelated to `_:b0` in another; implementations rename them apart. Give anything you want others to link to a real IRI.
2. **Contradictions coexist.** If two publishers state different salaries for the same job, both triples are kept. RDF uses the *open-world assumption*: absence of a fact isn't a denial, and nothing enforces a single value. Keep each publisher's triples in their own **named graph** (as this page does) so consumers can filter by source, trust level or date — and use validation (SHACL) where you need closed-world guarantees.

</details>

<p class="eyebrow">5 · Syntax</p>

## One graph, many ways to write it down

RDF is a *data model*, not a file format. The same graph can be written in several standard syntaxes, and any compliant tool can read all of them. **Turtle** is the friendliest for humans; **JSON-LD** looks like ordinary JSON, which is why websites and APIs love it; **N-Triples** is one-fact-per-line, ideal for streaming and bulk loads; **RDF/XML** is the original 1999 format, still common in older systems.

Edit the Turtle on the left. The graph and every other syntax update as you type — parsed by a real RDF engine running in your browser.

```js
const DEFAULT_TTL = `@prefix schema: <https://schema.org/> .
@prefix sk:     <https://skills.riverbend.example/skill/> .
@prefix ex:     <https://example.org/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .

ex:job-42 a schema:JobPosting ;
    schema:title "Wind Turbine Technician"@en ;
    schema:hiringOrganization ex:gale-energy ;
    schema:baseSalary 61000 ;
    schema:datePosted "2026-09-28"^^xsd:date ;
    schema:skills sk:electrical-safety,
                  sk:hydraulics-pneumatics,
                  sk:troubleshooting .

ex:gale-energy a schema:Organization ;
    schema:name "Gale Energy Cooperative" .

# Try it: add another skill above, e.g.  sk:sensors-instrumentation
# or describe a new person:
# ex:ana a schema:Person ; schema:name "Ana Ruiz" ; schema:knowsAbout sk:troubleshooting .
`;
const editor = html`<textarea class="editor" rows="22" spellcheck="false" aria-label="Turtle editor">${DEFAULT_TTL}</textarea>`;
editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const {selectionStart: s, selectionEnd: t} = editor;
    editor.setRangeText("  ", s, t, "end");
    editor.dispatchEvent(new Event("input"));
  }
});
const ttl = Generators.input(editor);
```

```js
const parsed = (() => {
  try {
    const s = new oxigraph.Store();
    s.load(ttl, {format: "text/turtle", base_iri: "https://example.org/"});
    const quads = plainQuads(s.match());
    return {
      ok: true,
      quads,
      ntriples: toNTriples(quads),
      rdfxml: s.dump({format: "application/rdf+xml", from_graph_name: oxigraph.defaultGraph()})
    };
  } catch (error) {
    return {ok: false, error: String(error.message ?? error)};
  }
})();
```

```js
const playgroundPositions = new Map();
const sparqlPositions = new Map();
```

```js
const syntax = view(seg(["Turtle", "JSON-LD", "N-Triples", "RDF/XML"], {label: "Syntax"}));
```

<div class="grid grid-cols-2" style="align-items:start">
<div>

```js
display(editor);
```

```js
display(
  parsed.ok
    ? html`<div class="small"><span class="status-ok">✓ Valid Turtle</span> <span class="muted">— ${parsed.quads.length} triples</span></div>`
    : html`<div class="errbox">✗ ${parsed.error}</div>`
);
```

</div>
<div>

```js
display(
  html`<div class="card" style="margin-top:0;padding:10px 12px">
    ${resize((w) =>
      forceGraph({
        ...quadsToGraph(parsed.ok ? parsed.quads : [], {literals: "nodes", index}),
        width: w,
        height: 430,
        positions: playgroundPositions,
        distance: 92,
        charge: -560,
        gravity: 0.045,
        invalidation
      })
    )}
  </div>`
);
```

```js
const serialized = !parsed.ok
  ? "— fix the Turtle to see other syntaxes —"
  : syntax === "Turtle"
  ? toTurtle(parsed.quads)
  : syntax === "JSON-LD"
  ? toJSONLD(parsed.quads)
  : syntax === "N-Triples"
  ? parsed.ntriples
  : parsed.rdfxml;
display(html`<pre style="max-height:300px;font-size:11.5px;margin:0">${serialized}</pre>`);
```

</div>
</div>

Notice how the JSON-LD version is just JSON with an `@context` that maps short keys to full IRIs. That's the on-ramp for most real systems: an existing REST API can become Linked Data by adding a context, without changing the shape of its payloads. It's also how [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/) credentials and [schema.org job postings](https://developers.google.com/search/docs/appearance/structured-data/job-posting) are published today.

<details class="hood">
<summary>Choosing a serialization</summary>

| Syntax | Media type | Use it for |
|---|---|---|
| Turtle / TriG | `text/turtle`, `application/trig` | Hand-authored data, vocabularies, test fixtures, docs. TriG adds named graphs. |
| JSON-LD 1.1 | `application/ld+json` | Web APIs, embedding in HTML, Verifiable Credentials. Supports framing & compaction. |
| N-Triples / N-Quads | `application/n-triples`, `application/n-quads` | Bulk load, streaming, diff-friendly dumps, line-oriented tooling (`sort`, `grep`, `split`). |
| RDF/XML | `application/rdf+xml` | Legacy interchange and ontology tooling. Avoid for new work. |

Watch JSON-LD's processing model: compaction and expansion depend on the `@context`, which is often fetched remotely. Pin and cache contexts (or embed them) in production, both for performance and so a third party can't change the meaning of your documents. For signed credentials this is mandatory practice.

</details>

<p class="eyebrow">6 · Vocabularies</p>

## Shared vocabularies: agreeing on the words

IRIs give us unambiguous names; **vocabularies** (also called *ontologies* when they include formal rules) give us a shared set of types and properties to use with them. RDF itself defines almost none — it deliberately leaves meaning to communities. In education and workforce data, several already exist and are in production use.

```js
const VOCABS = [
  {name: "schema.org", by: "Google, Microsoft, Yahoo, Yandex + community", what: "General-purpose web vocabulary. JobPosting, Occupation, EducationalOccupationalProgram, EducationalOccupationalCredential.", native: "RDF vocabulary; published as JSON-LD", role: "Job postings & program pages on the open web", color: "var(--c-job)"},
  {name: "CTDL", by: "Credential Engine", what: "Credential Transparency Description Language: credentials, providers, competencies, pathways, costs, outcomes. Powers the public Credential Registry.", native: "RDF vocabulary; JSON-LD in the registry", role: "Describing credentials & programs", color: "var(--c-program)"},
  {name: "Open Badges 3.0 / CLR 2.0", by: "1EdTech", what: "Digital badges and Comprehensive Learner Records, expressed as W3C Verifiable Credentials with alignments to competency frameworks.", native: "JSON-LD", role: "Portable, signed achievements", color: "var(--c-credential)"},
  {name: "W3C Verifiable Credentials 2.0", by: "W3C", what: "A standard data model for cryptographically verifiable claims — the trust layer under badges, diplomas and licenses.", native: "JSON-LD", role: "Tamper-evident claims", color: "var(--c-credential)"},
  {name: "SKOS", by: "W3C", what: "Simple Knowledge Organization System: concept schemes, preferred & alternate labels, broader/narrower, and cross-scheme mappings (exactMatch, closeMatch).", native: "RDF vocabulary", role: "Skill & occupation taxonomies", color: "var(--c-skill)"},
  {name: "ESCO", by: "European Commission", what: "European Skills, Competences, Qualifications and Occupations — roughly 3,000 occupations and 13,900+ skills in many EU languages.", native: "Linked open data (SKOS)", role: "A multilingual skill & occupation backbone", color: "var(--c-skill)"},
  {name: "O*NET & SOC", by: "U.S. Department of Labor", what: "Occupational descriptors for nearly a thousand U.S. occupations: tasks, skills, knowledge, technology. Distributed as tables and APIs.", native: "Not RDF natively — easily mapped into SKOS", role: "U.S. occupational reference", color: "var(--c-org)"},
  {name: "Rich Skill Descriptors", by: "Open Skills Network", what: "Machine-readable, individually addressable skill statements with stable identifiers and alignments.", native: "JSON-LD", role: "Shareable skill definitions", color: "var(--c-skill)"}
];
```

```js
display(html`<div class="grid grid-cols-2">${VOCABS.map((v) => html`<div class="card" style="margin:0;border-top:3px solid ${v.color}">
  <div class="figure-title" style="font-family:var(--font-display);font-size:1.15rem">${v.name}</div>
  <div class="figure-sub">${v.by}</div>
  <p class="small" style="margin:.2rem 0 .6rem">${v.what}</p>
  <div><span class="skill-pill">${v.native}</span><span class="skill-pill">${v.role}</span></div>
</div>`)}</div>`);
```

Vocabularies are designed to be mixed. In our example dataset a single credential is typed as both `schema:EducationalOccupationalCredential` (so a search engine understands it) and `ceterms:AssociateDegree` (so the Credential Registry does). A job posting uses schema.org for its structure and the regional framework's SKOS concepts for its skills. Nobody has to choose one standard to rule them all.

And when two frameworks describe the same skill differently — say, a regional framework and ESCO — SKOS lets someone publish a **crosswalk** as more triples: `sk:plc-programming skos:closeMatch <an ESCO skill IRI>`. Mappings become shared, reusable data instead of private spreadsheets.

<details class="hood">
<summary>RDFS, OWL, SKOS — how much semantics do you need?</summary>

- **RDFS** gives you classes, subclasses, property domains and ranges. Entailment is lightweight (e.g. infer `rdf:type` from `rdfs:domain`).
- **OWL 2** adds description-logic expressivity: equivalence, cardinality, disjointness, transitive/inverse properties. Powerful for reasoning, expensive and easy to misuse; most data-integration projects use a small profile (OWL 2 RL/QL) or none at all.
- **SKOS** intentionally *avoids* formal semantics: `skos:broader` is not `rdfs:subClassOf`. That's exactly right for skill taxonomies, where "Python" being under "Programming" is an organizing choice, not a logical axiom.

A practical stack for workforce data: schema.org + CTDL for entities, SKOS for frameworks, VCs for trust, SHACL for validation — and OWL only where a specific inference earns its keep.

</details>

<p class="eyebrow">7 · Asking questions</p>

## SPARQL: one query across everyone's data

Once data is in a graph, you ask questions with **SPARQL**, the W3C query language for RDF. A SPARQL query is a *pattern* of triples with blanks (variables starting with `?`); the engine finds every way the pattern fits the data. Because the merged dataset includes every publisher, a single query can span employers, colleges, apprenticeship programs and workers.

Pick a question — or edit the query and invent your own. Results highlight in the graph.

```js
const PFX = sparqlPrefixes(["schema", "skos", "sk", "acme", "wallet"]);
const QUERIES = [
  {
    label: "Which jobs fit Maria?",
    note: "Follows Maria → her credential → the skills it certifies, plus skills she reports herself, and compares them to every posting.",
    q: `SELECT ?job ?title (COUNT(DISTINCT ?req) AS ?required) (COUNT(DISTINCT ?have) AS ?maria_has)
WHERE {
  ?job a schema:JobPosting ;
       schema:title ?title ;
       schema:skills ?req .
  OPTIONAL {
    { wallet:maria schema:hasCredential/schema:competencyRequired ?req }
    UNION
    { wallet:maria schema:knowsAbout ?req }
    BIND(?req AS ?have)
  }
}
GROUP BY ?job ?title
ORDER BY DESC(?maria_has)`
  },
  {
    label: "Close Maria’s gaps",
    note: "Skills the Data Technician job needs that Maria can't yet show — and which local programs teach them.",
    q: `SELECT ?gap ?skill ?program ?programName
WHERE {
  acme:job-data-technician schema:skills ?gap .
  FILTER NOT EXISTS { wallet:maria schema:hasCredential/schema:competencyRequired ?gap }
  FILTER NOT EXISTS { wallet:maria schema:knowsAbout ?gap }
  ?gap skos:prefLabel ?skill .
  OPTIONAL { ?program schema:teaches ?gap ; schema:name ?programName . }
}`
  },
  {
    label: "In-demand skills",
    note: "Counts how many job postings, across all employers, ask for each skill.",
    q: `SELECT ?skill ?name (COUNT(DISTINCT ?job) AS ?postings)
WHERE {
  ?job a schema:JobPosting ;
       schema:skills ?skill .
  ?skill skos:prefLabel ?name .
}
GROUP BY ?skill ?name
ORDER BY DESC(?postings) ?name`
  },
  {
    label: "Demand nobody teaches",
    note: "A signal for educators: skills employers request that no program in the region teaches.",
    q: `SELECT ?skill ?name (COUNT(DISTINCT ?job) AS ?postings)
WHERE {
  ?job a schema:JobPosting ; schema:skills ?skill .
  ?skill skos:prefLabel ?name .
  FILTER NOT EXISTS { ?program schema:teaches ?skill }
}
GROUP BY ?skill ?name`
  },
  {
    label: "Apprenticeship → jobs",
    note: "Which jobs does the Journeyworker certificate prepare someone for, and how completely?",
    q: `SELECT ?job ?title (COUNT(DISTINCT ?s) AS ?skills_covered)
WHERE {
  <https://apprentice.midstate-electrical.example/credential-journeyworker>
      schema:competencyRequired ?s .
  ?job schema:skills ?s ;
       schema:title ?title .
}
GROUP BY ?job ?title
ORDER BY DESC(?skills_covered)`
  },
  {
    label: "Skill hierarchy",
    note: "Property paths: every skill anywhere beneath “Industrial Automation” (skos:broader, one or more hops).",
    q: `SELECT ?skill ?name
WHERE {
  ?skill skos:broader+ sk:industrial-automation ;
         skos:prefLabel ?name .
}
ORDER BY ?name`
  },
  {
    label: "Who published what?",
    note: "Every triple remembers its source graph — provenance for free.",
    q: `SELECT ?graph (COUNT(*) AS ?triples)
WHERE {
  GRAPH ?graph { ?s ?p ?o }
}
GROUP BY ?graph
ORDER BY DESC(?triples)`
  }
];
```

```js
const preset = view(seg(QUERIES.map((d, i) => ({value: i, label: d.label})), {label: "Example queries"}));
```

```js
const qEditor = html`<textarea class="editor" rows="15" spellcheck="false" aria-label="SPARQL editor">${QUERIES[preset].q}</textarea>`;
const queryText = Generators.input(qEditor);
```

```js
const result = (() => {
  try {
    const t0 = performance.now();
    const r = select(store, PFX + "\n" + queryText);
    return {ok: true, ...r, ms: performance.now() - t0};
  } catch (error) {
    return {ok: false, error: String(error.message ?? error)};
  }
})();
const boundIris = new Set(
  result.ok ? result.rows.flatMap((r) => Object.values(r).filter((t) => t?.termType === "NamedNode").map((t) => t.value)) : []
);
const showTerm = (t) => (t == null ? "" : t.termType === "Literal" ? t.value : compact(t.value));
```

<div class="grid grid-cols-2" style="align-items:start">
<div>

```js
display(html`<p class="small muted" style="margin:0 0 6px">${QUERIES[preset].note}</p>`);
```

```js
display(qEditor);
```

```js
display(html`<details class="small muted" style="margin-top:4px"><summary>Prefixes added automatically</summary><pre style="font-size:11px">${PFX}</pre></details>`);
```

</div>
<div>

```js
display(
  result.ok
    ? html`<div class="small" style="margin-bottom:6px"><span class="status-ok">✓ ${result.rows.length} result${result.rows.length === 1 ? "" : "s"}</span> <span class="muted">in ${result.ms.toFixed(1)} ms</span></div>`
    : html`<div class="errbox">✗ ${result.error}</div>`
);
```

```js
if (result.ok && result.rows.length)
  display(
    Inputs.table(
      result.rows.map((r) => Object.fromEntries(result.vars.map((v) => [v, showTerm(r[v])]))),
      {columns: result.vars, rows: 9, layout: "auto", select: false}
    )
  );
```

```js
// If the result is a label + a count, draw it.
const numericVar = result.ok && result.rows.length > 1 ? result.vars.findLast((v) => result.rows.every((r) => r[v]?.termType === "Literal" && /integer|decimal|double/.test(r[v].datatype?.value ?? ""))) : null;
const labelVar = numericVar ? result.vars.find((v) => v !== numericVar && result.rows.every((r) => r[v]?.termType === "Literal")) ?? result.vars.find((v) => v !== numericVar) : null;
if (numericVar && labelVar)
  display(resize((w) =>
    Plot.plot({
      width: w,
      height: Math.max(120, result.rows.length * 24 + 30),
      marginLeft: Math.min(200, w * 0.45),
      marginRight: 30,
      x: {label: numericVar + " →", grid: true},
      y: {label: null},
      style: {fontFamily: "var(--font-body)", fontSize: "11px"},
      marks: [
        Plot.barX(result.rows.map((r) => ({label: showTerm(r[labelVar]), value: +r[numericVar].value})), {
          x: "value",
          y: "label",
          sort: {y: "-x"},
          fill: "var(--accent)",
          rx: 3,
          insetTop: 2,
          insetBottom: 2,
          tip: true
        }),
        Plot.text(result.rows.map((r) => ({label: showTerm(r[labelVar]), value: +r[numericVar].value})), {x: "value", y: "label", text: "value", dx: 10, fill: "var(--ink-2)"}),
        Plot.ruleX([0])
      ]
    })
  ));
```

</div>
</div>

```js
const SKIP_IN_OVERVIEW = new Set([PREFIXES.skos + "inScheme", PREFIXES.schema + "recognizedBy", PREFIXES.schema + "publisher"]);
const overviewAll = quadsToGraph(allQuads.filter((q) => !SKIP_IN_OVERVIEW.has(q.predicate.value) && q.subject.value !== PREFIXES.sk + "framework"), {literals: "hide"});
const linked = new Set(overviewAll.links.flatMap((l) => [l.source, l.target]));
const overview = {nodes: overviewAll.nodes.filter((n) => linked.has(n.id)), links: overviewAll.links};
display(html`<div class="card">
  <div class="figure-title">The whole regional graph</div>
  <div class="figure-sub">${boundIris.size ? `${[...boundIris].filter((i) => overview.nodes.some((n) => n.id === i)).length} resources bound by the query are highlighted.` : "Nothing in this result is a node in the graph — try another query."}</div>
  ${kindLegend()}
  ${resize((w) =>
    forceGraph({
      ...overview,
      width: w,
      height: w < 640 ? 520 : 600,
      highlight: boundIris.size ? new Set([...boundIris].filter((i) => overview.nodes.some((n) => n.id === i))) : null,
      positions: sparqlPositions,
      charge: -420,
      distance: 70,
      gravity: 0.035,
      edgeLabels: false,
      invalidation
    })
  )}
</div>`);
```

<details class="hood">
<summary>SPARQL in production</summary>

What you just ran is full [SPARQL 1.1](https://www.w3.org/TR/sparql11-query/) — joins, `OPTIONAL`, `UNION`, `FILTER NOT EXISTS`, aggregates, property paths (`skos:broader+`), and `GRAPH` for named graphs — executed by [Oxigraph](https://github.com/oxigraph/oxigraph) compiled to WebAssembly. The same queries run unchanged on Apache Jena Fuseki, GraphDB, Stardog, Virtuoso, Amazon Neptune, RDF4J, QLever and others.

Beyond `SELECT`: `CONSTRUCT` returns a new graph (ideal for producing API payloads or reshaping data into another vocabulary), `ASK` returns a boolean, and SPARQL Update (`INSERT`/`DELETE`) modifies data. The `SERVICE` keyword federates a query across remote endpoints — e.g. joining a local job feed with ESCO or Wikidata live. Federation is powerful but latency-bound; for production workloads, replicate the data you depend on and query locally.

</details>

<p class="eyebrow">8 · Why it matters</p>

## Why this matters for the labor market

Labor economists describe markets with **frictions**: costs and delays that keep willing workers and willing employers apart even when the jobs and the skills both exist. Some frictions are physical — geography, childcare, transportation. But a striking share are *informational*:

- Employers can't easily tell what a credential certifies, so they fall back on proxies like degree requirements.
- Workers can't easily prove skills they learned on the job, in the military, or in an apprenticeship.
- Colleges and apprenticeship sponsors learn what employers need through advisory boards that meet once or twice a year.
- Every system — applicant tracking, student information, learning management, state workforce databases — describes skills in its own codes, so connecting any two of them is a custom project.

The U.S. alone has more than a million distinct credentials on offer — degrees, certificates, licenses, badges, apprenticeships ([Credential Engine](https://credentialengine.org/), 2022). No human can keep that landscape in their head. Software could, *if* the data were described in a shared, machine-readable way. That is the opening for RDF.

### The integration explosion

Without shared semantics, every pair of organizations that wants to exchange data needs its own mapping. That cost grows with the *square* of the number of participants. With shared vocabularies and identifiers, each participant maps once — to the commons — and can exchange data with everyone else.

```js
const nOrgs = view(Inputs.range([2, 40], {label: "Organizations in the ecosystem", step: 1, value: 12}));
```

```js
const p2p = (nOrgs * (nOrgs - 1)) / 2;
const curve = d3.range(2, 41).flatMap((n) => [
  {n, integrations: (n * (n - 1)) / 2, approach: "Point-to-point mappings"},
  {n, integrations: n, approach: "Shared vocabulary (RDF)"}
]);
display(html`<div class="card">
  <div class="grid grid-cols-3" style="align-items:center">
    <div style="text-align:center">
      ${networkMini(nOrgs, "p2p", {size: 240})}
      <div class="stat" style="margin-top:6px"><b style="color:var(--bad)">${p2p.toLocaleString()}</b><span>custom integrations, point-to-point</span></div>
    </div>
    <div style="text-align:center">
      ${networkMini(nOrgs, "hub", {size: 240})}
      <div class="stat" style="margin-top:6px"><b style="color:var(--warn)">${nOrgs}</b><span>mappings to a shared vocabulary</span></div>
    </div>
    <div>
      ${resize((w) =>
        Plot.plot({
          width: w,
          height: 280,
          marginLeft: 46,
          x: {label: "Organizations →", domain: [2, 40]},
          y: {label: "↑ Integrations to build", grid: true},
          color: {domain: ["Point-to-point mappings", "Shared vocabulary (RDF)"], range: ["var(--bad)", "var(--c-skill)"], legend: true},
          style: {fontFamily: "var(--font-body)", fontSize: "11px"},
          marks: [
            Plot.ruleX([nOrgs], {stroke: "var(--ink-3)", strokeDasharray: "3 3"}),
            Plot.line(curve, {x: "n", y: "integrations", stroke: "approach", strokeWidth: 2}),
            Plot.dot(curve.filter((d) => d.n === nOrgs), {x: "n", y: "integrations", fill: "approach", r: 5, stroke: "var(--bg)", strokeWidth: 2}),
            Plot.ruleY([0]),
            Plot.tip(curve, Plot.pointerX({x: "n", y: "integrations", title: (d) => `${d.approach}\n${d.n} organizations → ${d.integrations.toLocaleString()} integrations`}))
          ]
        })
      )}
    </div>
  </div>
  <p class="small muted" style="margin:.4rem 0 0">Real ecosystems are never fully connected, but the shape holds: the value of exchange grows with every participant, and so does the cost — unless the cost is paid once, against a commons.</p>
</div>`);
```

### Closing the loop

Today, information mostly flows one way and slowly. Linked data lets it circulate: employer demand shapes programs, programs issue credentials that carry their skills, workers carry those credentials to employers, and hiring outcomes flow back to programs. Click a stage to see what data flows and which standards carry it.

```js
const stageSel = Mutable("demand");
const setStage = (id) => (stageSel.value = id);
```

```js
const stage = STAGES.find((s) => s.id === stageSel);
display(html`<div class="card">
  <div class="grid grid-cols-2" style="align-items:center">
    <div>${resize((w) => loopViz({width: w, selected: stageSel, onSelect: setStage, invalidation}))}</div>
    <div class="stage-detail">
      <div class="role" style="color:${stage.color}">Stage ${STAGES.indexOf(stage) + 1} · ${stage.actor}</div>
      <h4>${stage.title}</h4>
      <p class="small">${stage.flows}</p>
      <div>${stage.standards.map((s) => html`<span class="pill">${s}</span>`)}</div>
      <p class="small" style="margin-top:.8rem"><b>Friction removed:</b> ${stage.friction}</p>
      <pre style="font-size:11.5px">${stage.snippet}</pre>
      <div class="seg">${STAGES.map((s, i) => html`<button type="button" aria-pressed=${String(s.id === stageSel)} onclick=${() => setStage(s.id)}>${i + 1}</button>`)}</div>
    </div>
  </div>
</div>`);
```

### See the friction drop

Here is the difference, measured on the example region. Choose a worker. For each open job, the hollow dot shows how many of the job's required skills a **keyword matcher** finds by comparing the words each organization used; the solid dot shows the match when everyone links to the **shared skill IRIs**. Same people, same jobs, same skills — only the data changed.

```js
const worker = view(seg([
  {value: "https://wallet.example/maria", label: "Maria · Mechatronics AAS + Python"},
  {value: "https://wallet.example/jordan", label: "Jordan · Journeyworker electrician"},
  {value: "https://wallet.example/sam", label: "Sam · Retail lead, career changer"}
], {label: "Worker"}));
```

```js
const P = (local) => PREFIXES.schema + local;
const localName = (iri) => iri.slice(PREFIXES.sk.length);
const out = d3.group(allQuads, (q) => q.subject.value);
const objs = (s, p) => (out.get(s) ?? []).filter((q) => q.predicate.value === P(p)).map((q) => q.object.value);

function workerSkills(w) {
  // skill IRI → how the worker's evidence phrases it
  const skills = new Map();
  for (const cred of objs(w, "hasCredential"))
    for (const s of objs(cred, "competencyRequired")) skills.set(s, {phrase: PHRASING[sourceOf(cred)]?.[localName(s)] ?? index.label(s), via: index.label(cred)});
  for (const s of objs(w, "knowsAbout")) skills.set(s, {phrase: PHRASING[sourceOf(w)]?.[localName(s)] ?? index.label(s), via: "self-reported"});
  return skills;
}
const jobs = [...out.keys()].filter((s) => index.types(s).includes(P("JobPosting")));
const programs = [...out.keys()].filter((s) => index.types(s).includes(P("EducationalOccupationalProgram")));
const norm = (s) => s.toLowerCase().trim();

const ws = workerSkills(worker);
const wPhrases = new Set([...ws.values()].map((d) => norm(d.phrase)));
const matches = jobs.map((job) => {
  const req = objs(job, "skills");
  const emp = sourceOf(job);
  const keyword = req.filter((s) => wPhrases.has(norm(PHRASING[emp]?.[localName(s)] ?? "")));
  const linked = req.filter((s) => ws.has(s));
  const gaps = req.filter((s) => !ws.has(s));
  return {
    job,
    title: index.label(job),
    employer: index.label(objs(job, "hiringOrganization")[0]),
    salary: +(out.get(job).find((q) => q.predicate.value === P("baseSalary"))?.object.value ?? 0),
    required: req.length,
    req,
    keyword: keyword.length,
    linked: linked.length,
    gaps,
    kwPct: keyword.length / req.length,
    lkPct: linked.length / req.length
  };
}).sort((a, b) => b.lkPct - a.lkPct || b.salary - a.salary);
```

```js
const strong = (k) => matches.filter((m) => m[k] >= 0.8).length;
display(html`<div class="card">
  <div class="stats">
    <div class="stat"><b>${strong("kwPct")}</b><span>strong matches (≥ 80%) by keyword</span></div>
    <div class="stat"><b style="color:var(--accent)">${strong("lkPct")}</b><span>strong matches with linked skills</span></div>
    <div class="stat"><b>${d3.sum(matches, (m) => m.keyword)} → ${d3.sum(matches, (m) => m.linked)}</b><span>skill matches found across all jobs</span></div>
    <div class="stat"><b>${ws.size}</b><span>skills in ${index.label(worker).split(" ")[0]}’s record</span></div>
  </div>
  ${resize((w) =>
    Plot.plot({
      width: w,
      height: 60 + matches.length * 46,
      marginLeft: Math.min(230, w * 0.38),
      marginRight: 46,
      x: {domain: [0, 1], tickFormat: "%", label: "Share of the job’s required skills the worker can show →", grid: true},
      y: {domain: matches.map((m) => m.title), label: null, tickFormat: (t) => t},
      style: {fontFamily: "var(--font-body)", fontSize: "12px"},
      marks: [
        Plot.ruleX([0]),
        Plot.link(matches, {x1: "kwPct", x2: "lkPct", y1: "title", y2: "title", stroke: "var(--accent)", strokeOpacity: 0.35, strokeWidth: 6, strokeLinecap: "round"}),
        Plot.dot(matches, {x: "kwPct", y: "title", r: 6.5, stroke: "var(--ink-3)", strokeWidth: 2, fill: "var(--surface)"}),
        Plot.dot(matches, {x: "lkPct", y: "title", r: 7, fill: "var(--accent)", stroke: "var(--bg)", strokeWidth: 2}),
        Plot.text(matches, {x: "lkPct", y: "title", text: (m) => `${m.linked}/${m.required}`, dx: 14, textAnchor: "start", fill: "var(--ink)", fontWeight: 600}),
        Plot.text(matches, {x: 0, y: "title", text: (m) => `${m.employer} · $${(m.salary / 1000).toFixed(0)}k`, dy: 14, dx: 2, textAnchor: "start", fill: "var(--ink-3)", fontSize: 10}),
        Plot.tip(matches, Plot.pointerY({x: "lkPct", y: "title", title: (m) => `${m.title} — ${m.employer}\nKeyword match: ${m.keyword} of ${m.required}\nLinked-skill match: ${m.linked} of ${m.required}`}))
      ]
    })
  )}
  <div class="legend"><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--surface)" stroke="var(--ink-3)" stroke-width="2"/></svg>Keyword matching on each organization’s own wording</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--accent)"/></svg>Matching on shared skill IRIs</span></div>
</div>`);
```

```js
const focusJob = view(Inputs.select(matches, {label: "Look closer at", format: (m) => `${m.title} — ${m.employer}`, value: matches[0]}));
```

```js
const gapPrograms = (skill) => programs.filter((p) => objs(p, "teaches").includes(skill));
const pathways = d3.rollups(
  focusJob.gaps.flatMap((s) => gapPrograms(s).map((p) => ({p, s}))),
  (v) => v.map((d) => d.s),
  (d) => d.p
).sort((a, b) => b[1].length - a[1].length);
const duration = (p) => {
  const d = out.get(p).find((q) => q.predicate.value === P("timeToComplete"))?.object.value ?? "";
  const m = d.match(/P(\d+)([YMW])/);
  return m ? `${m[1]} ${{Y: "year", M: "month", W: "week"}[m[2]]}${m[1] === "1" ? "" : "s"}` : "";
};
const emp = sourceOf(focusJob.job);
display(html`<div class="card">
  <div>
    <div>
      <div class="figure-title">What ${focusJob.employer} asks for</div>
      <div class="figure-sub">The employer’s own wording → the shared skill it links to</div>
      <table class="nice">
        <thead><tr><th>Posting says</th><th>Linked skill</th><th>${index.label(worker).split(" ")[0]}’s evidence</th></tr></thead>
        <tbody>${focusJob.req.map((s) => {
          const have = ws.get(s);
          const kw = have && norm(have.phrase) === norm(PHRASING[emp]?.[localName(s)] ?? "");
          return html`<tr>
            <td>“${PHRASING[emp]?.[localName(s)] ?? "—"}”</td>
            <td><span class="skill-pill ${have ? "have" : "gap"}">${index.label(s)}</span></td>
            <td class="small">${have ? html`“${have.phrase}” <span class="muted">via ${have.via}</span>${kw ? "" : html`<br><span style="color:var(--accent);font-weight:600">found only via the shared IRI</span>`}` : html`<span class="muted">not yet</span>`}</td>
          </tr>`;
        })}</tbody>
      </table>
    </div>
    <div style="margin-top:1.4rem">
      <div class="figure-title">Pathways to close the gap</div>
      <div class="figure-sub">Programs in the region that teach the missing skills — found by following the same IRIs</div>
      ${focusJob.gaps.length === 0
        ? html`<p class="status-ok">✓ No gaps — ${index.label(worker).split(" ")[0]} can already show every skill this job requires.</p>`
        : pathways.length === 0
        ? html`<p class="small">No program in the region teaches ${focusJob.gaps.map((s) => index.label(s)).join(", ")}. <b>That itself is a useful signal</b> for colleges and the workforce board.</p>`
        : html`${pathways.map(([p, skills]) => html`<div class="card" style="margin:.5rem 0;padding:12px 14px;border-left:4px solid var(--c-program)">
            <div style="font-weight:600">${index.label(p)}</div>
            <div class="small muted">${index.label(objs(p, "provider")[0])} · ${duration(p)}</div>
            <div style="margin-top:6px">${skills.map((s) => html`<span class="skill-pill have">${index.label(s)}</span>`)}</div>
          </div>`)}
          ${focusJob.gaps.filter((s) => gapPrograms(s).length === 0).length
            ? html`<p class="small muted">Not taught anywhere in the region: ${focusJob.gaps.filter((s) => gapPrograms(s).length === 0).map((s) => index.label(s)).join(", ")}.</p>`
            : ""}`}
    </div>
  </div>
</div>`);
```

Keyword matching isn't a straw man — it's roughly what happens when systems exchange free text. Modern tools add fuzzy matching and machine learning on top, which helps, but produces *probabilistic* guesses that are hard to explain to a worker who was screened out. Linked data doesn't replace those tools; it gives them a ground truth. An AI model can *suggest* that “Ladder logic” means `sk:plc-programming`, a human can confirm it, and the confirmed mapping is published once, as a triple, for everyone.

### Friction by friction

<div class="wide">

| Friction | What it looks like today | What linked data changes | Building blocks |
|---|---|---|---|
| **Search costs** | Postings and résumés use idiosyncratic language; matching relies on keywords. | Skills referenced by IRI are comparable across every job board, ATS and wallet. | schema.org JobPosting, SKOS frameworks |
| **Credential opacity** | Employers can't tell what most of a million-plus credentials certify. | Credentials published with their competencies, provider, cost and outcomes in one shared vocabulary. | CTDL, Credential Registry |
| **Unverifiable skills** | Workers re-prove themselves; skills from apprenticeships, military service or work go unrecognized. | Signed credentials and employer attestations reference the same skill IRIs as degrees do. | Open Badges 3.0, CLR 2.0, VC 2.0 |
| **Proxy screening** | Degree requirements stand in for skills, excluding capable workers. | Skills-based hiring becomes operational when skill evidence is structured and verifiable. | Skill IRIs + VCs |
| **Slow curriculum feedback** | Programs learn about demand through annual advisory boards. | Demand and outcomes are queryable continuously, competency by competency. | SPARQL over named graphs |
| **Integration cost** | Each pair of systems needs a custom mapping. | Each system maps once to shared vocabularies — linear, not quadratic. | JSON-LD contexts, SKOS mappings |
| **Record portability** | Learning records are locked in institutional systems. | Workers hold their own records and share them selectively. | LER wallets, Verifiable Presentations |

</div>

<div class="callout">
<p><b>What RDF does not fix.</b> Shared identifiers are infrastructure, not a policy. Someone has to govern skill frameworks and keep them current; organizations need incentives to publish; workers need privacy, consent and control over their records; and any automated matching must be audited for bias. A skills graph also risks reducing people to checklists — the best systems use it to <i>widen</i> who gets considered, not to filter harder. The technology makes these choices possible to implement well; it doesn't make them for us.</p>
</div>

<p class="eyebrow">9 · Getting there</p>

## What adoption could look like

No region needs to replace its systems to start. The path is incremental, and each step pays for itself:

```js
const ROADMAP = [
  {step: "Publish", who: "Employers, colleges, sponsors", what: "Add schema.org / CTDL JSON-LD to pages and feeds you already produce: job postings, program pages, credential descriptions.", effort: "Days", color: "var(--c-org)"},
  {step: "Link", who: "Workforce boards, industry groups", what: "Adopt or publish a skills framework as SKOS with stable IRIs, and crosswalk it to ESCO, O*NET and employer vocabularies.", effort: "Months", color: "var(--c-skill)"},
  {step: "Verify", who: "Issuers & workers", what: "Issue credentials as Verifiable Credentials (Open Badges 3.0 / CLR 2.0) aligned to the framework; let workers hold them in wallets.", effort: "Quarters", color: "var(--c-credential)"},
  {step: "Close the loop", who: "Everyone", what: "Query the combined graph for demand, gaps and outcomes; feed the answers back into curricula, hiring and policy.", effort: "Ongoing", color: "var(--c-program)"}
];
display(html`<div class="grid grid-cols-4">${ROADMAP.map((r, i) => html`<div class="card" style="margin:0;border-top:4px solid ${r.color}">
  <div class="role">Step ${i + 1} · ${r.effort}</div>
  <div class="figure-title" style="font-family:var(--font-display);font-size:1.3rem;margin-top:4px">${r.step}</div>
  <div class="figure-sub">${r.who}</div>
  <p class="small" style="margin:0">${r.what}</p>
</div>`)}</div>`);
```

For architects and engineers who want to build it, the [**Engineer's field guide**](./engineering) covers reference architecture, identifier strategy, validation with SHACL, trust with Verifiable Credentials, storage and query options, and the trade-offs against relational and property-graph databases.

<p class="eyebrow">Reference</p>

## Glossary

<div class="wide">

| Term | In one line |
|---|---|
| **RDF** | Resource Description Framework — a W3C standard data model where every fact is a subject–predicate–object triple. |
| **Triple** | One statement: subject → predicate → object. |
| **IRI** | A globally unique, web-style identifier for a thing or a property. |
| **Literal** | A plain value — text, number, date — optionally with a datatype or language. |
| **Graph / dataset** | A set of triples. A dataset groups several *named graphs*, e.g. one per publisher. |
| **Vocabulary / ontology** | A shared set of types and properties (schema.org, CTDL, SKOS…). |
| **Turtle, JSON-LD, N-Triples** | Interchangeable text formats for writing RDF. |
| **SPARQL** | The W3C query language for RDF. |
| **SHACL** | The W3C language for validating RDF against shapes (required fields, value types). |
| **Linked Data** | Publishing RDF with dereferenceable IRIs that link to other data on the web. |
| **Verifiable Credential** | A W3C standard for tamper-evident, cryptographically signed claims. |
| **LER** | Learning and Employment Record — a portable, learner-held record of skills and achievements. |

</div>

## Further reading

<ul class="refs">
<li>W3C, <a href="https://www.w3.org/TR/rdf11-primer/">RDF 1.1 Primer</a> and <a href="https://www.w3.org/TR/rdf11-concepts/">RDF 1.1 Concepts and Abstract Syntax</a></li>
<li>W3C, <a href="https://www.w3.org/TR/sparql11-query/">SPARQL 1.1 Query Language</a> · <a href="https://www.w3.org/TR/json-ld11/">JSON-LD 1.1</a> · <a href="https://www.w3.org/TR/shacl/">SHACL</a> · <a href="https://www.w3.org/TR/skos-reference/">SKOS Reference</a></li>
<li>W3C, <a href="https://www.w3.org/TR/vc-data-model-2.0/">Verifiable Credentials Data Model 2.0</a></li>
<li>Tim Berners-Lee, <a href="https://www.w3.org/DesignIssues/LinkedData.html">Linked Data — Design Issues</a> (2006)</li>
<li>Credential Engine, <a href="https://credreg.net/ctdl/handbook">CTDL Handbook</a> and <a href="https://credentialengine.org/">Credential Registry</a></li>
<li>1EdTech, <a href="https://www.imsglobal.org/spec/ob/v3p0/">Open Badges 3.0</a> and <a href="https://www.imsglobal.org/spec/clr/v2p0/">Comprehensive Learner Record 2.0</a></li>
<li>European Commission, <a href="https://esco.ec.europa.eu/">ESCO</a> · U.S. Department of Labor, <a href="https://www.onetcenter.org/">O*NET</a> · Open Skills Network, <a href="https://www.openskillsnetwork.org/">Rich Skill Descriptors</a></li>
<li>schema.org, <a href="https://schema.org/JobPosting">JobPosting</a> · <a href="https://schema.org/EducationalOccupationalCredential">EducationalOccupationalCredential</a> · <a href="https://schema.org/EducationalOccupationalProgram">EducationalOccupationalProgram</a></li>
</ul>

<p class="small muted">All organizations, people and <code>.example</code> identifiers on this page are fictional. The example dataset is simplified for teaching; production systems would model skill alignments, evidence and provenance in more detail. View the full dataset: <a href="./data/ecosystem.trig" download>ecosystem.trig</a>.</p>
