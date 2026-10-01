import * as d3 from "d3";

const SCHEMA = "https://schema.org/";
const SKOS = "http://www.w3.org/2004/02/skos/core#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
export const SK = "https://skills.riverbend.example/skill/";

/** Labels and types for every IRI in the dataset. */
export function indexQuads(quads) {
  const label = new Map();
  const types = new Map();
  for (const q of quads) {
    if (q.p === RDF_TYPE) types.set(q.s, [...(types.get(q.s) ?? []), q.o]);
    else if (q.literal && [SCHEMA + "name", SCHEMA + "title", SKOS + "prefLabel"].includes(q.p) && !label.has(q.s)) label.set(q.s, q.o);
  }
  return {label: (iri) => label.get(iri) ?? iri, types: (iri) => types.get(iri) ?? []};
}

/** Light syntax highlighting for Turtle and JSON-LD. */
export function highlight(code, lang) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"})[c]);
  const re =
    lang === "turtle"
      ? /(#[^\n]*)|("(?:[^"\\]|\\.)*"(?:@[a-z-]+)?)|(<[^>\s]*>)|(@prefix\b|\ba\b(?=\s))|([A-Za-z][\w-]*:[\w-]*)|(\d+)/g
      : /("(?:[^"\\]|\\.)*")(\s*:)?|(\b\d+\b)/g;
  let out = "", last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    let cls;
    if (lang === "turtle") cls = m[1] ? "tok-comment" : m[2] ? "tok-string" : m[3] || m[5] ? "tok-iri" : m[4] ? "tok-keyword" : "tok-number";
    else cls = m[3] ? "tok-number" : m[2] ? (m[1].startsWith('"@') ? "tok-keyword" : "tok-key") : "tok-string";
    if (lang !== "turtle" && m[2]) out += `<span class="${cls}">${esc(m[1])}</span>${esc(m[2])}`;
    else out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}

/** A small RDF graph: one star per subject, joined where an object is described further down. */
const CHAR = 6.9; // approximate advance of 11.5px Roboto Mono

export function exampleGraph(triples, width) {
  const rowH = 30;
  const subjects = [...new Set(triples.map((t) => t.s))];
  const text = (t) => (t.literal ? `“${t.o}”${t.lang ? "@" + t.lang : ""}` : t.o);
  const leafWidth = (t) => (t.literal ? text(t).length * 7.4 + 24 : text(t).length * CHAR + 12);

  let top = 32;
  const stars = subjects.map((subject) => {
    const rows = triples.filter((t) => t.s === subject);
    const col = d3.max(rows, (t) => t.p.length) * CHAR + 40;
    const star = {subject, x: 8, y: top, col, rows: rows.map((t, i) => ({...t, x: 8 + col, y: top + i * rowH}))};
    star.width = 8 + col + d3.max(rows, leafWidth) + 8;
    top += rows.length * rowH + 40;
    return star;
  });
  const W = Math.max(width, d3.max(stars, (d) => d.width));
  const H = top - 24;
  const s = svg(W, H, `RDF graph of ${triples.length} triples`).style("max-width", null);

  // Dashed connector: an object in one star is the subject of a later one
  const leaves = stars.flatMap((st) => st.rows);
  for (const st of stars.slice(1)) {
    const leaf = leaves.find((r) => !r.literal && r.o === st.subject && r.y < st.y);
    if (!leaf) continue;
    s.append("path")
      .attr("fill", "none")
      .attr("stroke", "var(--edge)")
      .attr("stroke-width", 1.25)
      .attr("stroke-dasharray", "3 4")
      .attr("d", `M${leaf.x},${leaf.y + 6} C${leaf.x},${st.y - 10} ${st.x},${leaf.y + 20} ${st.x},${st.y - 22}`);
  }

  for (const st of stars) {
    const g = s.append("g");
    g.append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(st.rows)
      .join("path")
      .attr("stroke", "var(--edge)")
      .attr("stroke-width", 1.25)
      .attr("d", (r) => d3.linkHorizontal()({source: [st.x, st.y], target: [r.x - (r.literal ? 0 : 6), r.y]}));
    g.append("g")
      .selectAll("text")
      .data(st.rows)
      .join("text")
      .attr("class", "mono")
      .attr("x", (r) => r.x - 10)
      .attr("y", (r) => r.y - 6)
      .attr("text-anchor", "end")
      .text((r) => r.p);
    g.append("circle").attr("cx", st.x).attr("cy", st.y).attr("r", 5).attr("fill", "var(--accent)");
    g.append("text").attr("class", "mono strong").attr("x", st.x - 4).attr("y", st.y - 20).text(st.subject);

    const leaf = g.append("g").selectAll("g").data(st.rows).join("g").attr("transform", (r) => `translate(${r.x},${r.y})`);
    leaf.filter((r) => !r.literal).append("circle").attr("r", 5).attr("fill", "var(--ink)");
    leaf.filter((r) => !r.literal).append("text").attr("class", "mono").attr("x", 10).attr("dy", "0.35em").text(text);
    const lit = leaf.filter((r) => r.literal);
    lit.append("rect").attr("class", "lit-box").attr("y", -11).attr("height", 22).attr("rx", 6).attr("width", (r) => leafWidth(r) - 8);
    lit.append("text").attr("class", "label").attr("x", 8).attr("dy", "0.35em").text(text);
  }

  const wrap = document.createElement("div");
  wrap.style.overflowX = "auto";
  wrap.append(s.node());
  return wrap;
}

