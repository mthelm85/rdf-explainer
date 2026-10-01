// See https://observablehq.com/framework/config for documentation.
export default {
  title: "RDF, briefly",
  root: "src",
  style: "style.css",
  pages: [
    {name: "Overview", path: "/"},
    {name: "Writing RDF", path: "/syntax"},
    {name: "Merging data", path: "/merging"},
    {name: "Why it matters", path: "/why"}
  ],
  head: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,400;8..144,500;8..144,600&family=Roboto+Mono:wght@400;500&display=swap">
<meta name="theme-color" content="#faf8ff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121318" media="(prefers-color-scheme: dark)">`,
  sidebar: true,
  toc: true,
  pager: true,
  header: "",
  footer: "",
  search: false,
  typographer: true
};
