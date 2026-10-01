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
      .attr("stroke", "var(--md-outline)")
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
      .attr("stroke", "var(--md-outline)")
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
    g.append("circle").attr("cx", st.x).attr("cy", st.y).attr("r", 5).attr("fill", "var(--md-primary)");
    g.append("text").attr("class", "mono strong").attr("x", st.x - 4).attr("y", st.y - 20).text(st.subject);

    const leaf = g.append("g").selectAll("g").data(st.rows).join("g").attr("transform", (r) => `translate(${r.x},${r.y})`);
    leaf.filter((r) => !r.literal).append("circle").attr("r", 5).attr("fill", "var(--md-on-surface)");
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

// Text sizing inside figures; colors come from the page stylesheet.
const FIGURE_CSS = `
  svg.fig text { font-family: var(--sans-serif); }
  svg.fig .label { font-size: 12.5px; }
  svg.fig .faint { font-size: 11.5px; }
  svg.fig .mono { font-family: var(--monospace); font-size: 11.5px; }
  svg.fig .mono.strong { font-weight: 500; }
  svg.fig .role { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; }
  svg.fig .label, svg.fig .faint, svg.fig .mono { paint-order: stroke; stroke-width: 4px; stroke-linejoin: round; }
`;

function svg(width, height, label) {
  const s = d3.create("svg").attr("class", "fig");
  s.append("style").text(FIGURE_CSS);
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
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-3.5L8,0L0,3.5")
    .attr("fill", "var(--md-on-surface-variant)");
}

/** Figure 1 — three facts chained into a path. */
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
  const H = narrow ? 360 : 128;
  const pos = nodes.map((_, i) =>
    narrow ? {x: 24, y: 40 + i * 92} : {x: 70 + (i * (W - 140)) / (nodes.length - 1), y: 62}
  );
  const s = svg(W, H, "Maria holds a Mechatronics degree, which certifies PLC Programming, which the Automation Technician job requires.");
  arrowhead(s, "chain-arrow");

  if (!narrow) {
    const roles = [
      {x: pos[0].x, t: "subject"},
      {x: (pos[0].x + pos[1].x) / 2, t: "predicate"},
      {x: pos[1].x, t: "object"}
    ];
    s.append("g")
      .selectAll("text")
      .data(roles)
      .join("text")
      .attr("class", "role")
      .attr("x", (d) => d.x)
      .attr("y", 10)
      .attr("text-anchor", "middle")
      .text((d) => d.t);
  }

  for (const e of edges) {
    const a = pos[e.from], b = pos[e.to];
    const dir = narrow ? Math.sign(b.y - a.y) : Math.sign(b.x - a.x);
    const gap = 9;
    s.append("line")
      .attr("x1", narrow ? a.x : a.x + dir * gap)
      .attr("y1", narrow ? a.y + dir * gap : a.y)
      .attr("x2", narrow ? b.x : b.x - dir * gap)
      .attr("y2", narrow ? b.y - dir * gap : b.y)
      .attr("stroke", "var(--md-on-surface-variant)")
      .attr("marker-end", "url(#chain-arrow)");
    s.append("text")
      .attr("class", "mono")
      .attr("x", narrow ? a.x + 16 : (a.x + b.x) / 2)
      .attr("y", narrow ? (a.y + b.y) / 2 + 4 : a.y - 10)
      .attr("text-anchor", narrow ? "start" : "middle")
      .text(e.label);
  }

  const g = s.append("g").selectAll("g").data(nodes).join("g").attr("transform", (d, i) => `translate(${pos[i].x},${pos[i].y})`);
  g.append("circle").attr("r", 5).attr("fill", (d) => (d.accent ? "var(--md-primary)" : "var(--md-on-surface)"));
  g.append("text")
    .attr("x", narrow ? 0 : 0)
    .attr("y", narrow ? 0 : 26)
    .attr("dx", narrow ? 16 : 0)
    .attr("dy", narrow ? "0.35em" : 0)
    .attr("text-anchor", narrow ? "start" : "middle")
    .attr("class", "label")
    .text((d) => d.label);
  if (!narrow)
    g.append("text").attr("y", 42).attr("text-anchor", "middle").attr("class", "faint").text((d) => d.sub);
  return s.node();
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
    .attr("stroke", "var(--md-primary)")
    .attr("stroke-width", 1.25);
  paths.each(function () {
    const L = this.getTotalLength();
    d3.select(this).attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L);
  });

  const rows = s.append("g").selectAll("g").data(PHRASES).join("g").attr("transform", (d, i) => `translate(${left[i].x},${left[i].y})`);
  rows.append("text").attr("class", "faint").attr("y", -18).text((d) => d.source);
  rows.append("text").attr("class", "label").attr("y", 0).text((d) => `“${d.text}”`);

  const t = s.append("g").attr("transform", `translate(${target.x},${target.y})`);
  const dot = t.append("circle").attr("r", 5).attr("fill", "var(--md-outline)");
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
    dot.transition().duration(400).attr("fill", on ? "var(--md-primary)" : "var(--md-outline)");
    title.text(on ? "PLC Programming" : "No match");
    sub.text(on ? "sk:plc-programming" : "four unrelated strings");
  };
  el.update("text");
  return el;
}

