import * as d3 from "d3";
import {PREFIXES, RDF_TYPE, KINDS, shortLabel} from "./rdf.js";
import {symbolPath, tooltip, nodeTooltipHtml} from "./forceGraph.js";

const SKIP = new Set([
  RDF_TYPE,
  PREFIXES.schema + "teaches",
  PREFIXES.schema + "recognizedBy",
  PREFIXES.skos + "inScheme",
  PREFIXES.skos + "broader"
]);

/**
 * Three independently published datasets that snap together on merge.
 * panels: [{graph, title, subtitle}]
 */
export function mergeViz({quads, index, panels, width, height = 600, invalidation}) {
  const tip = tooltip();
  const narrow = width < 700;
  const W = width;
  const H = narrow ? 900 : height;

  // Per-panel edge lists (resource → resource only)
  const perPanel = panels.map((p) =>
    quads.filter((q) => q.graph.value === p.graph && q.object.termType === "NamedNode" && !SKIP.has(q.predicate.value))
  );
  const iriCount = new Map();
  perPanel.forEach((qs) => {
    const set = new Set(qs.flatMap((q) => [q.subject.value, q.object.value]));
    for (const iri of set) iriCount.set(iri, (iriCount.get(iri) ?? 0) + 1);
  });

  const columnX = (i) => (narrow ? W / 2 : (W / panels.length) * (i + 0.5));
  const columnY = (i) => (narrow ? (H / panels.length) * (i + 0.5) : H / 2 + 14);

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, W, H])
    .attr("width", W)
    .attr("height", H)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font-family", "var(--font-body)")
    .attr("role", "img")
    .attr("aria-label", "Three separately published datasets merging into one connected graph");

  // Panel backgrounds
  const gPanels = svg.append("g");
  const panelSel = gPanels
    .selectAll("g")
    .data(panels)
    .join("g")
    .attr("transform", (d, i) =>
      narrow ? `translate(6,${(H / panels.length) * i + 4})` : `translate(${(W / panels.length) * i + 5},4)`
    );
  const pw = narrow ? W - 12 : W / panels.length - 10;
  const ph = narrow ? H / panels.length - 8 : H - 8;
  panelSel
    .append("rect")
    .attr("width", pw)
    .attr("height", ph)
    .attr("rx", 14)
    .attr("fill", "var(--surface-2)")
    .attr("stroke", "var(--rule)");
  panelSel
    .append("text")
    .attr("x", 14)
    .attr("y", 24)
    .attr("font-weight", 700)
    .attr("font-size", 13)
    .attr("fill", "var(--ink)")
    .text((d) => d.title);
  panelSel
    .append("text")
    .attr("x", 14)
    .attr("y", 41)
    .attr("font-size", 10.5)
    .attr("font-family", "var(--font-code)")
    .attr("fill", "var(--ink-3)")
    .text((d) => d.subtitle);

  const mergedLabel = svg
    .append("g")
    .attr("opacity", 0)
    .attr("transform", `translate(${W / 2}, 26)`);
  mergedLabel
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-weight", 700)
    .attr("font-size", 13)
    .attr("fill", "var(--ink)")
    .text("One graph — the union of all three datasets");
  mergedLabel
    .append("text")
    .attr("y", 17)
    .attr("text-anchor", "middle")
    .attr("font-size", 10.5)
    .attr("fill", "var(--ink-3)")
    .text("Nodes with the same IRI are the same thing, so they fuse automatically");

  svg
    .append("defs")
    .append("marker")
    .attr("id", "merge-arrow")
    .attr("viewBox", "0 -4 8 8")
    .attr("refX", 8)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-3.5L8,0L0,3.5")
    .attr("fill", "var(--edge)");

  const gLinks = svg.append("g");
  const gNodes = svg.append("g");
  let sim;
  const pos = new Map(); // key → {x,y}

  function build(mode) {
    const nodes = new Map();
    const links = new Map();
    perPanel.forEach((qs, i) => {
      for (const q of qs) {
        const key = (iri) => (mode === "merged" ? iri : `${i}|${iri}`);
        for (const iri of [q.subject.value, q.object.value]) {
          const k = key(iri);
          if (!nodes.has(k))
            nodes.set(k, {
              id: k,
              iri,
              panel: i,
              kind: index.kind(iri),
              label: index.label(iri) ?? iri,
              shared: iriCount.get(iri) > 1
            });
        }
        const lk = `${key(q.subject.value)} ${q.predicate.value} ${key(q.object.value)}`;
        if (!links.has(lk)) links.set(lk, {id: lk, source: key(q.subject.value), target: key(q.object.value), predicate: q.predicate.value});
      }
    });
    return {nodes: [...nodes.values()], links: [...links.values()]};
  }

  function seed(nodes, mode) {
    for (const d of nodes) {
      if (pos.has(d.id)) {
        Object.assign(d, pos.get(d.id));
      } else if (mode === "merged") {
        const copies = panels.map((_, i) => pos.get(`${i}|${d.iri}`)).filter(Boolean);
        if (copies.length) {
          d.x = d3.mean(copies, (c) => c.x);
          d.y = d3.mean(copies, (c) => c.y);
        }
      } else {
        const m = pos.get(d.iri);
        if (m) {
          d.x = m.x + (Math.random() - 0.5) * 20;
          d.y = m.y + (Math.random() - 0.5) * 20;
        }
      }
      if (d.x == null) {
        d.x = columnX(d.panel) + (Math.random() - 0.5) * 60;
        d.y = columnY(d.panel) + (Math.random() - 0.5) * 60;
      }
    }
  }

  function render(mode) {
    const {nodes, links} = build(mode);
    seed(nodes, mode);
    sim?.stop();

    panelSel.transition().duration(600).attr("opacity", mode === "merged" ? 0 : 1);
    mergedLabel.transition().duration(600).attr("opacity", mode === "merged" ? 1 : 0);

    const link = gLinks
      .selectAll("line")
      .data(links, (l) => l.id)
      .join(
        (enter) => enter.append("line").attr("stroke-opacity", 0),
        (update) => update,
        (exit) => exit.transition().duration(300).attr("stroke-opacity", 0).remove()
      )
      .attr("stroke", "var(--edge)")
      .attr("stroke-width", 1.2)
      .attr("marker-end", "url(#merge-arrow)");
    link.transition().delay(250).duration(500).attr("stroke-opacity", 0.9);

    const node = gNodes
      .selectAll("g.n")
      .data(nodes, (d) => d.id)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "n").attr("opacity", 0);
          g.append("circle")
            .attr("class", "ring")
            .attr("fill", "none")
            .attr("stroke", "var(--c-skill)")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "2 2")
            .attr("r", 0);
          g.append("path")
            .attr("d", (d) => symbolPath(d.kind, d.kind === "skill" ? 1.15 : 0.9))
            .attr("fill", (d) => (KINDS[d.kind] ?? KINDS.other).color)
            .attr("stroke", "var(--bg)")
            .attr("stroke-width", 1.5);
          g.append("text")
            .attr("y", (d) => (d.kind === "skill" ? 15 : 19))
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => (d.kind === "skill" ? 9.5 : 10.5))
            .attr("font-weight", (d) => (d.kind === "skill" ? 500 : 650))
            .attr("fill", (d) => (d.kind === "skill" ? "var(--ink-2)" : "var(--ink)"))
            .attr("stroke", "var(--bg)")
            .attr("stroke-width", 3)
            .attr("paint-order", "stroke")
            .text((d) => shortLabel(d.label, d.kind === "skill" ? 18 : 24));
          g.transition().delay(200).duration(500).attr("opacity", 1);
          return g;
        },
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(650)
            .ease(d3.easeCubicInOut)
            .attr("transform", (d) => {
              const target = nodes.find((n) => n.iri === d.iri);
              return `translate(${target?.x ?? d.x},${target?.y ?? d.y})`;
            })
            .attr("opacity", 0)
            .remove()
      );

    node
      .select("text")
      .transition()
      .duration(500)
      .attr("opacity", (d) => (mode === "separate" && d.kind === "skill" ? 0 : 1));

    node
      .select("circle.ring")
      .transition()
      .duration(500)
      .attr("r", (d) => (mode === "separate" && d.shared && d.kind === "skill" ? 11 : 0));

    node
      .on("pointerenter", (event, d) => {
        const extra =
          mode === "separate" && d.shared
            ? `<div style="margin-top:4px;color:var(--ink-2)">Appears in ${iriCount.get(d.iri)} datasets — same IRI</div>`
            : "";
        tip.show(nodeTooltipHtml(d) + extra, event);
      })
      .on("pointermove", (event) => tip.move(event))
      .on("pointerleave", () => tip.hide());

    const xTarget = (d) => (mode === "merged" ? W / 2 : columnX(d.panel));
    const yTarget = (d) => (mode === "merged" ? H / 2 + 20 : columnY(d.panel));
    const boxW = mode === "merged" ? W : narrow ? W : W / panels.length;
    const boxH = mode === "merged" || !narrow ? H : H / panels.length;

    sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(mode === "merged" ? 62 : 46).strength(0.6))
      .force("charge", d3.forceManyBody().strength(mode === "merged" ? -230 : -150))
      .force("x", d3.forceX(xTarget).strength(mode === "merged" ? 0.06 : 0.14))
      .force("y", d3.forceY(yTarget).strength(mode === "merged" ? 0.09 : 0.12))
      .force("collide", d3.forceCollide((d) => (d.kind === "skill" ? 15 : 26)))
      .alpha(0.9);

    const live = new Set(nodes);
    sim.on("tick", () => {
      for (const d of nodes) {
        const cx = xTarget(d), cy = yTarget(d);
        const hw = boxW / 2 - 24, hh = boxH / 2 - 34;
        d.x = Math.max(cx - hw, Math.min(cx + hw, d.x));
        d.y = Math.max(cy - hh + 22, Math.min(cy + hh, d.y));
        pos.set(d.id, {x: d.x, y: d.y});
      }
      link.each(function (l) {
        const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const r = l.target.kind === "skill" ? 8 : 12;
        d3.select(this)
          .attr("x1", l.source.x)
          .attr("y1", l.source.y)
          .attr("x2", l.target.x - (dx / dist) * r)
          .attr("y2", l.target.y - (dy / dist) * r);
      });
      gNodes.selectAll("g.n").filter((d) => live.has(d)).attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Path analysis for the stat tiles
    const out = d3.group(links, (l) => l.source.id ?? l.source);
    const person = nodes.find((d) => d.kind === "person");
    const jobs = nodes.filter((d) => d.kind === "job");
    let reachable = 0;
    let viaSkills = new Set();
    if (person) {
      const personSkills = new Set();
      for (const l of out.get(person.id) ?? []) {
        const t = l.target.id ?? l.target;
        if (l.predicate === PREFIXES.schema + "knowsAbout") personSkills.add(t);
        if (l.predicate === PREFIXES.schema + "hasCredential")
          for (const l2 of out.get(t) ?? []) if (l2.predicate === PREFIXES.schema + "competencyRequired") personSkills.add(l2.target.id ?? l2.target);
      }
      for (const j of jobs) {
        const req = (out.get(j.id) ?? []).filter((l) => l.predicate === PREFIXES.schema + "skills").map((l) => l.target.id ?? l.target);
        const hit = req.filter((s) => personSkills.has(s));
        if (hit.length) reachable++;
        hit.forEach((s) => viaSkills.add(s));
      }
    }
    return {nodes: nodes.length, links: links.length, jobsReachable: reachable, sharedSkills: viaSkills.size};
  }

  invalidation?.then(() => sim?.stop());
  const el = svg.node();
  el.render = render;
  return el;
}