function svg(width, height, label) {
  const s = d3.create("svg").attr("class", "fig");
  return s
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("aria-label", label)
    .style("max-width", "100%")
    .style("height", "auto");
}

function arrowhead(s, id) {
  s.append("defs")
    .append("marker")
    .attr("id", id)
    .attr("viewBox", "0 -4 8 8")
    .attr("refX", 8)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-3.5L8,0L0,3.5")
    .attr("fill", "var(--muted)");
}

/** Figure 1 — one triple, which can expand into a chain of three. Call update("one" | "chain"). */
export function chainFigure(width) {
  const nodes = [
    {label: "Maria", sub: "a worker"},
    {label: "AAS in Mechatronics", sub: "a credential"},
    {label: "PLC Programming", sub: "a skill", accent: true},
    {label: "Automation Technician", sub: "a job"}
  ];
  const edges = [
    {from: 0, to: 1, label: "holds"},
    {from: 1, to: 2, label: "certifies"},
    {from: 3, to: 2, label: "requires"}
  ];
  const narrow = width < 560;
  const W = width;
  const H = narrow ? 380 : 150;

  // Node positions for each state
  const layout = {
    one: narrow
      ? [{x: 24, y: 40}, {x: 24, y: 172}]
      : [{x: W * 0.22, y: 58}, {x: W * 0.72, y: 58}],
    chain: nodes.map((_, i) =>
      narrow ? {x: 24, y: 40 + i * 98} : {x: 70 + (i * (W - 140)) / (nodes.length - 1), y: 58}
    )
  };
  const at = (mode, i) => layout[mode][i] ?? layout.chain[i];

  const s = svg(W, H, "Maria holds a Mechatronics degree. Expanded: the degree certifies PLC Programming, which the Automation Technician job requires.");
  arrowhead(s, "chain-arrow");

  const gap = 9;
  const ends = (mode, e) => {
    const a = at(mode, e.from), b = at(mode, e.to);
    const dir = narrow ? Math.sign(b.y - a.y) : Math.sign(b.x - a.x);
    return narrow
      ? {x1: a.x, y1: a.y + dir * gap, x2: b.x, y2: b.y - dir * gap}
      : {x1: a.x + dir * gap, y1: a.y, x2: b.x - dir * gap, y2: b.y};
  };
  const labelAt = (mode, e) => {
    const a = at(mode, e.from), b = at(mode, e.to);
    return narrow ? {x: a.x + 16, y: (a.y + b.y) / 2 + 4} : {x: (a.x + b.x) / 2, y: a.y - 10};
  };

  const line = s.append("g").selectAll("line").data(edges).join("line")
    .attr("stroke", "var(--muted)")
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#chain-arrow)");
  const edgeLabel = s.append("g").selectAll("text").data(edges).join("text")
    .attr("class", "mono")
    .attr("text-anchor", narrow ? "start" : "middle")
    .text((e) => e.label);

  const node = s.append("g").selectAll("g").data(nodes).join("g");
  node.append("circle").attr("r", 5).attr("fill", (d) => (d.accent ? "var(--accent)" : "var(--ink)"));
  node.append("text")
    .attr("class", "label")
    .attr("x", narrow ? 16 : 0)
    .attr("y", narrow ? 0 : 26)
    .attr("dy", narrow ? "0.35em" : 0)
    .attr("text-anchor", narrow ? "start" : "middle")
    .text((d) => d.label);
  node.append("text")
    .attr("class", "faint")
    .attr("x", narrow ? 16 : 0)
    .attr("y", narrow ? 17 : 42)
    .attr("dy", narrow ? "0.35em" : 0)
    .attr("text-anchor", narrow ? "start" : "middle")
    .text((d) => d.sub);

  // Subject / predicate / object, shown for the single triple
  const roles = [
    {t: "subject", at: () => (narrow ? {x: 40, y: at("one", 0).y + 36} : {x: at("one", 0).x, y: 120})},
    {t: "predicate", at: () => (narrow ? {x: 40, y: labelAt("one", edges[0]).y + 16} : {x: labelAt("one", edges[0]).x, y: 120})},
    {t: "object", at: () => (narrow ? {x: 40, y: at("one", 1).y + 36} : {x: at("one", 1).x, y: 120})}
  ];
  const role = s.append("g").selectAll("text").data(roles).join("text")
    .attr("class", "role")
    .attr("text-anchor", narrow ? "start" : "middle")
    .attr("x", (d) => d.at().x)
    .attr("y", (d) => d.at().y)
    .text((d) => d.t);
  if (!narrow) {
    // a light bracket under each part
    s.append("g").attr("class", "brackets").selectAll("line").data(roles).join("line")
      .attr("stroke", "var(--rule)")
      .attr("x1", (d) => d.at().x - 34).attr("x2", (d) => d.at().x + 34)
      .attr("y1", 104).attr("y2", 104);
  }

  let state = null;
  function update(mode) {
    const first = state === null;
    state = mode;
    const chain = mode === "chain";
    const t = (sel, delay = 0) => (first ? sel : sel.transition().delay(delay).duration(650).ease(d3.easeCubicInOut));

    t(node).attr("transform", (d, i) => `translate(${at(mode, i).x},${at(mode, i).y})`)
      .attr("opacity", (d, i) => (i < 2 || chain ? 1 : 0));

    line.each(function (e, i) {
      const sel = d3.select(this);
      const g = ends(mode, e);
      if (i === 0) {
        t(sel).attr("x1", g.x1).attr("y1", g.y1).attr("x2", g.x2).attr("y2", g.y2).attr("opacity", 1);
        return;
      }
      sel.attr("x1", g.x1).attr("y1", g.y1).attr("x2", g.x2).attr("y2", g.y2);
      const len = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
      sel.attr("stroke-dasharray", `${len} ${len}`);
      if (chain) {
        sel.attr("stroke-dashoffset", first ? 0 : len).attr("opacity", 1);
        t(sel, 350 + i * 150).attr("stroke-dashoffset", 0);
      } else {
        t(sel).attr("opacity", 0);
      }
    });
    t(edgeLabel, 0)
      .attr("x", (e) => labelAt(mode, e).x)
      .attr("y", (e) => labelAt(mode, e).y)
      .attr("opacity", (e, i) => (i === 0 || chain ? 1 : 0));
    t(role).attr("opacity", chain ? 0 : 1);
    t(s.selectAll(".brackets line")).attr("opacity", chain ? 0 : 1);
  }

  const el = s.node();
  el.update = update;
  return el;
}

