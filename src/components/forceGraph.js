import * as d3 from "d3";
import {KINDS, shortLabel} from "./rdf.js";

let uid = 0;
let tipEl;

export function tooltip() {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.className = "tip";
    tipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tipEl);
  }
  return {
    show(html, event) {
      tipEl.innerHTML = html;
      tipEl.style.opacity = 1;
      this.move(event);
    },
    move(event) {
      const pad = 14;
      const r = tipEl.getBoundingClientRect();
      let x = event.clientX + pad;
      let y = event.clientY + pad;
      if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - pad;
      if (y + r.height > window.innerHeight - 8) y = event.clientY - r.height - pad;
      tipEl.style.left = `${x}px`;
      tipEl.style.top = `${y}px`;
    },
    hide() {
      tipEl.style.opacity = 0;
    }
  };
}

export function symbolPath(kind, scale = 1) {
  const k = KINDS[kind] ?? KINDS.other;
  const type =
    {circle: d3.symbolCircle, square: d3.symbolSquare, diamond: d3.symbolDiamond, triangle: d3.symbolTriangle, star: d3.symbolStar}[
      k.symbol
    ] ?? d3.symbolCircle;
  return d3.symbol(type, k.size * scale)();
}

export function nodeTooltipHtml(d) {
  const k = KINDS[d.kind] ?? KINDS.other;
  if (d.kind === "literal") {
    const lit = d.literal;
    const meta = lit?.language ? `language: ${lit.language}` : lit?.datatype ? `datatype: ${lit.datatype.value.replace("http://www.w3.org/2001/XMLSchema#", "xsd:")}` : "";
    return `<div class="tip-type" style="color:${k.color}">Literal</div><div><b>${escapeHtml(d.label)}</b></div><div class="tip-iri">${meta}</div>`;
  }
  return `<div class="tip-type" style="color:${k.color}">${k.label}</div><div><b>${escapeHtml(d.label)}</b></div><div class="tip-iri">${escapeHtml(
    d.iri ?? ""
  )}</div>`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
}

/** A legend of node kinds (shape + color + text). */
export function kindLegend(kinds = ["person", "org", "job", "program", "credential", "skill"]) {
  const div = document.createElement("div");
  div.className = "legend";
  for (const kind of kinds) {
    const k = KINDS[kind];
    const span = document.createElement("span");
    const shape =
      kind === "literal"
        ? `<rect x="-8" y="-6" width="16" height="12" rx="3" fill="var(--surface-2)" stroke="${k.color}" />`
        : `<path d="${symbolPath(kind, kind === "skill" ? 1.6 : 0.7)}" fill="${k.color}" />`;
    span.innerHTML = `<svg width="16" height="16" viewBox="-8 -8 16 16">${shape}</svg>${k.label}`;
    div.appendChild(span);
  }
  return div;
}

/**
 * A force-directed RDF graph.
 * nodes: {id, label, kind, iri?}  links: {source, target, plabel}
 */
