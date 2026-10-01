import * as d3 from "d3";

const COLORS = ["var(--c-org)", "var(--c-program)", "var(--c-person)", "var(--c-credential)", "var(--c-job)"];

/** n organizations wired point-to-point, or each wired once to a shared vocabulary. */
export function networkMini(n, mode, {size = 280} = {}) {
  const S = size, c = S / 2, R = S * 0.4;
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, S, S])
    .attr("width", S)
    .attr("height", S)
    .style("max-width", "100%")
    .style("height", "auto")
    .attr("role", "img")
    .attr(
      "aria-label",
      mode === "p2p"
        ? `${n} organizations connected pairwise with ${(n * (n - 1)) / 2} custom integrations`
        : `${n} organizations each connected once to a shared vocabulary: ${n} mappings`
    );
  const pts = d3.range(n).map((i) => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    return {x: c + R * Math.cos(a), y: c + R * Math.sin(a), i};
  });
  const edges = [];
  if (mode === "p2p") {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([pts[i], pts[j]]);
  } else {
    for (const p of pts) edges.push([p, {x: c, y: c}]);
  }
  const op = mode === "p2p" ? Math.max(0.12, Math.min(0.6, 18 / edges.length)) : 0.7;
  svg
    .append("g")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("x1", (e) => e[0].x)
    .attr("y1", (e) => e[0].y)
    .attr("x2", (e) => e[1].x)
    .attr("y2", (e) => e[1].y)
    .attr("stroke", mode === "p2p" ? "var(--bad)" : "var(--c-skill)")
    .attr("stroke-opacity", op)
    .attr("stroke-width", 1.2);
  if (mode !== "p2p") {
    svg.append("circle").attr("cx", c).attr("cy", c).attr("r", S * 0.11).attr("fill", "var(--c-skill)").attr("opacity", 0.2);
    svg.append("circle").attr("cx", c).attr("cy", c).attr("r", S * 0.06).attr("fill", "var(--c-skill)");
  }
  const r = Math.max(3, Math.min(9, 60 / n));
  svg
    .append("g")
    .selectAll("circle")
    .data(pts)
    .join("circle")
    .attr("cx", (p) => p.x)
    .attr("cy", (p) => p.y)
    .attr("r", r)
    .attr("fill", (p) => COLORS[p.i % COLORS.length])
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 1.5);
  return svg.node();
}
