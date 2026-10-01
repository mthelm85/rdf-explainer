import * as d3 from "d3";

// The talent-ecosystem feedback loop: six stages around a ring, with data
// particles flowing between them. Clicking a stage selects it.
export const STAGES = [
  {
    id: "demand",
    actor: "Employers",
    title: "Signal demand",
    color: "var(--c-org)",
    flows: "Job postings whose required skills are IRIs from a shared framework, not free text.",
    standards: ["schema.org JobPosting", "JSON-LD", "Skill IRIs"],
    friction: "Search friction & vague signals: programs and job seekers no longer have to guess what “3+ yrs automation exp.” means.",
    snippet: `acme:job-automation-technician a schema:JobPosting ;
  schema:title "Automation Technician" ;
  schema:skills sk:plc-programming, sk:robot-operation .`
  },
  {
    id: "insight",
    actor: "Workforce boards & analysts",
    title: "See the whole market",
    color: "var(--c-other)",
    flows: "Aggregate queries across every publisher’s graph: which skills are rising, which are taught nowhere.",
    standards: ["SPARQL", "Named graphs", "SKOS"],
    friction: "Information lag: labor-market intelligence comes from live, linked data rather than surveys published a year later.",
    snippet: `SELECT ?skill (COUNT(?job) AS ?demand) WHERE {
  ?job schema:skills ?skill .
  FILTER NOT EXISTS { ?p schema:teaches ?skill }
} GROUP BY ?skill`
  },
  {
    id: "align",
    actor: "Colleges & apprenticeship sponsors",
    title: "Align programs",
    color: "var(--c-program)",
    flows: "Program and credential descriptions that point at the same skill IRIs employers use.",
    standards: ["CTDL", "Credential Registry", "CTDL-ASN / CASE frameworks"],
    friction: "Skills mismatch: curricula can be checked against current demand, competency by competency.",
    snippet: `rcc:program-aas-mechatronics a schema:EducationalOccupationalProgram ;
  schema:teaches sk:plc-programming, sk:robot-operation .`
  },
  {
    id: "learn",
    actor: "Learners",
    title: "Earn verifiable credentials",
    color: "var(--c-credential)",
    flows: "Digitally signed credentials (badges, certificates, degrees) that carry their skill alignments with them.",
    standards: ["Open Badges 3.0", "CLR 2.0", "W3C Verifiable Credentials 2.0"],
    friction: "Credential opacity: an employer can see exactly what a credential certifies, and that it is genuine.",
    snippet: `wallet:maria schema:hasCredential rcc:credential-aas-mechatronics .
rcc:credential-aas-mechatronics
  schema:competencyRequired sk:plc-programming .`
  },
  {
    id: "match",
    actor: "Workers",
    title: "Carry records & get matched",
    color: "var(--c-person)",
    flows: "A learning & employment record (LER) in the worker’s own wallet, shared on the worker’s terms.",
    standards: ["LER wallets", "Verifiable Presentations", "Skill IRIs"],
    friction: "Matching friction: skills earned anywhere are legible everywhere — including skills learned on the job.",
    snippet: `wallet:maria schema:knowsAbout sk:python .
# + credentials presented from her wallet`
  },
  {
    id: "outcomes",
    actor: "Employers",
    title: "Hire, verify & report back",
    color: "var(--c-job)",
    flows: "Verified hires and on-the-job skill attestations flow back to programs as outcome data.",
    standards: ["Verifiable Credentials", "Outcome data", "Provenance (named graphs)"],
    friction: "Broken feedback: programs learn which competencies actually led to jobs, and adjust.",
    snippet: `<https://jobs.acme-robotics.example/hire/8841> a ex:Hire ;
  ex:worker wallet:maria ;
  ex:fromProgram rcc:program-aas-mechatronics .`
  }
];

