// See https://observablehq.com/framework/config for documentation.
export default {
  title: "RDF, Explained",
  root: "src",
  pages: [
    {name: "The explainer", path: "/"},
    {name: "Engineer’s field guide", path: "/engineering"}
  ],
  head: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='8' cy='22' r='5' fill='%233987e5'/><circle cx='24' cy='22' r='5' fill='%23eda100'/><circle cx='16' cy='8' r='5' fill='%231baf7a'/><path d='M8 22 16 8 24 22Z' fill='none' stroke='%23888' stroke-width='1.5'/></svg>">`,
  style: "style.css",
  sidebar: true,
  toc: true,
  pager: true,
  footer: "An illustrated guide to the Resource Description Framework. Example organizations, people and identifiers are fictional.",
  search: false,
  linkify: true,
  typographer: true
};
