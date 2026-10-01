import init, * as ox from "../lib/oxigraph/web.js";

let ready;

/** Initialise Oxigraph (Rust → WebAssembly) once, then return its module. */
export function loadOxigraph(wasmUrl) {
  ready ??= init({module_or_path: wasmUrl}).then(() => ox);
  return ready;
}

function plainTerm(t) {
  if (!t) return t;
  const out = {termType: t.termType, value: t.value};
  if (t.termType === "Literal") {
    out.language = t.language || "";
    out.datatype = {value: t.datatype?.value};
  }
  return out;
}

/** Copy Oxigraph's WebAssembly-backed quads into plain JS objects. */
export function plainQuads(quads) {
  return quads.map((q) => ({
    subject: plainTerm(q.subject),
    predicate: plainTerm(q.predicate),
    object: plainTerm(q.object),
    graph: plainTerm(q.graph)
  }));
}

/** Run a SPARQL SELECT and return rows of plain terms plus the variable list. */
export function select(store, query) {
  const res = store.query(query, {use_default_graph_as_union: true});
  if (!Array.isArray(res)) return {vars: [], rows: [], raw: res};
  const vars = [];
  const rows = res.map((binding) => {
    const row = {};
    for (const [k, v] of binding) {
      if (!vars.includes(k)) vars.push(k);
      row[k] = plainTerm(v);
    }
    return row;
  });
  const m = query.match(/SELECT\s+(DISTINCT\s+|REDUCED\s+)?([\s\S]*?)\s*(WHERE|FROM|\{)/i);
  if (m && m[2].trim() !== "*") {
    const ordered = [...m[2].matchAll(/\?(\w+)(?![^(]*\bAS\b)|AS\s+\?(\w+)/gi)].map((x) => x[1] ?? x[2]);
    const seen = [...new Set(ordered)];
    return {vars: seen.length ? seen : vars, rows};
  }
  return {vars, rows};
}