export function loopViz({width, selected, onSelect, invalidation}) {
  const W = Math.min(width, 860);
  const showLabels = W >= 560;
  const H = showLabels ? Math.min(560, W * 0.78) : W;
  const size = Math.min(H, W);
  const cx = W / 2, cy = H / 2;
  const R = showLabels ? size * 0.34 : size * 0.38;
  const nodeR = Math.max(26, size * 0.07);

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, W, H])
    .attr("width", W)
    .attr("height", H)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font-family", "var(--font-body)")
    .attr("role", "img")
    .attr("aria-label", "A loop of six stages: employers signal demand, analysts see the market, programs align, learners earn credentials, workers get matched, employers report outcomes.");

  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / STAGES.length;
  const P = STAGES.map((s, i) => ({...s, i, x: cx + R * Math.cos(angle(i)), y: cy + R * Math.sin(angle(i))}));

  // Ring
  svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", R).attr("fill", "none").attr("stroke", "var(--rule-strong)").attr("stroke-width", 2);
  const flow = svg
    .append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", R)
    .attr("fill", "none")
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "2 14")
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.8);

  // Direction chevrons between stages
  for (let i = 0; i < P.length; i++) {
    const a = angle(i + 0.5);
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    const deg = (a * 180) / Math.PI + 90;
    svg
      .append("path")
      .attr("d", "M-5,-6 L3,0 L-5,6")
      .attr("fill", "none")
      .attr("stroke", "var(--ink-3)")
      .attr("stroke-width", 2)
      .attr("transform", `translate(${x},${y}) rotate(${deg - 90})`);
  }

  // Center: the shared graph
  const center = svg.append("g").attr("transform", `translate(${cx},${cy})`);
  const hub = d3.range(9).map((i) => ({a: (i / 9) * Math.PI * 2, r: i % 3 === 0 ? 0 : size * 0.075 + (i % 2) * size * 0.03}));
  center
    .selectAll("line")
    .data(hub)
    .join("line")
    .attr("x2", (d) => d.r * Math.cos(d.a))
    .attr("y2", (d) => d.r * Math.sin(d.a))
    .attr("stroke", "var(--edge)");
  center
    .selectAll("circle")
    .data(hub)
    .join("circle")
    .attr("cx", (d) => d.r * Math.cos(d.a))
    .attr("cy", (d) => d.r * Math.sin(d.a))
    .attr("r", (d, i) => (i === 0 ? 7 : 4))
    .attr("fill", (d, i) => ["var(--c-skill)", "var(--c-person)", "var(--c-org)", "var(--c-program)", "var(--c-credential)", "var(--c-job)"][i % 6]);
  center
    .append("text")
    .attr("y", size * 0.15)
    .attr("text-anchor", "middle")
    .attr("font-family", "var(--font-display)")
    .attr("font-size", Math.max(13, size * 0.032))
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("One shared graph");
  center
    .append("text")
    .attr("y", size * 0.15 + 17)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "var(--ink-3)")
    .text("shared vocabularies + IRIs");

  // Stage nodes
  const g = svg
    .append("g")
    .selectAll("g")
    .data(P)
    .join("g")
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .attr("cursor", "pointer")
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (d) => `${d.actor}: ${d.title}`)
    .on("click", (e, d) => onSelect(d.id))
    .on("keydown", (e, d) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(d.id);
      }
    });

  g.append("circle")
    .attr("class", "sel")
    .attr("r", nodeR + 7)
    .attr("fill", "none")
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 2.5)
    .attr("opacity", (d) => (d.id === selected ? 1 : 0));
  g.append("circle").attr("r", nodeR).attr("fill", (d) => d.color).attr("stroke", "var(--bg)").attr("stroke-width", 3);
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.36em")
    .attr("font-family", "var(--font-display)")
    .attr("font-weight", 700)
    .attr("font-size", nodeR * 0.75)
    .attr("fill", "#fff")
    .text((d) => d.i + 1);

  const lab = g.filter(() => showLabels).append("g").attr("transform", (d) => {
    const a = angle(d.i);
    const dx = Math.cos(a), dy = Math.sin(a);
    return `translate(${dx * (nodeR + 14)},${dy * (nodeR + 14) + (dy > 0.3 ? 8 : dy < -0.3 ? -14 : -4)})`;
  });
  const anchor = (d) => {
    const c = Math.cos(angle(d.i));
    return c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
  };
  lab
    .append("text")
    .attr("text-anchor", anchor)
    .attr("font-size", 12.5)
    .attr("font-weight", 700)
    .attr("fill", "var(--ink)")
    .text((d) => d.title);
  lab
    .append("text")
    .attr("y", 15)
    .attr("text-anchor", anchor)
    .attr("font-size", 11)
    .attr("fill", "var(--ink-3)")
    .text((d) => d.actor);

  // Animate the dashed flow around the ring
  let raf, off = 0;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const tick = () => {
    off -= 0.35;
    flow.attr("stroke-dashoffset", off);
    raf = requestAnimationFrame(tick);
  };
  if (!reduce) raf = requestAnimationFrame(tick);
  invalidation?.then(() => cancelAnimationFrame(raf));
  return svg.node();
}
