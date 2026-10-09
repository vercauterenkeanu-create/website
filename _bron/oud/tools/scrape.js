// Haalt alle pagina's van www.vai-avanti.be op en zet de inhoud (koppen, tekst, foto's per blok)
// om naar ../content.json. Ruwe HTML komt in ../raw/.
// Gebruik: node scrape.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "raw");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SITE = "https://www.vai-avanti.be/";
const PAGES = [
  "", "nieuws/", "niews/", "over-ons/", "contact/", "pups/", "wordt-verwacht/",
  "diensten/", "over-ons2/", "kopie-van-teven/",
  "old-roads-ryleigh/", "vai-avanti-tahiti/", "vai-avanti-xamali/", "vai-avanti-yiruma/", "samba-supersonic/",
  "vai-avanti-t-nest/", "vai-avanti-u-nest/", "vai-avanti-x-nest/", "kopie-van-vai-avanti-t-nest/"
];

const EXTRACT = `
function extract(doc) {
  const main = doc.querySelector("main") || doc.body;
  const bestImg = img => {
    const a = img.closest("a[href]");
    if (a && /cdnwnd\\.com\\/.+\\.(jpe?g|png|webp)/i.test(a.getAttribute("href"))) return a.getAttribute("href");
    const cands = [];
    const pic = img.closest("picture");
    if (pic) pic.querySelectorAll("source[srcset]").forEach(s => cands.push(s.getAttribute("srcset")));
    if (img.getAttribute("srcset")) cands.push(img.getAttribute("srcset"));
    let best = img.getAttribute("src"), bw = 0;
    for (const set of cands) for (const part of set.split(",")) {
      const [u, w] = part.trim().split(/\\s+/); const n = parseInt(w) || 1;
      if (u && n > bw) { bw = n; best = u; }
    }
    return best;
  };
  const text = el => { const c = el.cloneNode(true); c.querySelectorAll("br").forEach(b => b.replaceWith("\\n")); return c.textContent.replace(/[ \\t\\u00a0]+/g, " ").replace(/ *\\n */g, "\\n").trim(); };
  return [...main.querySelectorAll("section")].map(sec => {
    const blocks = [];
    const walker = doc.createTreeWalker(sec, NodeFilter.SHOW_ELEMENT);
    for (let el = walker.currentNode; el; el = walker.nextNode()) {
      const tag = el.tagName;
      if (/^H[1-4]$/.test(tag)) { const t = text(el); if (t) blocks.push({ t: "h", l: +tag[1], text: t }); }
      else if (tag === "P" && !el.closest("li")) { const t = text(el); if (t) blocks.push({ t: "p", text: t }); }
      else if (tag === "LI") { const t = text(el); if (t) blocks.push({ t: "li", text: t }); }
      else if (tag === "IMG") blocks.push({ t: "img", src: bestImg(el), alt: el.getAttribute("alt") || "", bg: !!el.closest(".s-bg") });
      else if (tag === "A" && /breedarchive|instagram|facebook/.test(el.getAttribute("href") || "")) blocks.push({ t: "link", href: el.getAttribute("href"), text: text(el) });
    }
    return { cls: sec.className.split(" ").slice(0, 3).join(" "), blocks };
  }).filter(s => s.blocks.length);
}`;

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  const files = [];
  for (const p of PAGES) {
    const name = (p.replace(/\/$/, "") || "home") + ".html";
    const res = await fetch(SITE + p);
    if (!res.ok) { console.log("overgeslagen:", p, res.status); continue; }
    fs.writeFileSync(path.join(RAW, name), await res.text());
    files.push({ page: p || "/", file: name });
  }
  const runner = path.join(RAW, "_extract.html");
  fs.writeFileSync(runner, `<!doctype html><body><script>${EXTRACT}
const files = ${JSON.stringify(files)};
(async () => {
  const out = [];
  for (const f of files) {
    const html = await (await fetch(f.file)).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    out.push({ page: f.page, title: doc.title, sections: extract(doc) });
  }
  document.body.textContent = "JS" + "ON:" + JSON.stringify(out) + ":E" + "ND";
})();
</script></body>`);
  const dom = execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--allow-file-access-from-files",
    "--user-data-dir=" + path.join(RAW, "_chrome"), "--virtual-time-budget=30000", "--dump-dom",
    "file:///" + runner.replace(/\\/g, "/")], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString();
  const a = dom.indexOf("JSON:"), b = dom.lastIndexOf(":END");
  if (a < 0 || b < 0) throw new Error("Extractie mislukt");
  const decoded = dom.slice(a + 5, b).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const data = JSON.parse(decoded);
  fs.writeFileSync(path.join(ROOT, "content.json"), JSON.stringify(data, null, 1));
  for (const pg of data) {
    const imgs = pg.sections.flatMap(s => s.blocks.filter(b => b.t === "img")).length;
    const words = pg.sections.flatMap(s => s.blocks.filter(b => b.text)).map(b => b.text).join(" ").split(/\s+/).length;
    console.log(pg.page.padEnd(32), "secties", String(pg.sections.length).padStart(3), "foto's", String(imgs).padStart(4), "woorden", words);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
