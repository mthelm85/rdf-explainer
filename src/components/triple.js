import * as d3 from "d3";
import {KINDS} from "./rdf.js";
import {symbolPath} from "./forceGraph.js";

/** Subject —predicate→ Object, drawn as a single labelled edge. */
export function tripleDiagram({subject, predicate, object, width = 640}) {
  const W = Math.max(320, Math.min(width, 760));
  const H = 150;
  const sx = 100, ox = W - 110, y = 64;
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, W, H])
    .attr("width", W)
    .attr("height", H)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font-family", "var(--font-body)")
    .attr("role", "img")
    .attr("aria-label", `${subject.label} ${predicate.label} ${object.label}`);

  svg
    .append("defs")
    .append("marker")
    .attr("id", "triple-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("markerWidth", 9)
    .attr("markerHeight", 9)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-4.5L10,0L0,4.5")
    .attr("fill", "var(--edge-strong)");

  const objIsLiteral = object.kind === "literal";
  const objHalf = objIsLiteral ? Math.min(120, 4 + object.label.length * 4.2) : 22;

  svg
    .append("line")
    .attr("x1", sx + 26)
    .attr("x2", ox - objHalf - 6)
    .attr("y1", y)
    .attr("y2", y)
    .attr("stroke", "var(--edge-strong)")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#triple-arrow)");

  svg
    .append("text")
    .attr("x", (sx + ox) / 2)
    .attr("y", y - 12)
    .attr("text-anchor", "middle")
    .attr("font-family", "var(--font-code)")
    .attr("font-size", 13)
    .attr("fill", "var(--ink)")
    .text(predicate.curie);
  svg
    .append("text")
    .attr("x", (sx + ox) / 2)
    .attr("y", y + 22)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("font-weight", 700)
    .attr("letter-spacing", "0.12em")
    .attr("fill", "var(--ink-3)")
    .text("PREDICATE");

  const end = (x, term, role) => {
    const g = svg.append("g").attr("transform", `translate(${x},${y})`);
    if (term.kind === "literal") {
      const w = objHalf * 2;
      g.append("rect").attr("x", -w / 2).attr("y", -16).attr("width", w).attr("height", 32).attr("rx", 6).attr("fill", "var(--surface-2)").attr("stroke", "var(--c-literal)").attr("stroke-dasharray", "4 3");
      g.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("font-family", "var(--font-code)").attr("font-size", 12).attr("fill", "var(--ink)").text(`“${term.label}”`);
    } else {
      g.append("path").attr("d", symbolPath(term.kind, term.kind === "skill" ? 4.5 : 2.4)).attr("fill", KINDS[term.kind].color).attr("stroke", "var(--bg)").attr("stroke-width", 2);
    }
    g.append("text")
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-weight", 600)
      .attr("font-size", 12.5)
      .attr("fill", "var(--ink)")
      .text(term.kind === "literal" ? "a literal value" : term.label.length > 30 ? term.label.slice(0, 29) + "…" : term.label);
    g.append("text")
      .attr("y", 56)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("font-weight", 700)
      .attr("letter-spacing", "0.12em")
      .attr("fill", "var(--ink-3)")
      .text(role);
  };
  end(sx, subject, "SUBJECT");
  end(ox, object, "OBJECT");
  return svg.node();
}