/** Figure 3 — independently published graphs that merge on shared IRIs. */
const SKIP = new Set([RDF_TYPE, SCHEMA + "teaches", SCHEMA + "provider", SCHEMA + "educationalCredentialAwarded", SKOS + "inScheme", SKOS + "broader"]);
const ROLE_ORDER = ["person", "college", "credential", "skill", "job", "employer"];

export function mergeFigure({quads, index, panels, width}) {
  const narrow = width < 560;
  const W = width;
  const H = narrow ? 720 : 440;
  const perPanel = panels.map((p) => quads.filter((q) => q.g === p.graph && !q.literal && !SKIP.has(q.p)));
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
    .attr("x", (d, i) => (narrow ? 0 : (W / panels.length) * (i + 0.5)))
    .attr("y", (d, i) => (narrow ? (H / panels.length) * i + 12 : 12))
    .attr("text-anchor", narrow ? "start" : "middle")
    .text((d) => d.title);
  const gLinks = s.append("g").attr("fill", "none");
  const gNodes = s.append("g");
  let current = new Map();

  // Evenly spread a list of nodes along one axis
  const spread = (list, from, to, set) => {
    const n = list.length;
    list.forEach((d, i) => set(d, n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1)));
  };

  function layoutSeparate() {
    const nodes = [];
    perPanel.forEach((qs, i) => {
      const iris = [...new Set(qs.flatMap((q) => [q.s, q.o]))];
      const ents = iris.filter((x) => role(x) !== "skill").sort((a, b) => ROLE_ORDER.indexOf(role(a)) - ROLE_ORDER.indexOf(role(b)));
      const skills = iris.filter((x) => role(x) === "skill").sort();
      const mk = (iri) => ({id: `${i}|${iri}`, iri, role: role(iri), panel: i});
      const E = ents.map(mk), S = skills.map(mk);
      if (narrow) {
        const top = (H / panels.length) * i + 34, bot = (H / panels.length) * (i + 1) - 14;
        E.forEach((d) => (d.x = W * 0.42));
        S.forEach((d) => (d.x = W - 12));
        spread(E, top + 6, bot - 6, (d, v) => (d.y = v));
        spread(S, top, bot, (d, v) => (d.y = v));
      } else {
        const left = (W / panels.length) * i, pw = W / panels.length;
        E.forEach((d) => (d.x = left + pw * 0.45));
        S.forEach((d) => (d.x = left + pw * 0.9));
        spread(E, 70, H - 40, (d, v) => (d.y = v));
        spread(S, 40, H - 16, (d, v) => (d.y = v));
      }
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
        spread(list, 40, H - 20, (d, v) => (d.y = v));
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

  const curve = (a, b) =>
    narrow ? d3.linkVertical()({source: [a.x, a.y], target: [b.x, b.y]}) : d3.linkHorizontal()({source: [a.x, a.y], target: [b.x, b.y]});

  function render(mode) {
    const merged = mode === "merged";
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
        edges.push({id, a: byId.get(key(i, q.s)), b: byId.get(key(i, q.o)), hot: merged && onPath(q)});
      })
    );

    heads.transition().duration(400).attr("opacity", merged ? 0 : 1);

    gLinks
      .selectAll("path")
      .data(edges, (d) => d.id)
      .join(
        (e) => e.append("path").attr("opacity", 0),
        (u) => u,
        (x) => x.transition().duration(250).attr("opacity", 0).remove()
      )
      .attr("d", (d) => curve(d.a, d.b))
      .attr("stroke", (d) => (d.hot ? "var(--md-primary)" : "var(--md-outline)"))
      .attr("stroke-width", (d) => (d.hot ? 1.5 : 1))
      .transition()
      .delay(merged ? 650 : 450)
      .duration(500)
      .attr("opacity", (d) => (merged && !d.hot ? 0.55 : 1));

    const prev = current;
    current = new Map(nodes.map((d) => [d.id, d]));
    const start = (d) => {
      if (prev.has(d.id)) return prev.get(d.id);
      const copies = [...prev.values()].filter((p) => p.iri === d.iri);
      return copies.length ? {x: d3.mean(copies, (c) => c.x), y: d3.mean(copies, (c) => c.y)} : d;
    };

    const labelFor = (d) => (d.role === "skill" && (!merged || narrow) ? "" : short(index.label(d.iri)));
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
            .duration(650)
            .ease(d3.easeCubicInOut)
            .attr("transform", (d) => {
              const t = current.get(d.iri) ?? d;
              return `translate(${t.x},${t.y})`;
            })
            .attr("opacity", 0)
            .remove()
      );

    node
      .transition()
      .duration(650)
      .ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("opacity", 1);
    node
      .select("circle")
      .attr("r", (d) => (d.role === "skill" ? 3.5 : 5))
      .attr("fill", (d) =>
        d.role !== "skill" ? "var(--md-on-surface)" : merged ? (held.has(d.iri) && wanted.has(d.iri) ? "var(--md-primary)" : "var(--md-outline)") : count.get(d.iri) > 1 ? "var(--md-primary)" : "var(--md-outline)"
      );
    node
      .select("text")
      .attr("class", (d) => (d.role === "skill" ? "faint" : "label"))
      .attr("text-anchor", (d) => (d.role === "skill" ? "start" : "middle"))
      .attr("x", (d) => (d.role === "skill" ? 9 : 0))
      .attr("dy", (d) => (d.role === "skill" ? "0.35em" : "-0.9em"))
      .text(labelFor);
    node.select("title").text((d) => `${index.label(d.iri)}\n${d.iri}`);

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
  const color = mode === "p2p" ? "var(--md-tertiary)" : "var(--md-primary)";
  s.append("g")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("x1", (e) => e[0][0])
    .attr("y1", (e) => e[0][1])
    .attr("x2", (e) => e[1][0])
    .attr("y2", (e) => e[1][1])
    .attr("stroke", color)
    .attr("stroke-opacity", mode === "p2p" ? Math.max(0.2, Math.min(0.8, 24 / edges.length)) : 0.8)
    .attr("stroke-width", 1);
  if (mode !== "p2p") s.append("circle").attr("cx", c).attr("cy", c).attr("r", 7).attr("fill", "var(--md-primary)");
  s.append("g")
    .selectAll("circle")
    .data(pts)
    .join("circle")
    .attr("cx", (p) => p[0])
    .attr("cy", (p) => p[1])
    .attr("r", Math.max(2.5, Math.min(5, 50 / n)))
    .attr("fill", "var(--md-on-surface)");
  return s.node();
}
