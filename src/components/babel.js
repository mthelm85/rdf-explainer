import * as d3 from "d3";

// Four documents, one idea. Shows how the same skill is written four ways,
// how software sees four unrelated strings, and how a shared IRI fixes it.
const DOCS = [
  {source: "Employer job posting", who: "Acme Robotics", text: "Must know ladder logic", kind: "job"},
  {source: "College course catalog", who: "Riverbend CC", text: "ELT 214: PLC Programming", kind: "program"},
  {source: "Apprenticeship standard", who: "Midstate Electrical", text: "Programmable controllers (PLCs)", kind: "program"},
  {source: "Worker’s résumé", who: "Maria Alvarez", text: "Allen-Bradley PLC experience", kind: "person"}
];

const COLORS = {job: "var(--c-job)", program: "var(--c-program)", person: "var(--c-person)"};

export function babelViz(width) {
  const narrow = width < 640;
  const W = narrow ? Math.max(320, width) : Math.min(width, 980);
  const cardW = narrow ? W - 24 : Math.min(310, W * 0.34);
  const cardH = 92;
  const H = narrow ? 4 * (cardH + 14) + 190 : 440;
  const center = narrow ? {x: W / 2, y: H - 80} : {x: W / 2, y: H / 2};

  const pos = narrow
    ? DOCS.map((_, i) => ({x: 12, y: 8 + i * (cardH + 14)}))
    : [
        {x: 8, y: 20},
        {x: W - cardW - 8, y: 20},
        {x: 8, y: H - cardH - 20},
        {x: W - cardW - 8, y: H - cardH - 20}
      ];
  const anchor = (p) => (narrow ? {x: p.x + cardW - 18, y: p.y + cardH / 2} : {x: p.x + cardW / 2, y: p.y + cardH / 2});

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, W, H])
    .attr("width", W)
    .attr("height", H)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font-family", "var(--font-body)")
    .attr("role", "img")
    .attr("aria-label", "Four documents describe the same skill—PLC programming—in four different ways.");

  const gLines = svg.append("g");
  const lines = gLines
    .selectAll("path")
    .data(DOCS)
    .join("path")
    .attr("fill", "none")
    .attr("stroke-width", 2)
    .attr("d", (d, i) => {
      const a = anchor(pos[i]);
      if (narrow) return `M${a.x},${a.y} C${a.x + 6},${a.y} ${center.x + 40},${center.y - 60} ${center.x},${center.y - 30}`;
      return `M${a.x},${a.y} L${center.x},${center.y}`;
    });

  // Mismatch marks between neighbours (machine view)
  const neq = svg.append("g").attr("opacity", 0);
  const pairs = narrow ? [[0, 1], [1, 2], [2, 3]] : [[0, 1], [2, 3], [0, 2], [1, 3]];
  for (const [a, b] of pairs) {
    const pa = anchor(pos[a]), pb = anchor(pos[b]);
    const mx = narrow ? 36 : (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    neq.append("circle").attr("cx", mx).attr("cy", my).attr("r", 13).attr("fill", "var(--surface)").attr("stroke", "var(--bad)").attr("stroke-width", 1.5);
    neq.append("text").attr("x", mx).attr("y", my).attr("dy", "0.36em").attr("text-anchor", "middle").attr("fill", "var(--bad)").attr("font-size", 16).attr("font-weight", 700).text("≠");
  }

  // Cards
  const cards = svg
    .append("g")
    .selectAll("g")
    .data(DOCS)
    .join("g")
    .attr("transform", (d, i) => `translate(${pos[i].x},${pos[i].y})`);
  cards
    .append("rect")
    .attr("width", cardW)
    .attr("height", cardH)
    .attr("rx", 12)
    .attr("fill", "var(--surface)")
    .attr("stroke", "var(--rule-strong)");
  cards
    .append("rect")
    .attr("width", 5)
    .attr("height", cardH - 24)
    .attr("x", 0)
    .attr("y", 12)
    .attr("rx", 2.5)
    .attr("fill", (d) => COLORS[d.kind]);
  cards
    .append("text")
    .attr("x", 18)
    .attr("y", 24)
    .attr("font-size", 10.5)
    .attr("font-weight", 700)
    .attr("letter-spacing", "0.08em")
    .attr("fill", "var(--ink-3)")
    .text((d) => d.source.toUpperCase());
  const phrase = cards
    .append("text")
    .attr("class", "phrase")
    .attr("x", 18)
    .attr("y", 50)
    .attr("font-size", narrow ? 13.5 : 15)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text((d) => `“${d.text}”`);
  const sub = cards
    .append("text")
    .attr("x", 18)
    .attr("y", 74)
    .attr("font-size", 11)
    .attr("font-family", "var(--font-code)")
    .attr("fill", "var(--ink-3)")
    .text((d) => d.who);

  // Center
  const c = svg.append("g").attr("transform", `translate(${center.x},${center.y})`);
  const halo = c.append("circle").attr("r", 46).attr("fill", "var(--c-skill)").attr("opacity", 0.14);
  const dot = c.append("circle").attr("r", 20).attr("fill", "var(--c-skill)").attr("stroke", "var(--bg)").attr("stroke-width", 3);
  const cTitle = c.append("text").attr("stroke", "var(--bg)").attr("stroke-width", 4).attr("paint-order", "stroke").attr("y", 44).attr("text-anchor", "middle").attr("font-weight", 700).attr("font-size", 14).attr("fill", "var(--ink)");
  const cSub = c.append("text").attr("stroke", "var(--bg)").attr("stroke-width", 4).attr("paint-order", "stroke").attr("y", 62).attr("text-anchor", "middle").attr("font-size", 11).attr("font-family", "var(--font-code)").attr("fill", "var(--ink-3)");
  const cIcon = c.append("text").attr("dy", "0.36em").attr("text-anchor", "middle").attr("font-size", 18).attr("fill", "var(--bg)").attr("font-weight", 700);

  const el = svg.node();
  el.update = (mode) => {
    const t = svg.transition().duration(650).ease(d3.easeCubicInOut);
    if (mode === "people") {
      lines.transition(t).attr("stroke", "var(--rule-strong)").attr("stroke-dasharray", "4 5").attr("opacity", 1);
      neq.transition(t).attr("opacity", 0);
      dot.transition(t).attr("fill", "var(--ink-3)").attr("r", 20);
      halo.transition(t).attr("fill", "var(--ink-3)").attr("opacity", 0.1);
      cIcon.text("?");
      cTitle.text("“Oh — these are all PLC skills.”");
      cSub.text("a person infers it from context");
      phrase.attr("font-family", "var(--font-body)").attr("font-size", narrow ? 13.5 : 15).text((d) => `“${d.text}”`);
      sub.attr("fill", "var(--ink-3)").text((d) => d.who);
    } else if (mode === "machines") {
      lines.transition(t).attr("opacity", 0);
      neq.transition(t).attr("opacity", 1);
      dot.transition(t).attr("fill", "var(--bad)").attr("r", 20);
      halo.transition(t).attr("fill", "var(--bad)").attr("opacity", 0.1);
      cIcon.text("×");
      cTitle.text("0 matches");
      cSub.text("four unrelated character strings");
      phrase
        .attr("font-family", "var(--font-code)")
        .attr("font-size", 12.5)
        .text((d) => JSON.stringify(d.text.toLowerCase()).slice(0, narrow ? 40 : 30));
      sub.attr("fill", "var(--bad)").text((d) => `string match → ✗`);
    } else {
      lines.transition(t).attr("stroke", "var(--c-skill)").attr("stroke-dasharray", null).attr("opacity", 1);
      neq.transition(t).attr("opacity", 0);
      dot.transition(t).attr("fill", "var(--c-skill)").attr("r", 24);
      halo.transition(t).attr("fill", "var(--c-skill)").attr("opacity", 0.2);
      cIcon.text("✓");
      cTitle.text("PLC Programming");
      cSub.text(narrow ? "sk:plc-programming" : "https://skills.riverbend.example/skill/plc-programming");
      phrase.attr("font-family", "var(--font-body)").attr("font-size", narrow ? 13.5 : 15).text((d) => `“${d.text}”`);
      sub.attr("fill", "var(--ink-2)").text(() => `→ sk:plc-programming`);
    }
  };
  el.update("people");
  return el;
}
