// Data loader: reads each example in Turtle and JSON-LD, checks that both
// describe exactly the same triples, and emits them for the page.
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {Parser} from "n3";
import jsonld from "jsonld";

const EXAMPLES = [
  {id: "job", title: "A job posting"},
  {id: "record", title: "A worker’s record"},
  {id: "skill", title: "A skill with its synonyms"}
];

const read = (name) => readFileSync(fileURLToPath(new URL(`./examples/${name}`, import.meta.url)), "utf8");
const XSD = "http://www.w3.org/2001/XMLSchema#";

function nquad(q) {
  const term = (t) => {
    if (t.termType === "NamedNode") return `<${t.value}>`;
    if (t.termType === "BlankNode") return `_:${t.value}`;
    const v = JSON.stringify(t.value);
    if (t.language) return `${v}@${t.language}`;
    return t.datatype && t.datatype.value !== XSD + "string" ? `${v}^^<${t.datatype.value}>` : v;
  };
  return `${term(q.subject)} ${term(q.predicate)} ${term(q.object)} .`;
}

const out = [];
for (const ex of EXAMPLES) {
  const turtle = read(`${ex.id}.ttl`).trim();
  const json = read(`${ex.id}.jsonld`).trim();

  let prefixes = {};
  const quads = new Parser({format: "text/turtle"}).parse(turtle, null, (p, iri) => (prefixes[p] = iri.value));
  const fromTurtle = new Set(quads.map(nquad));
  const fromJson = new Set(
    (await jsonld.toRDF(JSON.parse(json), {format: "application/n-quads"})).trim().split("\n").map((l) => l.trim())
  );
  const missing = [...fromTurtle].filter((x) => !fromJson.has(x));
  const extra = [...fromJson].filter((x) => !fromTurtle.has(x));
  if (missing.length || extra.length) {
    throw new Error(`Example "${ex.id}": Turtle and JSON-LD differ.\nOnly in Turtle:\n${missing.join("\n")}\nOnly in JSON-LD:\n${extra.join("\n")}`);
  }

  const ordered = Object.entries(prefixes).sort((a, b) => b[1].length - a[1].length);
  const curie = (iri) => {
    for (const [p, ns] of ordered) if (iri.startsWith(ns)) return `${p}:${iri.slice(ns.length)}`;
    return `<${iri}>`;
  };
  out.push({
    ...ex,
    turtle,
    jsonld: json,
    triples: quads.map((q) => ({
      s: curie(q.subject.value),
      p: q.predicate.value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" ? "a" : curie(q.predicate.value),
      o: q.object.termType === "Literal" ? q.object.value : curie(q.object.value),
      literal: q.object.termType === "Literal",
      lang: q.object.language || null
    }))
  });
}

process.stdout.write(JSON.stringify(out));
