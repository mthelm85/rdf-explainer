---
title: Engineer’s field guide
toc: true
---

```js
import * as d3 from "d3";
import * as Plot from "@observablehq/plot";
import * as Inputs from "@observablehq/inputs";
import {html} from "htl";
import {loadOxigraph, plainQuads, select} from "./components/store.js";
import {PREFIXES, compact, indexQuads, quadsToGraph, toNTriples, toTurtle, sparqlPrefixes} from "./components/rdf.js";
import {forceGraph, kindLegend} from "./components/forceGraph.js";
import {seg} from "./components/seg.js";
```

```js
const oxigraph = await loadOxigraph(await FileAttachment("lib/oxigraph/web_bg.wasm").url());
const trig = await FileAttachment("data/ecosystem.trig").text();
const store = new oxigraph.Store();
store.load(trig, {format: "application/trig"});
const allQuads = plainQuads(store.match());
const index = indexQuads(allQuads);
```

<p class="eyebrow" style="margin:2rem 0 -.4rem">For architects & engineers</p>

# The engineer’s field guide to RDF

<p class="lede">You've seen <a href="./">what RDF is and why it matters</a> for education and workforce data. This page is about building with it: where it fits in an architecture, how to get existing systems to speak it, how to keep the data trustworthy, and where the sharp edges are.</p>

<div class="callout">
<p><b>The one-paragraph version.</b> Treat RDF as the <i>interchange and integration</i> layer, not necessarily your system of record. Publish JSON-LD from the systems you already run, mint stable IRIs for anything others will reference, keep each source in its own named graph, validate at the boundary with SHACL, sign what needs to be trusted with Verifiable Credentials, and serve both SPARQL (for analysts and partners) and plain JSON-LD APIs (for app developers). Everything else is optimization.</p>
</div>

## Reference architecture

A regional or sector-wide skills data infrastructure has the same shape whether it serves ten organizations or ten thousand. Select any component for details.

