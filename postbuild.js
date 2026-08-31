// Moves the inlined <script> from <head> to just before </body>, and strips
// type="module"/crossorigin so it's a plain classic script. This guarantees
// the script runs AFTER <div id="root"> exists (React needs the DOM node to
// be present), and avoids ES module CORS restrictions some browsers apply to
// file:// URLs — important since this file is meant to be opened directly by
// double-clicking, not served from a web server.
import { readFileSync, writeFileSync } from "fs";

const path = "dist/index.html";
let html = readFileSync(path, "utf8");

const scriptMatch = html.match(/<script[^>]*>[\s\S]*?<\/script>/);
if (!scriptMatch) {
  console.error("postbuild: no <script> tag found — skipping");
  process.exit(0);
}

const original = scriptMatch[0];
const bodyContent = original.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
const cleanScript = `<script>${bodyContent}</script>`;

html = html.replace(original, ""); // remove from its current spot (usually <head>)
html = html.replace("</body>", `${cleanScript}\n  </body>`); // append right before </body>

writeFileSync(path, html);
console.log("postbuild: moved inline script to end of <body>, stripped type=module");
