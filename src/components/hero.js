import * as d3 from "d3";
import {quadsToGraph, PREFIXES, shortLabel} from "./rdf.js";
import {symbolPath} from "./forceGraph.js";

// The hero is always dark, so it uses the dark-mode steps of the palette.
const HERO_COLORS = {
  person: "#3987e5",
  org: "#d95926",
  job: "#9085e9",
  program: "#199e70",
  credential: "#d55181",
  skill: "#e0a42a",
  other: "#8b8a83"
};

/** An animated constellation: the whole regional graph assembling itself. */
export function heroGraph(quads, {width, height, invalidation}) {
  const skip = new Set([PREFIXES.skos + "inScheme", PREFIXES.schema + "publisher", PREFIXES.schema + "recognizedBy"]);
  const g = quadsToGraph(
    quads.filter((q) => !skip.has(q.predicate.value)),
    {literals: "hide"}
  );
  const linked = new Set(g.links.flatMap((l) => [l.source, l.target]));
  const nodes = g.nodes.filter((d) => d.iri !== PREFIXES.sk + "framework" && linked.has(d.id));
  const ids = new Set(nodes.map((d) => d.id));
  const links = g.links.filter((l) => ids.has(l.source) && ids.has(l.target));

  const narrow = width < 760;
  const cx = narrow ? width / 2 : width * 0.78;
  const cy = narrow ? height * 0.8 : height / 2;
  const spread = narrow ? Math.min(width, 520) / 2.6 : Math.min(width * 0.2, 280);
  const minX = narrow ? 16 : width * 0.6;

  // Seed positions on a spiral so the layout is deterministic and pleasant
  nodes.forEach((d, i) => {
    const a = i * 2.399963;
    const r = Math.sqrt(i / nodes.length) * spread;
    d.x = cx + r * Math.cos(a);
    d.y = cy + r * Math.sin(a);
  });

  const sim = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(48).strength(0.35))
    .force("charge", d3.forceManyBody().strength(narrow ? -60 : -95))
    .force("x", d3.forceX(cx).strength(0.07))
    .force("y", d3.forceY(cy).strength(0.1))
    .force("collide", d3.forceCollide(14))
    .stop();
  for (let i = 0; i < 320; ++i) {
    sim.tick();
    for (const d of nodes) {
      d.x = Math.max(minX, Math.min(width - 70, d.x));
      d.y = Math.max(narrow ? height * 0.64 : 30, Math.min(height - (narrow ? 70 : 40), d.y));
    }
  }

  const svg = d3
    .create("svg")
    .attr("class", "hero-graph")
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid slice")
    .attr("aria-hidden", "true");

  const defs = svg.append("defs");
  const glow = defs.append("filter").attr("id", "hero-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", 3.2).attr("result", "b");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "b");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  // Order of appearance: skills framework first, then publishers, then people
  const order = ["skill", "org", "job", "program", "credential", "person", "other"];
  nodes.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  nodes.forEach((d, i) => (d.delay = 300 + i * 55));
  const delayOf = new Map(nodes.map((d) => [d.id, d.delay]));

  const linkSel = svg
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("x1", (l) => l.source.x)
    .attr("y1", (l) => l.source.y)
    .attr("x2", (l) => l.source.x)
    .attr("y2", (l) => l.source.y)
    .attr("stroke", (l) => HERO_COLORS[l.target.kind] ?? "#888")
    .attr("stroke-opacity", 0.32)
    .attr("stroke-width", 1);

  linkSel
    .transition()
    .delay((l) => Math.max(delayOf.get(l.source.id), delayOf.get(l.target.id)) + 120)
    .duration(700)
    .ease(d3.easeCubicOut)
    .attr("x2", (l) => l.target.x)
    .attr("y2", (l) => l.target.y);

  const nodeSel = svg
    .append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .attr("opacity", 0);

  nodeSel
    .append("path")
    .attr("d", (d) => symbolPath(d.kind, d.kind === "skill" ? 1.1 : 0.85))
    .attr("fill", (d) => HERO_COLORS[d.kind])
    .attr("filter", "url(#hero-glow)");

  nodeSel
    .filter((d) => (d.kind === "org" || d.kind === "person") && !narrow)
    .append("text")
    .attr("y", (d) => (d.kind === "skill" ? 15 : 19))
    .attr("text-anchor", "middle")
    .attr("font-size", (d) => (d.kind === "skill" ? 8.5 : 9.5))
    .attr("font-family", "var(--font-body)")
    .attr("fill", (d) => (d.kind === "skill" ? "#8e8d86" : "#c3c2b7"))
    .text((d) => shortLabel(d.label, 22));

  nodeSel
    .transition()
    .delay((d) => d.delay)
    .duration(600)
    .attr("opacity", 1);

  // Particles: data travelling along edges
  const particles = svg.append("g").attr("pointer-events", "none");
  const N = Math.min(26, links.length);
  const state = d3.range(N).map((i) => ({l: links[(i * 7) % links.length], t: Math.random(), speed: 0.0025 + Math.random() * 0.004}));
  const dots = particles
    .selectAll("circle")
    .data(state)
    .join("circle")
    .attr("r", 1.8)
    .attr("fill", "#fff")
    .attr("opacity", 0);

  let start = null;
  let raf;
  const phases = new Map(nodes.map((d, i) => [d.id, i * 1.7]));
  function frame(ts) {
    if (start == null) start = ts;
    const t = (ts - start) / 1000;
    const offset = (d) => ({x: d.x + Math.sin(t * 0.5 + phases.get(d.id)) * 2.5, y: d.y + Math.cos(t * 0.4 + phases.get(d.id)) * 2.5});
    nodeSel.attr("transform", (d) => {
      const o = offset(d);
      return `translate(${o.x},${o.y})`;
    });
    if (t > 4) {
      linkSel
        .attr("x1", (l) => offset(l.source).x)
        .attr("y1", (l) => offset(l.source).y)
        .attr("x2", (l) => offset(l.target).x)
        .attr("y2", (l) => offset(l.target).y);
      for (const p of state) {
        p.t += p.speed;
        if (p.t > 1) {
          p.t = 0;
          p.l = links[Math.floor(Math.random() * links.length)];
        }
      }
      dots
        .attr("cx", (p) => {
          const a = offset(p.l.source), b = offset(p.l.target);
          return a.x + (b.x - a.x) * p.t;
        })
        .attr("cy", (p) => {
          const a = offset(p.l.source), b = offset(p.l.target);
          return a.y + (b.y - a.y) * p.t;
        })
        .attr("fill", (p) => HERO_COLORS[p.l.target.kind])
        .attr("opacity", (p) => Math.sin(p.t * Math.PI) * 0.95);
    }
    raf = requestAnimationFrame(frame);
  }
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) raf = requestAnimationFrame(frame);
  else {
    nodeSel.interrupt().attr("opacity", 1);
    linkSel.interrupt().attr("x2", (l) => l.target.x).attr("y2", (l) => l.target.y);
  }
  invalidation?.then(() => cancelAnimationFrame(raf));

  const el = svg.node();
  el.stats = {nodes: nodes.length, links: links.length};
  return el;
}