/** Figure 2 — four phrasings of one skill; with RDF they point to one IRI. */
const PHRASES = [
  {source: "Job posting", text: "Must know ladder logic"},
  {source: "College catalog", text: "ELT 214: PLC Programming"},
  {source: "Apprenticeship standard", text: "Programmable controllers"},
  {source: "Résumé", text: "Allen-Bradley PLC experience"}
];

export function namesFigure(width) {
  const narrow = width < 560;
  const W = width;
  const H = narrow ? 320 : 230;
  const rowH = narrow ? 52 : 54;
  const left = PHRASES.map((_, i) => ({x: 0, y: 26 + i * rowH}));
  const target = narrow ? {x: 12, y: H - 26} : {x: W - 200, y: 26 + 1.5 * rowH};
  const s = svg(W, H, "Four documents describe the same skill in different words.");

  const link = (i) =>
    narrow
      ? d3.linkHorizontal()({source: [W - 16, left[i].y - 4], target: [target.x + 14, target.y - 14]})
      : d3.linkHorizontal()({source: [250, left[i].y - 4], target: [target.x - 8, target.y]});
  const paths = s
    .append("g")
    .selectAll("path")
    .data(PHRASES)
    .join("path")
    .attr("d", (d, i) => link(i))
    .attr("fill", "none")
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 1.5);
  paths.each(function () {
    const L = this.getTotalLength();
    d3.select(this).attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L);
  });

  const rows = s.append("g").selectAll("g").data(PHRASES).join("g").attr("transform", (d, i) => `translate(${left[i].x},${left[i].y})`);
  rows.append("text").attr("class", "faint").attr("y", -18).text((d) => d.source);
  rows.append("text").attr("class", "label").attr("y", 0).text((d) => `“${d.text}”`);

  const t = s.append("g").attr("transform", `translate(${target.x},${target.y})`);
  const dot = t.append("circle").attr("r", 5).attr("fill", "var(--faint)");
  const title = t.append("text").attr("class", "label").attr("x", 14).attr("dy", "-0.2em");
  const sub = t.append("text").attr("class", "mono").attr("x", 14).attr("dy", "1.2em");

  const el = s.node();
  el.update = (mode) => {
    const on = mode === "rdf";
    paths
      .transition()
      .duration(on ? 900 : 300)
      .delay((d, i) => (on ? i * 120 : 0))
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", function () {
        return on ? 0 : this.getTotalLength();
      });
    dot.transition().duration(400).attr("fill", on ? "var(--accent)" : "var(--faint)");
    title.text(on ? "PLC Programming" : "No match");
    sub.text(on ? "sk:plc-programming" : "four unrelated strings");
  };
  el.update("text");
  return el;
}