export function forceGraph({
  nodes,
  links,
  width = 800,
  height = 480,
  highlight = null, // Set of node ids to emphasize
  highlightLinks = null, // optional predicate (link) => boolean
  positions = null, // Map id → {x, y} to persist layout between renders
  edgeLabels = "auto",
  nodeLabels = "auto",
  charge = -240,
  distance = 70,
  invalidation,
  ariaLabel = "Graph of RDF resources and the relationships between them",
  onNodeClick = null,
  fitPadding = 28,
  gravity = 0.06,
  maxLabel = 26
}) {
  const id = ++uid;
  const tip = tooltip();
  nodes = nodes.map((d) => {
    const p = positions?.get(d.id);
    return {...d, ...(p ? {x: p.x, y: p.y} : {})};
  });
  const byId = new Map(nodes.map((d) => [d.id, d]));
  links = links
    .filter((l) => byId.has(l.source?.id ?? l.source) && byId.has(l.target?.id ?? l.target))
    .map((l) => ({...l, source: l.source?.id ?? l.source, target: l.target?.id ?? l.target}));

  // Curvature for parallel edges between the same pair
  const pairCount = new Map();
  for (const l of links) {
    const key = [l.source, l.target].sort().join("|");
    l.pairIndex = pairCount.get(key) ?? 0;
    pairCount.set(key, l.pairIndex + 1);
  }
  for (const l of links) {
    const key = [l.source, l.target].sort().join("|");
    const n = pairCount.get(key);
    l.curve = n === 1 ? 0 : (l.pairIndex - (n - 1) / 2) * 0.35 * (l.source < l.target ? 1 : -1);
  }

  const degree = new Map();
  for (const l of links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }
  const neighbors = new Map(nodes.map((d) => [d.id, new Set([d.id])]));
  for (const l of links) {
    neighbors.get(l.source).add(l.target);
    neighbors.get(l.target).add(l.source);
  }

  const showEdgeLabels = edgeLabels === "auto" ? links.length <= 22 : !!edgeLabels;
  const labelFor = (d) => {
    if (nodeLabels === "none") return false;
    if (nodeLabels === "all") return true;
    if (highlight && highlight.has(d.id)) return true;
    if (d.kind === "literal") return true;
    if (d.kind === "skill") return nodes.length <= 45 || (degree.get(d.id) ?? 0) >= 3;
    return true;
  };

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("aria-label", ariaLabel)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font-family", "var(--font-body)")
    .style("overflow", "visible");

  const defs = svg.append("defs");
  for (const [name, color] of [
    ["n", "var(--edge)"],
    ["h", "var(--edge-strong)"]
  ]) {
    defs
      .append("marker")
      .attr("id", `arrow-${name}-${id}`)
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3.5L8,0L0,3.5")
      .attr("fill", color);
  }

  const gLinks = svg.append("g").attr("fill", "none");
  const gEdgeLabels = svg.append("g").attr("pointer-events", "none");
  const gNodes = svg.append("g");

  const isHotLink = (l) => {
    if (highlightLinks) return highlightLinks(l);
    if (!highlight) return false;
    return highlight.has(l.source.id ?? l.source) && highlight.has(l.target.id ?? l.target);
  };

  const link = gLinks
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("stroke", (l) => (isHotLink(l) ? "var(--edge-strong)" : "var(--edge)"))
    .attr("stroke-width", (l) => (isHotLink(l) ? 1.8 : 1.1))
    .attr("stroke-opacity", (l) => (highlight && !isHotLink(l) ? 0.25 : 0.9))
    .attr("marker-end", (l) => `url(#arrow-${isHotLink(l) ? "h" : "n"}-${id})`);

  const edgeLabel = gEdgeLabels
    .selectAll("text")
    .data(links)
    .join("text")
    .attr("font-size", 9.5)
    .attr("font-family", "var(--font-code)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--ink-3)")
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .attr("opacity", (l) => (showEdgeLabels && (!highlight || isHotLink(l)) ? 1 : 0))
    .text((l) => l.plabel);

  const node = gNodes
    .selectAll("g")
    .data(nodes, (d) => d.id)
    .join("g")
    .attr("cursor", onNodeClick ? "pointer" : "grab")
    .attr("opacity", (d) => (highlight && !highlight.has(d.id) ? 0.22 : 1));

  // Literal boxes
  const litNodes = node.filter((d) => d.kind === "literal");
  litNodes.each(function (d) {
    const g = d3.select(this);
    const text = g
      .append("text")
      .attr("font-size", 10.5)
      .attr("font-family", "var(--font-code)")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "var(--ink-2)")
      .text(shortLabel(`“${d.label}”`, 30));
    const w = Math.min(220, 7 * text.text().length + 14);
    d.w = w;
    g.insert("rect", "text")
      .attr("x", -w / 2)
      .attr("y", -10)
      .attr("width", w)
      .attr("height", 20)
      .attr("rx", 5)
      .attr("fill", "var(--surface-2)")
      .attr("stroke", "var(--c-literal)")
      .attr("stroke-dasharray", "3 2");
  });

  // Resource symbols
  const resNodes = node.filter((d) => d.kind !== "literal");
  resNodes
    .append("path")
    .attr("d", (d) => symbolPath(d.kind, d.kind === "skill" ? 1 + Math.min(4, degree.get(d.id) ?? 0) * 0.35 : 1))
    .attr("fill", (d) => (KINDS[d.kind] ?? KINDS.other).color)
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 2);

  resNodes
    .filter(labelFor)
    .append("text")
    .attr("font-size", (d) => (d.kind === "skill" ? 10.5 : 11.5))
    .attr("font-weight", (d) => (d.kind === "skill" ? 500 : 600))
    .attr("x", 0)
    .attr("y", (d) => (d.kind === "skill" ? 16 : 20))
    .attr("text-anchor", "middle")
    .attr("fill", (d) => (d.kind === "skill" ? "var(--ink-2)" : "var(--ink)"))
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 3.5)
    .attr("paint-order", "stroke")
    .text((d) => shortLabel(d.label, maxLabel));

  // Hover: neighborhood focus + tooltip
  node
    .on("pointerenter", (event, d) => {
      const nb = neighbors.get(d.id);
      node.attr("opacity", (n) => (nb.has(n.id) ? 1 : 0.15));
      link
        .attr("stroke-opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 1 : 0.08))
        .attr("stroke", (l) => (l.source.id === d.id || l.target.id === d.id ? "var(--edge-strong)" : "var(--edge)"))
        .attr("marker-end", (l) => `url(#arrow-${l.source.id === d.id || l.target.id === d.id ? "h" : "n"}-${id})`);
      edgeLabel.attr("opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 1 : 0));
      tip.show(nodeTooltipHtml(d), event);
    })
    .on("pointermove", (event) => tip.move(event))
    .on("pointerleave", () => {
      node.attr("opacity", (d) => (highlight && !highlight.has(d.id) ? 0.22 : 1));
      link
        .attr("stroke-opacity", (l) => (highlight && !isHotLink(l) ? 0.25 : 0.9))
        .attr("stroke", (l) => (isHotLink(l) ? "var(--edge-strong)" : "var(--edge)"))
        .attr("marker-end", (l) => `url(#arrow-${isHotLink(l) ? "h" : "n"}-${id})`);
      edgeLabel.attr("opacity", (l) => (showEdgeLabels && (!highlight || isHotLink(l)) ? 1 : 0));
      tip.hide();
    })
    .on("click", (event, d) => onNodeClick?.(d, event));

  const radius = (d) => (d.kind === "literal" ? (d.w ?? 60) / 2 + 4 : d.kind === "skill" ? 16 : 24);

  const sim = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((l) => (l.target.kind === "literal" ? distance * 0.9 : distance))
        .strength(0.5)
    )
    .force("charge", d3.forceManyBody().strength(charge))
    .force("x", d3.forceX(width / 2).strength(gravity))
    .force("y", d3.forceY(height / 2).strength(gravity * (width / height)))
    .force("collide", d3.forceCollide().radius((d) => radius(d) + 4));

  if (positions && nodes.every((d) => d.x != null)) sim.alpha(0.25);

  const pad = fitPadding;
  const clampX = (d) => Math.max(pad + (d.kind === "literal" ? d.w / 2 : 0), Math.min(width - pad - (d.kind === "literal" ? d.w / 2 : 0), d.x));
  const clampY = (d) => Math.max(pad, Math.min(height - pad - 10, d.y));

  function arcPath(l) {
    const sx = l.source.x,
      sy = l.source.y,
      tx = l.target.x,
      ty = l.target.y;
    const dx = tx - sx,
      dy = ty - sy;
    const dist = Math.hypot(dx, dy) || 1;
    // Stop the arrow at the target's boundary
    const r = radius(l.target) - 6;
    const ux = dx / dist,
      uy = dy / dist;
    const ex = tx - ux * r,
      ey = ty - uy * r;
    if (!l.curve) return `M${sx},${sy}L${ex},${ey}`;
    const mx = (sx + ex) / 2 - uy * dist * l.curve,
      my = (sy + ey) / 2 + ux * dist * l.curve;
    return `M${sx},${sy}Q${mx},${my} ${ex},${ey}`;
  }

  sim.on("tick", () => {
    for (const d of nodes) {
      d.x = clampX(d);
      d.y = clampY(d);
      positions?.set(d.id, {x: d.x, y: d.y});
    }
    link.attr("d", arcPath);
    edgeLabel
      .attr("x", (l) => (l.source.x + l.target.x) / 2 - (l.target.y - l.source.y) * l.curve * 0.5)
      .attr("y", (l) => (l.source.y + l.target.y) / 2 + (l.target.x - l.source.x) * l.curve * 0.5 - 3);
    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  node.call(
    d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        tip.hide();
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
  );

  invalidation?.then(() => {
    sim.stop();
    tip.hide();
  });

  const el = svg.node();
  el.simulation = sim;
  return el;
}