```js
const ARCH = [
  {lane: "Sources", color: "var(--c-org)", items: [
    {id: "ats", name: "Employer ATS / HRIS", detail: "Job requisitions, postings, role architectures, hires. Usually relational or SaaS APIs.", tech: ["Workday, Greenhouse… exports", "schema.org JobPosting feeds", "HR Open Standards JSON"], watch: "Postings are free text; skills arrive as strings. Plan for reconciliation."},
    {id: "sis", name: "College SIS / LMS / catalog", detail: "Programs, courses, learning outcomes, completions, transcripts.", tech: ["Catalog CMS", "1EdTech CASE frameworks", "CTDL publishing to the Credential Registry"], watch: "Learning outcomes are written for accreditors, not employers. Map at the competency level."},
    {id: "appr", name: "Apprenticeship systems", detail: "Registered apprenticeship standards, work processes, related technical instruction, journeyworker completions.", tech: ["Program sponsor systems", "Standards documents (PDF → structured)"], watch: "Competency-based standards map cleanly; time-based ones need work-process → skill mapping."},
    {id: "wallet", name: "Learner wallets", detail: "Worker-held credentials and attestations — the worker decides what to share.", tech: ["Open Badges 3.0 / CLR 2.0", "VC 2.0 Verifiable Presentations"], watch: "Data arrives signed and minimal-by-design. Never assume you can pull more than was presented."},
    {id: "ref", name: "Reference frameworks", detail: "Shared skill and occupation taxonomies everyone links to.", tech: ["ESCO (SKOS)", "O*NET / SOC", "Rich Skill Descriptors", "Regional frameworks"], watch: "Frameworks version. Pin versions in your graphs and publish crosswalks as data."}
  ]},
  {lane: "Lift", color: "var(--c-skill)", items: [
    {id: "ctx", name: "JSON-LD contexts", detail: "Turn existing JSON payloads into RDF by mapping keys to vocabulary IRIs. Zero change to payload shape.", tech: ["JSON-LD 1.1 @context", "Scoped & protected contexts"], watch: "Pin and cache contexts. A remotely fetched context that changes silently changes your data's meaning."},
    {id: "rml", name: "Declarative mappings", detail: "Map relational tables and CSV to RDF without bespoke code.", tech: ["W3C R2RML", "RML / YARRRML", "Ontop (virtual graphs)"], watch: "Keep mappings in version control and test them like code; they are your data contract."},
    {id: "recon", name: "Reconciliation", detail: "Link free-text skills, titles and orgs to IRIs. ML proposes, humans confirm, results are published as SKOS mappings.", tech: ["skos:exactMatch / closeMatch", "Embedding search", "OpenRefine reconciliation API"], watch: "Record confidence and who confirmed. A mapping is a claim — give it provenance."}
  ]},
  {lane: "Gate", color: "var(--c-credential)", items: [
    {id: "shacl", name: "SHACL validation", detail: "Closed-world checks at the boundary: required properties, datatypes, value types, cardinalities, IRI patterns.", tech: ["pySHACL", "Jena SHACL", "TopBraid", "rdf-validate-shacl (JS)"], watch: "RDF is open-world; your consumers aren't. Shapes are where you encode what they can rely on."},
    {id: "vc", name: "Credential verification", detail: "Check signatures, issuer identity, status (revocation) and validity windows before trusting a claim.", tech: ["VC Data Integrity (eddsa-rdfc-2022)", "VC-JOSE-COSE", "Bitstring Status List", "DIDs / did:web"], watch: "Verification proves who said it, not that it's true. Keep issuer trust policies explicit."}
  ]},
  {lane: "Store", color: "var(--c-program)", items: [
    {id: "quad", name: "Quad store", detail: "One named graph per source (and per load) so every triple carries provenance and can be replaced atomically.", tech: ["Oxigraph", "Apache Jena TDB2/Fuseki", "RDF4J", "GraphDB", "Stardog", "Virtuoso", "Amazon Neptune", "QLever"], watch: "Replace-graph loads (DROP + INSERT, or graph-store PUT) beat diffing triples for source syncs."},
    {id: "idx", name: "Search & vector index", detail: "Full-text and semantic search alongside the graph, keyed by IRI.", tech: ["OpenSearch / Elasticsearch", "Vector DB keyed by IRI", "Built-in Lucene in many stores"], watch: "Index derived documents (CONSTRUCT per entity); treat the graph as source of truth."}
  ]},
  {lane: "Serve", color: "var(--c-person)", items: [
    {id: "ld", name: "Dereferenceable IRIs", detail: "GET an IRI → a description. Content negotiation returns HTML for people, Turtle/JSON-LD for machines.", tech: ["303 / hash IRIs", "Accept: text/turtle, application/ld+json", "Link headers"], watch: "Cheap to do from day one, hard to retrofit. Decide your IRI scheme early."},
    {id: "sparql", name: "SPARQL endpoint", detail: "Ad-hoc and federated queries for analysts, researchers and partners.", tech: ["SPARQL 1.1 Protocol", "Graph Store HTTP Protocol", "SERVICE federation"], watch: "Public endpoints need timeouts, result limits and query cost controls."},
    {id: "api", name: "Developer APIs", detail: "Most app developers want JSON. Serve framed JSON-LD from REST or GraphQL — JSON for them, RDF for you.", tech: ["JSON-LD Framing", "SPARQL CONSTRUCT → JSON-LD", "GraphQL over RDF (e.g. HyperGraphQL-style)"], watch: "Design the JSON shape for consumers; keep the @context so it's still Linked Data."}
  ]},
  {lane: "Use", color: "var(--c-job)", items: [
    {id: "match", name: "Matching & navigation", detail: "Job matching, career pathways and gap analysis for workers and counselors.", tech: ["SPARQL + ranking", "Graph embeddings", "Explainable paths"], watch: "Show the path (worker → evidence → skill → job). Explainability is a feature workers deserve."},
    {id: "align", name: "Program alignment", detail: "Compare curricula and apprenticeship standards to live demand, competency by competency.", tech: ["Demand/supply queries", "Outcome joins"], watch: "Aggregate before publishing; small cells can re-identify people."},
    {id: "lmi", name: "Labor-market intelligence", detail: "Dashboards for workforce boards and policymakers built on the shared graph.", tech: ["SPARQL → Plot / BI tools", "Data cubes (RDF Data Cube)"], watch: "Be explicit about coverage: the graph only knows what was published."}
  ]}
];
const archSel = Mutable("quad");
const setArch = (id) => (archSel.value = id);
```