/** Figure 3 — independently published graphs that merge on shared IRIs. */
const SKIP = new Set([RDF_TYPE, SCHEMA + "teaches", SCHEMA + "provider", SCHEMA + "educationalCredentialAwarded", SKOS + "inScheme", SKOS + "broader"]);
// Within each publisher's column: the publisher (or person) first, then what it describes.
const ROLE_ORDER = ["person", "college", "employer", "credential", "job", "skill"];

const PREDICATE_LABEL = {
  [SCHEMA + "skills"]: "requires",
  [SCHEMA + "hiringOrganization"]: "hiring organization",
  [SCHEMA + "competencyRequired"]: "certifies",
  [SCHEMA + "recognizedBy"]: "recognized by",
  [SCHEMA + "hasCredential"]: "holds credential",
  [SCHEMA + "knowsAbout"]: "knows about"
};

export function mergeFigure({quads, index, panels, width}) {
  const narrow = width < 560;
  const W = width;
  const perPanel = panels.map((p) => quads.filter((q) => q.g === p.graph && !q.literal && !SKIP.has(q.p)));

  // The separate view stacks the three datasets, each sized to its rows.
  const rowH = narrow ? 21 : 22;
  const panelGeom = [];
  let y0 = 0;
  for (const qs of perPanel) {
    const iris = new Set(qs.flatMap((q) => [q.s, q.o]));
    const skills = [...iris].filter((x) => x.startsWith(SK)).length;
    const rows = Math.max(skills, iris.size - skills, 1);
    panelGeom.push({top: y0, rows});
    y0 += 30 + rows * rowH + 22;
  }
  const H = Math.max(y0, narrow ? 720 : 460);
  const count = new Map();
  perPanel.forEach((qs) => new Set(qs.flatMap((q) => [q.s, q.o])).forEach((iri) => count.set(iri, (count.get(iri) ?? 0) + 1)));

  const role = (iri) => {
    const t = index.types(iri);
    if (iri.startsWith(SK)) return "skill";
    if (t.includes(SCHEMA + "Person")) return "person";
    if (t.includes(SCHEMA + "JobPosting")) return "job";
    if (t.includes(SCHEMA + "EducationalOccupationalCredential")) return "credential";
    if (t.includes(SCHEMA + "CollegeOrUniversity")) return "college";
    return "employer";
  };

  // Maria's path to jobs, used to accent edges once merged
  const all = perPanel.flat();
  const objs = (s, p) => all.filter((q) => q.s === s && q.p === SCHEMA + p).map((q) => q.o);
  const person = all.find((q) => role(q.s) === "person")?.s;
  const creds = new Set(objs(person, "hasCredential"));
  const held = new Set([...objs(person, "knowsAbout"), ...[...creds].flatMap((c) => objs(c, "competencyRequired"))]);
  const wanted = new Set(all.filter((q) => q.p === SCHEMA + "skills").map((q) => q.o));
  const onPath = (q) =>
    (q.p === SCHEMA + "hasCredential") ||
    (q.p === SCHEMA + "knowsAbout" && wanted.has(q.o)) ||
    (q.p === SCHEMA + "competencyRequired" && creds.has(q.s) && wanted.has(q.o)) ||
    (q.p === SCHEMA + "skills" && held.has(q.o));

  const s = svg(W, H, "Three separately published datasets that merge into one graph");
  const heads = s
    .append("g")
    .selectAll("text")
    .data(panels)
    .join("text")
    .attr("class", "role")
    .attr("x", 0)
    .attr("y", (d, i) => panelGeom[i].top + 12)
    .attr("text-anchor", "start")
    .text((d) => d.title);
  // separator rules between the stacked datasets
  const rules = s
    .append("g")
    .selectAll("line")
    .data(panelGeom.slice(1))
    .join("line")
    .attr("x1", 0)
    .attr("x2", W)
    .attr("y1", (g) => g.top - 11)
    .attr("y2", (g) => g.top - 11)
    .attr("stroke", "var(--rule)");
  const gLinks = s.append("g").attr("fill", "none").attr("shape-rendering", "geometricPrecision").attr("stroke-linecap", "round");
  const gHits = s.append("g").attr("fill", "none").attr("stroke", "transparent").attr("stroke-width", 10);
  const gNodes = s.append("g");
  const hoverLabel = s.append("text").attr("class", "mono hover-label").attr("pointer-events", "none").attr("opacity", 0);
  let current = new Map();
  let hitTimer;

  // Evenly spread a list of nodes along one axis
  const spread = (list, from, to, set) => {
    const n = list.length;
    list.forEach((d, i) => set(d, n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1)));
  };

  function layoutSeparate() {
    const nodes = [];
    const ex = W * (narrow ? 0.42 : 0.36);
    const sx = W * (narrow ? 0.58 : 0.62);
    perPanel.forEach((qs, i) => {
      const iris = [...new Set(qs.flatMap((q) => [q.s, q.o]))];
      const ents = iris.filter((x) => role(x) !== "skill").sort((a, b) => ROLE_ORDER.indexOf(role(a)) - ROLE_ORDER.indexOf(role(b)));
      const skills = iris.filter((x) => role(x) === "skill").sort((a, b) => index.label(a).localeCompare(index.label(b)));
      const mk = (iri) => ({id: `${i}|${iri}`, iri, role: role(iri), panel: i});
      const E = ents.map(mk), S = skills.map(mk);
      const {top, rows} = panelGeom[i];
      const first = top + 30, last = top + 30 + (rows - 1) * rowH;
      const mid = (first + last) / 2;
      const place = (list, x) => {
        const span = (list.length - 1) * rowH;
        list.forEach((d, k) => {
          d.x = x;
          d.y = list.length === 1 ? mid : mid - span / 2 + k * rowH;
        });
      };
      // Entities get extra room between them when there are few of them
      place(E, ex);
      if (E.length > 1 && E.length < rows) spread(E, first, last, (d, v) => (d.y = v));
      place(S, sx);
      nodes.push(...E, ...S);
    });
    return nodes;
  }

  function layoutMerged() {
    const iris = [...new Set(perPanel.flat().flatMap((q) => [q.s, q.o]))];
    const byRole = d3.group(iris.map((iri) => ({id: iri, iri, role: role(iri)})), (d) => d.role);
    const col = narrow
      ? {person: 0, college: 0, credential: 1, skill: 2, job: 3, employer: 4}
      : {person: 0, college: 0, credential: 1, skill: 2, job: 3, employer: 4};
    const xs = [0.1, 0.3, 0.52, 0.76, 0.93].map((f) => f * W);
    const ys = [0.08, 0.27, 0.5, 0.75, 0.93].map((f) => f * H);
    const nodes = [];
    const place = (list, c) => {
      if (narrow) {
        list.forEach((d) => (d.y = ys[c]));
        const m = c === 2 ? 16 : 68;
        spread(list, m, W - m, (d, v) => (d.x = v));
      } else {
        list.forEach((d) => (d.x = xs[c]));
        spread(list, 40, Math.min(H, 520) - 20, (d, v) => (d.y = v));
      }
      nodes.push(...list);
    };
    place([...(byRole.get("person") ?? []), ...(byRole.get("college") ?? [])], 0);
    place(byRole.get("credential") ?? [], 1);
    place(byRole.get("job") ?? [], 3);
    place(byRole.get("employer") ?? [], 4);
    // Order skills by the average position of what points at them, to reduce crossings
    const pos = new Map(nodes.map((d) => [d.iri, narrow ? d.x : d.y]));
    const skills = (byRole.get("skill") ?? []).map((d) => {
      const refs = all.filter((q) => q.o === d.iri).map((q) => pos.get(q.s)).filter((v) => v != null);
      return {...d, key: d3.mean(refs) ?? 0};
    });
    skills.sort((a, b) => a.key - b.key);
    place(skills, 2);
    return nodes;
  }

  // The merged view runs top-to-bottom on narrow screens; everything else runs left-to-right.
  let vertical = false;
  const curve = (a, b) => {
    // Links between nodes stacked in one column (or row) bow outward instead
    // of running straight through the nodes between them.
    if (!vertical && Math.abs(a.x - b.x) < 1) {
      const k = Math.min(90, 18 + Math.abs(b.y - a.y) * 0.35);
      return `M${a.x},${a.y} C${a.x + k},${a.y} ${b.x + k},${b.y} ${b.x},${b.y}`;
    }
    if (vertical && Math.abs(a.y - b.y) < 1) {
      const k = Math.min(60, 14 + Math.abs(b.x - a.x) * 0.3);
      return `M${a.x},${a.y} C${a.x},${a.y + k} ${b.x},${b.y + k} ${b.x},${b.y}`;
    }
    return vertical
      ? d3.linkVertical()({source: [a.x, a.y], target: [b.x, b.y]})
      : d3.linkHorizontal()({source: [a.x, a.y], target: [b.x, b.y]});
  };

  function render(mode) {
    const merged = mode === "merged";
    // Exiting links keep the old orientation during the tween; that is imperceptible.
    vertical = merged && narrow;
    const nodes = merged ? layoutMerged() : layoutSeparate();
    const byId = new Map(nodes.map((d) => [d.id, d]));
    const key = (i, iri) => (merged ? iri : `${i}|${iri}`);
    const edges = [];
    const seenEdge = new Set();
    perPanel.forEach((qs, i) =>
      qs.forEach((q) => {
        const id = `${key(i, q.s)} ${q.p} ${key(i, q.o)}`;
        if (seenEdge.has(id)) return;
        seenEdge.add(id);
        edges.push({id, a: byId.get(key(i, q.s)), b: byId.get(key(i, q.o)), hot: merged && onPath(q), label: PREDICATE_LABEL[q.p] ?? q.p});
      })
    );

    heads.transition().duration(400).attr("opacity", merged ? 0 : 1);
    rules.transition().duration(400).attr("opacity", merged ? 0 : 1);
    hoverLabel.attr("opacity", 0);

    // Where every node starts this transition: its old spot, or (when merging)
    // the average of the copies it is replacing, or (when splitting) the merged node.
    const prev = current;
    current = new Map(nodes.map((d) => [d.id, d]));
    const start = (d) => {
      if (prev.has(d.id)) return prev.get(d.id);
      const copies = [...prev.values()].filter((p) => p.iri === d.iri);
      return copies.length ? {x: d3.mean(copies, (c) => c.x), y: d3.mean(copies, (c) => c.y)} : d;
    };
    const goal = (d) => {
      const direct = current.get(d.id) ?? current.get(d.iri);
      if (direct) return direct;
      const copies = nodes.filter((n) => n.iri === d.iri);
      return copies.length ? {x: d3.mean(copies, (c) => c.x), y: d3.mean(copies, (c) => c.y)} : d;
    };

    // Links travel with their endpoints: interpolate the curve frame by frame.
    const travel = (from, to) => (d) => {
      const a0 = from(d.a), b0 = from(d.b), a1 = to(d.a), b1 = to(d.b);
      return (t) => {
        const lerp = (p, q) => ({x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t});
        return curve(lerp(a0, a1), lerp(b0, b1));
      };
    };
    const DURATION = 700;
    const ease = d3.easeCubicInOut;

    gLinks
      .selectAll("path")
      .data(edges, (d) => d.id)
      .join(
        (e) => e.append("path").attr("opacity", 0).attr("d", (d) => curve(start(d.a), start(d.b))),
        (u) => u,
        (x) =>
          x
            .transition()
            .duration(DURATION)
            .ease(ease)
            .attrTween("d", travel((n) => n, goal))
            .attr("opacity", 0)
            .remove()
      )
      .attr("stroke", (d) => (d.hot ? "var(--accent)" : merged ? "var(--edge-light)" : "var(--edge)"))
      .attr("stroke-width", (d) => (d.hot ? 1.75 : 1.25))
      .transition()
      .duration(DURATION)
      .ease(ease)
      .attrTween("d", travel(start, (n) => n))
      .attr("opacity", 1);

    const labelFor = (d) => (d.role === "skill" && merged && narrow ? "" : short(index.label(d.iri)));
    // Separate view: entities labelled to the left, skills to the right.
    // Merged view: entities labelled above, skills to the right.
    const labelAttrs = (sel) =>
      sel
        .attr("class", (d) => (d.role === "skill" ? "faint" : "label"))
        .attr("text-anchor", (d) => (d.role === "skill" ? "start" : merged ? "middle" : "end"))
        .attr("x", (d) => (d.role === "skill" ? 9 : merged ? 0 : -10))
        .attr("dy", (d) => (d.role === "skill" || !merged ? "0.35em" : "-0.9em"))
        .text(labelFor);
    const node = gNodes
      .selectAll("g")
      .data(nodes, (d) => d.id)
      .join(
        (e) => {
          const g = e.append("g").attr("transform", (d) => `translate(${start(d).x},${start(d).y})`);
          g.append("circle");
          g.append("text");
          g.append("title");
          return g;
        },
        (u) => u,
        (x) =>
          x
            .transition()
            .duration(DURATION)
            .ease(ease)
            .attr("transform", (d) => {
              const t = goal(d);
              return `translate(${t.x},${t.y})`;
            })
            .attr("opacity", 0)
            .remove()
      );

    node
      .transition()
      .duration(DURATION)
      .ease(ease)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("opacity", 1);
    node
      .select("circle")
      .attr("r", (d) => (d.role === "skill" ? 3.5 : 5))
      .attr("fill", (d) =>
        d.role !== "skill" ? "var(--ink)" : merged ? (held.has(d.iri) && wanted.has(d.iri) ? "var(--accent)" : "var(--faint)") : count.get(d.iri) > 1 ? "var(--accent)" : "var(--faint)"
      );
    // Fade labels out, reposition them while nodes travel, fade them back in
    node
      .select("text")
      .interrupt()
      .transition()
      .duration(120)
      .attr("opacity", 0)
      .on("end", function () {
        labelAttrs(d3.select(this));
      })
      .transition()
      .delay(DURATION - 320)
      .duration(260)
      .attr("opacity", 1);
    node.select("title").text((d) => `${index.label(d.iri)}\n${d.iri}`);

    const visible = new Map();
    gLinks.selectAll("path").each(function (d) {
      visible.set(d.id, this);
    });
    const restyle = (el, d, on) =>
      d3
        .select(el)
        .attr("stroke", on ? "var(--ink)" : d.hot ? "var(--accent)" : merged ? "var(--edge-light)" : "var(--edge)")
        .attr("stroke-width", on ? 2.25 : d.hot ? 1.75 : 1.25);
    gHits
      .selectAll("path")
      .data(edges, (d) => d.id)
      .join("path")
      .attr("d", null)
      .on("pointerenter", function (event, d) {
        const el = visible.get(d.id);
        if (el) {
          restyle(el, d, true);
          el.parentNode.appendChild(el);
        }
        const [x, y] = d3.pointer(event, s.node());
        hoverLabel.text(d.label).attr("x", x + 8).attr("y", y - 8).attr("opacity", 1);
      })
      .on("pointermove", (event) => {
        const [x, y] = d3.pointer(event, s.node());
        hoverLabel.attr("x", x + 8).attr("y", y - 8);
      })
      .on("pointerleave", function (event, d) {
        const el = visible.get(d.id);
        if (el) restyle(el, d, false);
        hoverLabel.attr("opacity", 0);
      });
    clearTimeout(hitTimer);
    hitTimer = setTimeout(() => {
      gHits.selectAll("path").attr("d", (d) => curve(d.a, d.b));
    }, DURATION + 20);

    const jobs = merged ? nodes.filter((d) => d.role === "job" && objs(d.iri, "skills").some((x) => held.has(x))).length : 0;
    const via = merged ? [...held].filter((x) => wanted.has(x)).length : 0;
    return {jobs, skills: via};
  }

  const el = s.node();
  el.render = render;
  return el;
}

