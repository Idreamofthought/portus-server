import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TREE_LEAVES, TREE_BRANCHES } from "../tree-leaf-catalog.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const homepageDirectory = path.join(root, "..", "homepage");
const domain = "https://www.idreamofthought.org";
const canonicalPaths = new Map([
  ["/index.html", "/"],
  ["/about.html", "/about"],
  ["/blog/index.html", "/blog/"],
  ["/identity.html", "/what-is"],
  ["/contact.html", "/contact"],
  ["/fragments.html", "/fragments"],
  ["/lore/index.html", "/lore/"],
  ["/press-kit.html", "/press-kit"],
  ["/portus/index.html", "/portus/"],
  ["/start-here.html", "/start-here"],
  ["/writing/index.html", "/writing/"],
  ["/codex/index.html", "/codex/"]
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function toUrl(filePath) {
  const relativePath = `/${path.relative(homepageDirectory, filePath).split(path.sep).join("/")}`;
  if (canonicalPaths.has(relativePath)) return canonicalPaths.get(relativePath);
  if (relativePath.endsWith("/index.html")) return relativePath.replace(/index\.html$/, "");
  if (relativePath.endsWith(".html")) return relativePath;
  return null;
}

function xml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .sort()
    .map((url) => `  <url><loc>${domain}${url}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
}

const staticUrls = walk(homepageDirectory)
  .filter((filePath) => filePath.endsWith(".html"))
  .map(toUrl)
  .filter((url) => url && !url.startsWith("/tree/leaves/"));

const leafUrls = TREE_LEAVES.map(
  (leaf) => `/tree/leaves/${leaf.branch}/${encodeURIComponent(leaf.slug)}.html`
);
const leafIndexes = Object.keys(TREE_BRANCHES).map(
  (branch) => `/tree/leaves/${encodeURIComponent(branch)}/`
);
const urls = [...new Set([
  ...staticUrls,
  "/tree/",
  "/tree/leaves/health/the-borrowed-kidney.html",
  ...leafIndexes,
  ...leafUrls
])];

const groups = {
  main: urls.filter((url) => !url.startsWith("/tree/") && !url.startsWith("/codex/") && !url.startsWith("/writing/")),
  territories: urls.filter((url) => url.startsWith("/tree/branches/")),
  writing: urls.filter((url) => url.startsWith("/writing/") || url.startsWith("/tree/leaves/")),
  portus: urls.filter((url) => url.startsWith("/codex/") || url.startsWith("/lore/") || url.startsWith("/portus/"))
};

for (const [name, sitemapUrls] of Object.entries(groups)) {
  fs.writeFileSync(path.join(homepageDirectory, `sitemap-${name}.xml`), xml(sitemapUrls));
}

console.log(`Generated ${urls.length} public URLs across ${Object.keys(groups).length} sitemaps.`);