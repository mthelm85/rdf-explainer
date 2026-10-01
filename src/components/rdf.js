// Small RDF helpers shared across the explainer: prefixes, compaction,
// node classification, quads → graph, and readable serializers.

export const PREFIXES = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  sh: "http://www.w3.org/ns/shacl#",
  schema: "https://schema.org/",
  ceterms: "https://purl.org/ctdl/terms/",
  sk: "https://skills.riverbend.example/skill/",
  rwb: "https://skills.riverbend.example/",
  acme: "https://jobs.acme-robotics.example/",
  north: "https://jobs.northgate-electric.example/",
  rcc: "https://catalog.riverbend-cc.example/",
  mea: "https://apprentice.midstate-electrical.example/",
  wallet: "https://wallet.example/",
  ex: "https://example.org/"
};

export const RDF_TYPE = PREFIXES.rdf + "type";
const XSD = PREFIXES.xsd;

// Longest namespace wins, so sk: beats rwb: for skill IRIs.
const ORDERED = Object.entries(PREFIXES).sort((a, b) => b[1].length - a[1].length);

export function compact(iri, used) {
  for (const [p, ns] of ORDERED) {
    if (iri.startsWith(ns)) {
      const local = iri.slice(ns.length);
      if (/^[A-Za-z_][\w.-]*$/.test(local) && !local.endsWith(".")) {
        used?.add(p);
        return `${p}:${local}`;
      }
    }
  }
  return `<${iri}>`;
}

export function sparqlPrefixes(names = Object.keys(PREFIXES)) {
  return names.map((p) => `PREFIX ${p}: <${PREFIXES[p]}>`).join("\n");
}

// ─── Node kinds ─────────────────────────────────────────────────────────────
export const KINDS = {
  person: {label: "Person / worker", color: "var(--c-person)", symbol: "circle", size: 300},
  org: {label: "Organization", color: "var(--c-org)", symbol: "square", size: 280},
  job: {label: "Job posting", color: "var(--c-job)", symbol: "diamond", size: 300},
  program: {label: "Education / training program", color: "var(--c-program)", symbol: "triangle", size: 300},
  credential: {label: "Credential", color: "var(--c-credential)", symbol: "star", size: 300},
  skill: {label: "Skill (shared concept)", color: "var(--c-skill)", symbol: "circle", size: 130},
  other: {label: "Other resource", color: "var(--c-other)", symbol: "circle", size: 120},
  literal: {label: "Literal value", color: "var(--c-literal)", symbol: "rect", size: 0}
};

const TYPE_TO_KIND = {
  [PREFIXES.schema + "Person"]: "person",
  [PREFIXES.schema + "Organization"]: "org",
  [PREFIXES.schema + "CollegeOrUniversity"]: "org",
  [PREFIXES.schema + "GovernmentOrganization"]: "org",
  [PREFIXES.schema + "EducationalOrganization"]: "org",
  [PREFIXES.schema + "JobPosting"]: "job",
  [PREFIXES.schema + "EducationalOccupationalProgram"]: "program",
  [PREFIXES.schema + "Course"]: "program",
  [PREFIXES.schema + "EducationalOccupationalCredential"]: "credential",
  [PREFIXES.skos + "Concept"]: "skill",
  [PREFIXES.skos + "ConceptScheme"]: "skill"
};

export function kindOfTypes(types) {
  for (const t of types ?? []) if (TYPE_TO_KIND[t]) return TYPE_TO_KIND[t];
  return "other";
}

// Guess a kind from the IRI alone (used for nodes whose types live elsewhere).
export function kindFromIri(iri) {
  if (iri.startsWith(PREFIXES.sk)) return "skill";
  if (/job-/.test(iri)) return "job";
  if (/program-/.test(iri)) return "program";
  if (/credential-/.test(iri)) return "credential";
  if (/\/org$/.test(iri)) return "org";
  if (iri.startsWith(PREFIXES.wallet)) return "person";
  return "other";
}

const LABEL_PREDICATES = [
  PREFIXES.schema + "name",
  PREFIXES.schema + "title",
  PREFIXES.skos + "prefLabel",
  PREFIXES.rdfs + "label"
];

// Build lookups (labels, types) from a list of quads.
export function indexQuads(quads) {
  const labels = new Map();
  const types = new Map();
  for (const q of quads) {
    const s = q.subject.value;
    if (q.predicate.value === RDF_TYPE) {
      if (!types.has(s)) types.set(s, []);
      types.get(s).push(q.object.value);
    } else if (q.object.termType === "Literal") {
      const rank = LABEL_PREDICATES.indexOf(q.predicate.value);
      if (rank >= 0) {
        const prev = labels.get(s);
        if (!prev || rank < prev.rank) labels.set(s, {rank, value: q.object.value});
      }
    }
  }
  return {
    label: (iri) => labels.get(iri)?.value,
    types: (iri) => types.get(iri) ?? [],
    kind: (iri) => {
      const k = kindOfTypes(types.get(iri));
      return k === "other" ? kindFromIri(iri) : k;
    }
  };
}

export function termLabel(term) {
  if (term.termType === "Literal") return term.value;
  if (term.termType === "BlankNode") return "_:" + term.value;
  return compact(term.value);
}

