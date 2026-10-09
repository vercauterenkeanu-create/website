// Maakt de deelbare versie (artifact) van ../../site:
//  - ../../_deelbaar/index.html = startpagina zonder <html>/<head>/<body>-omhulsel (de viewer voegt dat toe)
//  - ../../_deelbaar/files-1.json en files-2.json = lijsten van mee te publiceren bestanden (max 255 per keer)
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "..", "site");
const OUT = path.join(__dirname, "..", "..", "_deelbaar");

let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
html = html
  .replace(/<!doctype html>\s*/i, "")
  .replace(/<html[^>]*>\s*/i, "")
  .replace(/<\/?head>\s*/gi, "")
  .replace(/<meta (charset|name="viewport")[^>]*>\s*/gi, "")
  .replace(/<meta (name="description"|property="og:[^"]*")[^>]*>\s*/gi, "")
  .replace(/<title>[^<]*<\/title>/, "<title>Vai Avanti Whippetkennel</title>")
  .replace(/<body[^>]*>\s*/i, '<div id="top"></div>\n')
  .replace(/<\/body>\s*<\/html>\s*$/i, "");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);

const files = [];
const walk = dir => {
  for (const f of fs.readdirSync(path.join(SITE, dir))) {
    const rel = dir ? dir + "/" + f : f;
    if (fs.statSync(path.join(SITE, rel)).isDirectory()) walk(rel);
    else if (rel !== "index.html" && !rel.endsWith(".json")) files.push(rel);
  }
};
walk("");
// enkel foto's die op een pagina gebruikt worden
const used = new Set();
for (const f of files.concat("index.html").filter(f => f.endsWith(".html")))
  for (const m of fs.readFileSync(path.join(SITE, f), "utf8").matchAll(/img\/(?:t\/)?(\d{9})\.webp/g)) used.add(m[1]);
for (let i = files.length - 1; i >= 0; i--) {
  const m = files[i].match(/^img\/(?:t\/)?(\d{9})\.webp$/);
  if (m && !used.has(m[1])) files.splice(i, 1);
}
// pagina's en opmaak eerst, dan miniaturen, dan grote foto's
const rank = f => f.endsWith(".html") || f.startsWith("assets/") ? 0 : f.startsWith("img/t/") ? 1 : 2;
files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
const batches = [files.slice(0, 250), files.slice(250)];
batches.forEach((b, i) => fs.writeFileSync(path.join(OUT, `files-${i + 1}.json`), JSON.stringify(b)));
console.log(`index.html klaar; ${files.length} bestanden in ${batches.length} delen (${batches.map(b => b.length).join(" + ")})`);