const SHORT = {
  "Associate of Applied Science in Mechatronics": "AAS Mechatronics",
  "Certificate in Industrial Data Analytics": "Data Analytics Cert.",
  "Robotics Fundamentals Badge": "Robotics Badge",
  "Riverbend Community College": "Riverbend CC",
  "Manufacturing Data Technician": "Data Technician"
};
function short(label) {
  const s = SHORT[label] ?? label;
  return s.length > 22 ? s.slice(0, 21) + "…" : s;
}

/** n organizations wired point-to-point, or each wired once to a shared vocabulary. */
export function networkMini(n, mode, size = 220) {
  const c = size / 2, R = size * 0.42;
  const s = svg(
    size,
    size,
    mode === "p2p"
      ? `${n} organizations connected pairwise by ${(n * (n - 1)) / 2} custom mappings`
      : `${n} organizations each mapped once to a shared vocabulary`
  );
  const pts = d3.range(n).map((i) => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    return [c + R * Math.cos(a), c + R * Math.sin(a)];
  });
  const edges = [];
  if (mode === "p2p") for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([pts[i], pts[j]]);
  else for (const p of pts) edges.push([p, [c, c]]);
  const color = mode === "p2p" ? "var(--accent-2)" : "var(--accent)";
  s.append("g")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("x1", (e) => e[0][0])
    .attr("y1", (e) => e[0][1])
    .attr("x2", (e) => e[1][0])
    .attr("y2", (e) => e[1][1])
    .attr("stroke", mode === "p2p" ? `color-mix(in srgb, ${color} ${Math.round(Math.max(35, Math.min(80, 1600 / edges.length)))}%, var(--bg))` : color)
    .attr("stroke-width", mode === "p2p" ? 1 : 1.5);
  if (mode !== "p2p") s.append("circle").attr("cx", c).attr("cy", c).attr("r", 7).attr("fill", "var(--accent)");
  s.append("g")
    .selectAll("circle")
    .data(pts)
    .join("circle")
    .attr("cx", (p) => p[0])
    .attr("cy", (p) => p[1])
    .attr("r", Math.max(2.5, Math.min(5, 50 / n)))
    .attr("fill", "var(--ink)");
  return s.node();
}