export function shortLabel(s, n = 26) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Convert quads to a node-link graph.
//   literals: "nodes" (draw literal values as their own boxes) | "hide"
//   index:    optional global index for labels/types beyond these quads
export function quadsToGraph(quads, {literals = "hide", index, hideTypes = true, keyPrefix = ""} = {}) {
  const local = indexQuads(quads);
  const idx = index ?? local;
  const nodes = new Map();
  const links = [];
  const ensure = (term) => {
    const id = keyPrefix + (term.termType === "BlankNode" ? "_:" + term.value : term.value);
    if (!nodes.has(id)) {
      const iri = term.value;
      const kind = term.termType === "BlankNode" ? "other" : (local.kind(iri) !== "other" ? local.kind(iri) : idx.kind(iri));
      nodes.set(id, {
        id,
        iri,
        termType: term.termType,
        kind,
        label: local.label(iri) ?? idx.label(iri) ?? termLabel(term),
        types: local.types(iri).length ? local.types(iri) : idx.types(iri)
      });
    }
    return nodes.get(id);
  };
  let lit = 0;
  for (const q of quads) {
    if (hideTypes && q.predicate.value === RDF_TYPE) {
      ensure(q.subject);
      continue;
    }
    const s = ensure(q.subject);
    if (q.object.termType === "Literal") {
      if (literals !== "nodes") continue;
      const id = `${keyPrefix}lit:${lit++}`;
      const value = q.object.value;
      nodes.set(id, {id, termType: "Literal", kind: "literal", label: value, iri: null, literal: q.object});
      links.push({source: s.id, target: id, predicate: q.predicate.value, plabel: compact(q.predicate.value)});
    } else {
      const o = ensure(q.object);
      links.push({source: s.id, target: o.id, predicate: q.predicate.value, plabel: compact(q.predicate.value)});
    }
  }
  return {nodes: [...nodes.values()], links};
}

// ─── Serializers (readable, prefix-aware) ───────────────────────────────────
function literalTurtle(lit, used) {
  const dt = lit.datatype?.value;
  const v = lit.value;
  if (dt === XSD + "integer" && /^-?\d+$/.test(v)) return v;
  if (dt === XSD + "decimal" && /^-?\d*\.\d+$/.test(v)) return v;
  if (dt === XSD + "boolean" && /^(true|false)$/.test(v)) return v;
  const q = JSON.stringify(v);
  if (lit.language) return `${q}@${lit.language}`;
  if (dt && dt !== XSD + "string" && dt !== PREFIXES.rdf + "langString") return `${q}^^${compact(dt, used)}`;
  return q;
}

function termTurtle(term, used) {
  if (term.termType === "Literal") return literalTurtle(term, used);
  if (term.termType === "BlankNode") return "_:" + term.value;
  return compact(term.value, used);
}

function groupBySubject(quads) {
  const subjects = new Map();
  for (const q of quads) {
    const key = q.subject.termType + " " + q.subject.value;
    if (!subjects.has(key)) subjects.set(key, {subject: q.subject, preds: new Map()});
    const preds = subjects.get(key).preds;
    if (!preds.has(q.predicate.value)) preds.set(q.predicate.value, []);
    preds.get(q.predicate.value).push(q.object);
  }
  return [...subjects.values()];
}

export function toTurtle(quads) {
  const used = new Set();
  const blocks = groupBySubject(quads).map(({subject, preds}) => {
    const s = termTurtle(subject, used);
    const entries = [...preds.entries()].sort(([a], [b]) => (a === RDF_TYPE ? -1 : b === RDF_TYPE ? 1 : 0));
    const lines = entries.map(([p, objs]) => {
      const pp = p === RDF_TYPE ? "a" : compact(p, used);
      return `${pp} ${objs.map((o) => termTurtle(o, used)).join(", ")}`;
    });
    return `${s}\n    ${lines.join(" ;\n    ")} .`;
  });
  const head = [...used].sort().map((p) => `@prefix ${p}: <${PREFIXES[p]}> .`).join("\n");
  return (head ? head + "\n\n" : "") + blocks.join("\n\n");
}

function jsonldValue(term, used) {
  if (term.termType === "NamedNode") return {"@id": compact(term.value, used).replace(/^<|>$/g, "")};
  if (term.termType === "BlankNode") return {"@id": "_:" + term.value};
  const dt = term.datatype?.value;
  if (term.language) return {"@value": term.value, "@language": term.language};
  if (dt === XSD + "integer" && /^-?\d+$/.test(term.value)) return Number(term.value);
  if (dt === XSD + "boolean") return term.value === "true";
  if (dt && dt !== XSD + "string") return {"@value": term.value, "@type": compact(dt, used).replace(/^<|>$/g, "")};
  return term.value;
}

export function toJSONLD(quads) {
  const used = new Set();
  const nodes = groupBySubject(quads).map(({subject, preds}) => {
    const node = {"@id": subject.termType === "BlankNode" ? "_:" + subject.value : compact(subject.value, used).replace(/^<|>$/g, "")};
    for (const [p, objs] of preds) {
      if (p === RDF_TYPE) {
        const t = objs.map((o) => compact(o.value, used).replace(/^<|>$/g, ""));
        node["@type"] = t.length === 1 ? t[0] : t;
      } else {
        const key = compact(p, used).replace(/^<|>$/g, "");
        const vals = objs.map((o) => jsonldValue(o, used));
        node[key] = vals.length === 1 ? vals[0] : vals;
      }
    }
    return node;
  });
  const context = Object.fromEntries([...used].sort().map((p) => [p, PREFIXES[p]]));
  const doc = nodes.length === 1 ? {"@context": context, ...nodes[0]} : {"@context": context, "@graph": nodes};
  return JSON.stringify(doc, null, 2);
}

export function toNTriples(quads) {
  const t = (term) => {
    if (term.termType === "NamedNode") return `<${term.value}>`;
    if (term.termType === "BlankNode") return `_:${term.value}`;
    const q = JSON.stringify(term.value);
    if (term.language) return `${q}@${term.language}`;
    const dt = term.datatype?.value;
    return dt && dt !== XSD + "string" ? `${q}^^<${dt}>` : q;
  };
  return quads.map((q) => `${t(q.subject)} ${t(q.predicate)} ${t(q.object)} .`).join("\n");
}