```js
const archItem = ARCH.flatMap((l) => l.items.map((i) => ({...i, lane: l.lane, color: l.color}))).find((i) => i.id === archSel);
display(html`<div class="card">
  <div class="arch">${ARCH.map((lane, li) => html`<div class="arch-lane">
    <div class="arch-lane-title" style="color:${lane.color}">${li + 1} · ${lane.lane}</div>
    ${lane.items.map((it) => html`<button type="button" class="arch-box" aria-pressed=${String(it.id === archSel)} style="--lane:${lane.color}" onclick=${() => setArch(it.id)}>${it.name}</button>`)}
  </div>`)}</div>
  <div class="arch-planes">
    <div><b>Governance plane</b> — framework stewardship, IRI policy, versioning, crosswalk review, data-sharing agreements</div>
    <div><b>Trust & privacy plane</b> — consent, selective disclosure, issuer trust lists, access control by named graph, audit logs</div>
  </div>
  <div class="arch-detail" style="border-left-color:${archItem.color}">
    <div class="role" style="color:${archItem.color}">${archItem.lane}</div>
    <div class="figure-title" style="font-family:var(--font-display);font-size:1.3rem">${archItem.name}</div>
    <p class="small" style="margin:.3rem 0">${archItem.detail}</p>
    <div>${archItem.tech.map((t) => html`<span class="skill-pill">${t}</span>`)}</div>
    <p class="small" style="margin:.6rem 0 0"><b>Watch out:</b> ${archItem.watch}</p>
  </div>
</div>`);
```

<style>
.arch { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; position: relative; }
.arch-lane { display: flex; flex-direction: column; gap: 8px; position: relative; }
.arch-lane:not(:last-child)::after {
  content: "→"; position: absolute; right: -10px; top: 50%; transform: translate(50%, -50%);
  color: var(--ink-3); font-size: 14px; z-index: 1;
}
.arch-lane-title { font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 2px; }
.arch-box {
  font: 500 .8rem/1.25 var(--font-body); text-align: left; color: var(--ink);
  background: var(--surface-2); border: 1px solid var(--rule); border-left: 3px solid var(--lane);
  border-radius: 8px; padding: 9px 10px; cursor: pointer; transition: all .15s ease;
}
.arch-box:hover { border-color: var(--lane); transform: translateY(-1px); }
.arch-box[aria-pressed="true"] { background: var(--surface); box-shadow: 0 0 0 2px var(--lane); }
.arch-planes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.arch-planes > div { font-size: .8rem; color: var(--ink-2); border: 1px dashed var(--rule-strong); border-radius: 8px; padding: 8px 10px; }
.arch-detail { margin-top: 14px; border-left: 4px solid; padding: 4px 0 4px 14px; }
@media (max-width: 900px) {
  .arch { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .arch-lane:not(:last-child)::after { content: none; }
  .arch-planes { grid-template-columns: 1fr; }
}
</style>

## When RDF is the right tool

RDF shines when **many independent parties** need to share data about **overlapping things**, using **evolving vocabularies**, where **provenance** matters. It is a weaker fit for high-volume transactional workloads inside one application. Most real systems combine it with other stores.

<div class="wide">

| | Relational (SQL) | Property graph (LPG) | RDF / Linked Data |
|---|---|---|---|
| **Identity** | Local primary keys | Local node IDs | Global IRIs — reusable across organizations |
| **Schema** | Fixed up front; migrations | Flexible, per-application | Shared vocabularies; schema is itself data |
| **Merging two sources** | ETL + key mapping | Custom import logic | Set union; same IRI = same node |
| **Standards** | SQL (ISO) | GQL (ISO, 2024), Cypher | RDF, SPARQL, SHACL, JSON-LD, OWL (W3C) |
| **Edge properties** | Join tables | Native | Reification, named graphs, or RDF 1.2 triple terms |
| **Validation** | Constraints, types | Varies by product | SHACL (closed-world shapes) |
| **Best at** | Transactions, reporting on one system | Deep traversal inside one application | Cross-organization integration, publishing, provenance |

</div>

A common, pragmatic pattern: keep operational data where it lives (SQL, SaaS), **project** it into RDF at the edge (JSON-LD contexts or R2RML), integrate and validate in a quad store, and **serve** whatever shape consumers need.

## The JSON-LD on-ramp

Most teams meet RDF through JSON-LD, because it lets an existing JSON API become Linked Data without changing its payload. The `@context` maps your keys to vocabulary IRIs. Edit the document below — it's parsed by a real JSON-LD processor in your browser. Try deleting the `@context`, or adding a key that the context doesn't map.

```js
const DEFAULT_JSONLD = JSON.stringify(
  {
    "@context": {
      schema: "https://schema.org/",
      sk: "https://skills.riverbend.example/skill/",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      title: "schema:title",
      employer: {"@id": "schema:hiringOrganization", "@type": "@id"},
      skills: {"@id": "schema:skills", "@type": "@id"},
      salary: {"@id": "schema:baseSalary", "@type": "xsd:integer"},
      posted: {"@id": "schema:datePosted", "@type": "xsd:date"}
    },
    "@id": "https://jobs.acme-robotics.example/job-automation-technician",
    "@type": "schema:JobPosting",
    title: "Automation Technician",
    employer: "https://jobs.acme-robotics.example/org",
    skills: ["sk:plc-programming", "sk:robot-operation", "sk:sensors-instrumentation"],
    salary: 68000,
    posted: "2026-09-14",
    internal_requisition_id: "REQ-20931"
  },
  null,
  2
);
const jEditor = html`<textarea class="editor" rows="27" spellcheck="false" aria-label="JSON-LD editor">${DEFAULT_JSONLD}</textarea>`;
const jsonldText = Generators.input(jEditor);
```

```js
const jl = (() => {
  let json;
  try {
    json = JSON.parse(jsonldText);
  } catch (e) {
    return {ok: false, error: "JSON syntax error: " + e.message};
  }
  try {
    const s = new oxigraph.Store();
    s.load(jsonldText, {format: "application/ld+json"});
    const quads = plainQuads(s.match());
    const keys = Object.keys(json).filter((k) => !k.startsWith("@"));
    return {ok: true, quads, keys, hasContext: "@context" in json};
  } catch (e) {
    return {ok: false, error: String(e.message ?? e)};
  }
})();
const jlPositions = new Map();
```

<div class="grid grid-cols-2" style="align-items:start">
<div>

```js
display(jEditor);
```

</div>
<div>

```js
display(
  jl.ok
    ? html`<div class="small"><span class="status-ok">✓ ${jl.quads.length} triples</span> <span class="muted">${jl.hasContext ? "" : "— no @context: keys are meaningless to a JSON-LD processor and are dropped"}</span></div>`
    : html`<div class="errbox">✗ ${jl.error}</div>`
);
```

```js
if (jl.ok)
  display(html`<div class="card" style="margin-top:6px;padding:8px 10px">${resize((w) =>
    forceGraph({...quadsToGraph(jl.quads, {literals: "nodes", index}), width: w, height: 300, positions: jlPositions, distance: 80, charge: -340, invalidation})
  )}</div>`);
```

```js
if (jl.ok) display(html`<pre style="font-size:11px;max-height:220px;margin:0">${jl.quads.length ? toNTriples(jl.quads) : "# (no triples)"}</pre>`);
```

</div>
</div>

Two lessons hide in that demo. First, `internal_requisition_id` produces no triple: keys the context doesn't map are silently dropped, which is a feature (private fields stay private) and a trap (typos vanish). Validate the *RDF*, not the JSON. Second, `"@type": "@id"` in the context is what turns the string `"sk:plc-programming"` into a link rather than text — the single most important line for interoperability.

<details class="hood">
<summary>Production notes for JSON-LD</summary>

- **Never fetch contexts at request time.** Bundle them, or use a document loader with an allow-list and a cache. Several VC libraries refuse remote contexts by default for this reason.
- **Protect your terms.** JSON-LD 1.1's `"@protected": true` stops a later context from redefining `skills` to mean something else.
- **Frame for consumers.** [JSON-LD Framing](https://www.w3.org/TR/json-ld11-framing/) reshapes a graph into the tree a client expects — e.g. a job with its skills embedded and labelled.
- **Embed for the web.** A `<script type="application/ld+json">` block on a public job or program page is read by search engines and by aggregators; it is the cheapest possible way to publish.

</details>

## Validation with SHACL

RDF's open-world assumption means nothing is ever "missing" — but your consumers need guarantees. [SHACL](https://www.w3.org/TR/shacl/) (Shapes Constraint Language) lets you state them as data and check them at the boundary. Here's a shape for job postings that join the regional graph. Break the posting and watch the validation report.

```turtle
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix schema: <https://schema.org/> .
@prefix skos:   <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix ex:     <https://example.org/shapes/> .

ex:JobPostingShape a sh:NodeShape ;
  sh:targetClass schema:JobPosting ;
  sh:property [
    sh:path schema:title ;
    sh:minCount 1 ; sh:datatype xsd:string ;
    sh:message "A job posting needs a plain-text title." ] ;
  sh:property [
    sh:path schema:hiringOrganization ;
    sh:minCount 1 ; sh:maxCount 1 ; sh:class schema:Organization ;
    sh:message "Name exactly one hiring organization that is described in the graph." ] ;
  sh:property [
    sh:path schema:skills ;
    sh:minCount 1 ; sh:nodeKind sh:IRI ; sh:class skos:Concept ;
    sh:message "Skills must be IRIs from a published skills framework — not free text." ] ;
  sh:property [
    sh:path schema:baseSalary ;
    sh:maxCount 1 ; sh:datatype xsd:integer ;
    sh:message "At most one salary, as a whole number." ] .
```

```js
const breaks = view(Inputs.checkbox(
  new Map([
    ["Remove the title", "noTitle"],
    ["Write a skill as text (“Ladder logic”)", "textSkill"],
    ["Typo in a skill IRI (sk:plc-programing)", "typoSkill"],
    ["Salary as text (“68k”)", "textSalary"],
    ["Point to an employer nobody described", "unknownOrg"],
    ["Add a second salary", "twoSalaries"]
  ]),
  {label: "Break the data"}
));
```

```js
const b = new Set(breaks);
const postingTtl = `@prefix schema: <https://schema.org/> .
@prefix sk: <https://skills.riverbend.example/skill/> .
@prefix acme: <https://jobs.acme-robotics.example/> .

acme:job-automation-technician a schema:JobPosting ;
${b.has("noTitle") ? "" : `    schema:title "Automation Technician" ;\n`}    schema:hiringOrganization ${b.has("unknownOrg") ? "<https://jobs.acme-robtics.example/org>" : "acme:org"} ;
    schema:baseSalary ${b.has("textSalary") ? `"68k"` : "68000"}${b.has("twoSalaries") ? ", 72000" : ""} ;
    schema:skills ${b.has("typoSkill") ? "sk:plc-programing" : "sk:plc-programming"},
                  ${b.has("textSkill") ? `"Ladder logic"` : "sk:robot-operation"},
                  sk:sensors-instrumentation .`;

// Data graph = the posting + everything else the region has published (so sh:class can be checked).
const vstore = new oxigraph.Store();
vstore.load(trig, {format: "application/trig"});
vstore.update(`DELETE WHERE { GRAPH <${PREFIXES.acme}graph> { <${PREFIXES.acme}job-automation-technician> ?p ?o } }`);
vstore.load(postingTtl, {format: "text/turtle", to_graph_name: oxigraph.namedNode(PREFIXES.acme + "graph")});

// Each SHACL constraint, evaluated as its SPARQL equivalent.
const PFXV = sparqlPrefixes(["schema", "skos", "xsd", "rdf"]);
const CONSTRAINTS = [
  {path: "schema:title", component: "sh:MinCountConstraintComponent", message: "A job posting needs a plain-text title.",
   q: `SELECT ?focus WHERE { ?focus a schema:JobPosting FILTER NOT EXISTS { ?focus schema:title ?v } }`},
  {path: "schema:title", component: "sh:DatatypeConstraintComponent", message: "A job posting needs a plain-text title.",
   q: `SELECT ?focus ?value WHERE { ?focus a schema:JobPosting ; schema:title ?value FILTER(!isLiteral(?value) || datatype(?value) != xsd:string) }`},
  {path: "schema:hiringOrganization", component: "sh:MinCountConstraintComponent", message: "Name exactly one hiring organization that is described in the graph.",
   q: `SELECT ?focus WHERE { ?focus a schema:JobPosting FILTER NOT EXISTS { ?focus schema:hiringOrganization ?v } }`},
  {path: "schema:hiringOrganization", component: "sh:ClassConstraintComponent", message: "Name exactly one hiring organization that is described in the graph.",
   q: `SELECT ?focus ?value WHERE { ?focus a schema:JobPosting ; schema:hiringOrganization ?value FILTER NOT EXISTS { ?value a schema:Organization } }`},
  {path: "schema:skills", component: "sh:MinCountConstraintComponent", message: "Skills must be IRIs from a published skills framework — not free text.",
   q: `SELECT ?focus WHERE { ?focus a schema:JobPosting FILTER NOT EXISTS { ?focus schema:skills ?v } }`},
  {path: "schema:skills", component: "sh:NodeKindConstraintComponent", message: "Skills must be IRIs from a published skills framework — not free text.",
   q: `SELECT ?focus ?value WHERE { ?focus a schema:JobPosting ; schema:skills ?value FILTER(!isIRI(?value)) }`},
  {path: "schema:skills", component: "sh:ClassConstraintComponent", message: "Skills must be IRIs from a published skills framework — not free text.",
   q: `SELECT ?focus ?value WHERE { ?focus a schema:JobPosting ; schema:skills ?value FILTER NOT EXISTS { ?value a skos:Concept } }`},
  {path: "schema:baseSalary", component: "sh:MaxCountConstraintComponent", message: "At most one salary, as a whole number.",
   q: `SELECT ?focus (COUNT(?v) AS ?value) WHERE { ?focus a schema:JobPosting ; schema:baseSalary ?v } GROUP BY ?focus HAVING (COUNT(?v) > 1)`},
  {path: "schema:baseSalary", component: "sh:DatatypeConstraintComponent", message: "At most one salary, as a whole number.",
   q: `SELECT ?focus ?value WHERE { ?focus a schema:JobPosting ; schema:baseSalary ?value FILTER(!isLiteral(?value) || datatype(?value) != xsd:integer) }`}
];
const report = CONSTRAINTS.flatMap((c) =>
  select(vstore, PFXV + "\n" + c.q).rows.map((r) => ({
    focus: compact(r.focus.value),
    path: c.path,
    component: c.component,
    value: r.value ? (r.value.termType === "Literal" ? JSON.stringify(r.value.value) : compact(r.value.value)) : "—",
    message: c.message
  }))
);
```

<div class="grid grid-cols-2" style="align-items:start">
<div>

```js
display(html`<div class="figure-title">Data being validated</div><pre style="font-size:11.5px">${postingTtl}</pre>`);
```

</div>
<div>

```js
display(html`<div class="card" style="margin-top:0;border-left:4px solid ${report.length ? "var(--bad)" : "var(--good)"}">
  <div class="figure-title">Validation report</div>
  <div style="font-family:var(--font-display);font-size:1.6rem;margin:4px 0 8px">${report.length
    ? html`<span class="status-err">sh:conforms false</span> <span class="small muted">· ${report.length} violation${report.length > 1 ? "s" : ""}</span>`
    : html`<span class="status-ok">sh:conforms true</span>`}</div>
  ${report.length
    ? html`<table class="nice"><thead><tr><th>Path</th><th>Constraint</th><th>Value</th></tr></thead><tbody>${report.map((r) => html`<tr>
        <td><code>${r.path}</code></td><td class="small">${r.component.replace("sh:", "").replace("ConstraintComponent", "")}</td><td><code>${r.value}</code></td>
      </tr><tr><td colspan="3" class="small muted" style="border-top:none;padding-top:0">${r.message}</td></tr>`)}</tbody></table>`
    : html`<p class="small muted">The posting satisfies every constraint in the shape. Tick a box to break it.</p>`}
</div>`);
```

</div>
</div>

<p class="small muted">For transparency: this page evaluates each SHACL constraint with its equivalent SPARQL query, using the same in-browser engine. In production, use a SHACL engine — pySHACL, Apache Jena SHACL, TopBraid SHACL, RDF4J's ShaclSail, or rdf-validate-shacl for JavaScript — which produces a standard <code>sh:ValidationReport</code> graph.</p>

Note the typo case: `sk:plc-programing` is a perfectly valid IRI, so syntax checks pass. Only the `sh:class skos:Concept` constraint — "this must be something the framework actually defines" — catches it. That is the kind of rule that makes a shared skills graph trustworthy.

## Provenance and trust

### Named graphs: who said what

Every source on this site lives in its own named graph, so each fact keeps its origin. That makes provenance queryable, lets you **replace** a source atomically when it re-publishes, and lets consumers apply **trust policies** ("only use salaries from employer graphs, not aggregators").

```js
const graphStats = d3
  .rollups(allQuads, (v) => v.length, (q) => q.graph.value)
  .map(([g, n]) => ({graph: compact(g).replace(/^<|>$/g, ""), triples: n}))
  .sort((a, b) => b.triples - a.triples);
display(
  resize((w) =>
    Plot.plot({
      width: w,
      height: 40 + graphStats.length * 28,
      marginLeft: 210,
      marginRight: 40,
      x: {label: "Triples →", grid: true},
      y: {label: null},
      style: {fontFamily: "var(--font-code)", fontSize: "11px"},
      marks: [
        Plot.barX(graphStats, {x: "triples", y: "graph", sort: {y: "-x"}, fill: "var(--c-program)", rx: 3, insetTop: 3, insetBottom: 3, tip: true}),
        Plot.text(graphStats, {x: "triples", y: "graph", text: "triples", dx: 14, fill: "var(--ink-2)"}),
        Plot.ruleX([0])
      ]
    })
  )
);
```

```sparql
# Which publishers make claims about a given skill, and how?
SELECT ?graph ?subject ?predicate WHERE {
  GRAPH ?graph { ?subject ?predicate sk:plc-programming }
}
```

### Verifiable Credentials: claims you can check

Named graphs record who *published* a triple; they don't prove it. When claims cross trust boundaries — a degree, a license, a completed apprenticeship, an employer's attestation of on-the-job skills — sign them as [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/). Open Badges 3.0 and CLR 2.0 are VC profiles for education and training. Because a VC is JSON-LD, its claims are RDF: once verified, its alignments drop straight into the graph.

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "id": "urn:uuid:2f6a1c0e-6e7b-4d0e-9a51-8d5c3b7e9f10",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "https://catalog.riverbend-cc.example/org",
    "type": ["Profile"],
    "name": "Riverbend Community College"
  },
  "validFrom": "2026-05-20T00:00:00Z",
  "name": "Robotics Fundamentals Badge",
  "credentialSubject": {
    "id": "did:example:sam-okafor",
    "type": ["AchievementSubject"],
    "achievement": {
      "id": "https://catalog.riverbend-cc.example/credential-robotics-badge",
      "type": ["Achievement"],
      "name": "Robotics Fundamentals",
      "description": "Safe operation of six-axis industrial robots.",
      "criteria": { "narrative": "Pass practical assessment RF-2 under supervision." },
      "alignment": [{
        "type": ["Alignment"],
        "targetName": "Industrial Robot Operation",
        "targetUrl": "https://skills.riverbend.example/skill/robot-operation",
        "targetFramework": "Riverbend Regional Skills Framework"
      }]
    }
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "verificationMethod": "https://catalog.riverbend-cc.example/keys#k1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9SkqZMVPxAQp…"
  }
}
```

<p class="small muted">Abridged, illustrative credential. The <code>eddsa-rdfc-2022</code> cryptosuite signs the credential's <i>RDF canonical form</i> (W3C RDF Dataset Canonicalization), so the signature survives any re-serialization that preserves the triples.</p>

The key line is `targetUrl`: the badge aligns to the **same skill IRI** that employers use in job postings. Verification proves the college said it; the IRI makes what it said comparable to everything else in the graph.

## Storage and query engines

<div class="wide">

| Engine | Model | Licensing | Notes |
|---|---|---|---|
| [Oxigraph](https://github.com/oxigraph/oxigraph) | Embedded / server, Rust | MIT / Apache-2.0 | Small, fast, standards-focused. Powers the demos on this site via WebAssembly. |
| [Apache Jena](https://jena.apache.org/) (TDB2, Fuseki) | Java library + server | Apache-2.0 | Mature toolkit: SPARQL, SHACL, rules/inference, full-text. |
| [Eclipse RDF4J](https://rdf4j.org/) | Java framework + server | EPL / BSD-style | Pluggable storage (SAIL), SHACL validation in the store. |
| [GraphDB](https://graphdb.ontotext.com/) | Server | Commercial, free tier | Reasoning, SHACL, connectors to search engines. |
| [Stardog](https://www.stardog.com/) | Server / cloud | Commercial | Virtual graphs over SQL, reasoning, data-fabric features. |
| [Virtuoso](https://virtuoso.openlinksw.com/) | Server | Open-source + commercial | Long-running at web scale (hosts DBpedia). |
| [Amazon Neptune](https://aws.amazon.com/neptune/) | Managed cloud | Commercial | SPARQL and property-graph APIs in one managed service. |
| [QLever](https://github.com/ad-freiburg/qlever) | Server | Apache-2.0 | Built for very large datasets, e.g. all of Wikidata. |

</div>

Choose on operational fit — managed vs. self-hosted, SHACL/inference needs, scale, and how it connects to the search and analytics tools you already use. SPARQL and the standard formats keep you portable: switching stores means re-loading N-Quads, not rewriting applications.

## Sharp edges

<div class="grid grid-cols-2">
  <div class="card"><div class="figure-title">Open world, closed expectations</div><p class="small">A missing triple means "unknown", not "false". Consumers that need completeness must get it from SHACL shapes and publisher agreements, not from the data model.</p></div>
  <div class="card"><div class="figure-title">Blank nodes</div><p class="small">Convenient, but they don't merge across sources, can't be referenced from outside, and complicate diffs and signatures. Prefer IRIs (or skolemized IRIs) for anything that persists.</p></div>
  <div class="card"><div class="figure-title">Identity is a governance problem</div><p class="small"><code>owl:sameAs</code> is transitive and absolute: one bad link fuses two entities everywhere. Use <code>skos:exactMatch</code>/<code>closeMatch</code> for concept crosswalks and keep identity links in their own reviewable graph.</p></div>
  <div class="card"><div class="figure-title">Statements about statements</div><p class="small">Confidence, source, and validity time for a single triple need named graphs, classic reification, or RDF 1.2 triple terms. Pick one convention and document it.</p></div>
  <div class="card"><div class="figure-title">Query performance</div><p class="small">Unselective patterns (<code>?s ?p ?o</code>), unbounded property paths and deep <code>OPTIONAL</code> chains can be expensive. Profile queries, precompute hot paths with <code>CONSTRUCT</code>, and set endpoint timeouts.</p></div>
  <div class="card"><div class="figure-title">Personal data</div><p class="small">A graph that links people to everything is exactly what privacy law worries about. Keep personal records in worker-controlled wallets, share via selective disclosure, separate personal graphs with access control, and aggregate before publishing analytics.</p></div>
</div>

## A starter checklist

<div class="wide">

| ✓ | Decision | A good default |
|---|---|---|
| ☐ | IRI scheme | `https://{your-domain}/{type}/{stable-id}`, never reused, documented in a policy |
| ☐ | Vocabularies | schema.org + CTDL for entities; SKOS for frameworks; your own terms only for true gaps, published at their IRIs |
| ☐ | Skills framework | Link to a shared framework; publish crosswalks to ESCO / O*NET as SKOS mappings with provenance |
| ☐ | Exchange format | JSON-LD with a pinned, `@protected` context; N-Quads for bulk |
| ☐ | Validation | SHACL shapes per entity type, run in CI and at ingestion |
| ☐ | Provenance | One named graph per source per load; graph metadata (publisher, retrieved-at, license) |
| ☐ | Trust | VCs for anything that crosses an organizational trust boundary; explicit issuer trust lists |
| ☐ | Access | Dereferenceable IRIs + SPARQL endpoint + framed JSON-LD API |
| ☐ | Privacy | Worker-held records, consented sharing, aggregation thresholds for analytics |

</div>

<p class="small muted">← Back to <a href="./">the explainer</a>. All organizations, people and <code>.example</code> identifiers are fictional.</p>
