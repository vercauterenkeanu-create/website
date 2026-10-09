// Bouwt de volledige website in site/ uit:
//   inhoud/   alle inhoud als JSON (pagina's, verslagen, honden, nesten, instellingen)
//   media/    de foto's
//   _bron/assets/blokken.js  verwerking en opmaak, gedeeld met de beheerpagina
// Gebruik: npm run build
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");
const VA = require("../assets/blokken.js");
const { esc, slug, pageFile } = VA;

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "_bron");
const INHOUD = path.join(ROOT, "inhoud");
const OUT = path.join(ROOT, "site");
const SITE_URL = "https://www.vai-avanti.be/";

/* ---------- Inhoud inlezen (en onthouden voor de beheerpagina) ---------- */
const bestanden = {};   // "inhoud/..." -> { sha, inhoud }
const gitSha = buf => crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
function leesJson(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const inhoud = JSON.parse(buf.toString("utf8").replace(/^﻿/, ""));
  bestanden[rel.replace(/\\/g, "/")] = { sha: gitSha(buf), inhoud };
  return inhoud;
}
const leesMap = map => {
  const dir = path.join(INHOUD, map);
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => [f.replace(/\.json$/, ""), leesJson(`inhoud/${map}/${f}`)]));
};
const raw = { site: leesJson("inhoud/site.json"), paginas: leesMap("paginas"), honden: leesMap("honden"), nesten: leesMap("nesten"), nieuws: leesMap("nieuws") };
const M = VA.bouwModel(raw);
const { site, paginas, honden, nesten, nieuws } = M;

/* ---------- Foto's: verkleinen naar site/img (groot) en site/img/t (miniatuur) ---------- */
const blockPhotos = b => Object.entries(b || {}).flatMap(([k, v]) => k === "leden" ? VA.arr(v).flatMap(blockPhotos) : (/^foto/.test(k) ? VA.arr(v) : []));
const mediaInfo = {};
async function processMedia() {
  const all = new Set([
    ...honden.flatMap(d => d.photos), ...nesten.flatMap(l => [...l.photos, ...l.pups.flatMap(p => p.photos)]),
    ...nieuws.flatMap(p => p.photos), ...Object.values(site.paginafotos), ...paginas.flatMap(p => p.blokken.flatMap(blockPhotos))
  ].filter(v => typeof v === "string" && v));
  fs.mkdirSync(path.join(OUT, "img", "t"), { recursive: true });
  const cacheFile = path.join(OUT, "img", "maten.json");
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : {};
  const names = new Set();
  let made = 0;
  for (const p of all) {
    const src = path.join(ROOT, String(p).replace(/^\/+/, ""));
    if (!fs.existsSync(src)) { console.warn("Foto niet gevonden:", p); continue; }
    let name = slug(path.basename(src).replace(/\.[^.]+$/, "")) || "foto";
    while (names.has(name)) name += "-2";
    names.add(name);
    const full = path.join(OUT, "img", name + ".webp"), thumb = path.join(OUT, "img", "t", name + ".webp");
    const stamp = crypto.createHash("md5").update(fs.readFileSync(src)).digest("hex");
    if (!(cache[name] && cache[name].stamp === stamp && fs.existsSync(full) && fs.existsSync(thumb))) {
      const meta = await sharp(src).metadata();
      if (/\.webp$/i.test(src) && Math.max(meta.width, meta.height) <= 1600 && !meta.orientation) fs.copyFileSync(src, full);
      else await sharp(src).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(full);
      await sharp(src).rotate().resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toFile(thumb);
      const m2 = await sharp(full).metadata();
      cache[name] = { stamp, w: m2.width, h: m2.height };
      made++;
    }
    mediaInfo[p] = { name, w: cache[name].w, h: cache[name].h };
  }
  for (const dir of [path.join(OUT, "img"), path.join(OUT, "img", "t")])
    for (const f of fs.readdirSync(dir)) if (f.endsWith(".webp") && !names.has(f.replace(/\.webp$/, ""))) fs.unlinkSync(path.join(dir, f));
  for (const k of Object.keys(cache)) if (!names.has(k)) delete cache[k];
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  console.log(`${Object.keys(mediaInfo).length} foto's (${made} nieuw verkleind)`);
}

/* ---------- Afbeeldingen in HTML ---------- */
function img(p, { alt = "", cls = "", pos = "", sizes = "(max-width: 640px) 100vw, 50vw", eager = false } = {}) {
  const m = mediaInfo[p];
  if (!m) return `<span class="no-photo${cls ? " " + cls : ""}" role="img" aria-label="${esc(alt || "Nog geen foto")}"></span>`;
  return `<img src="img/t/${m.name}.webp" srcset="img/t/${m.name}.webp 640w, img/${m.name}.webp 1600w" sizes="${sizes}"` +
    ` width="${m.w}" height="${m.h}" alt="${esc(alt)}"` +
    (cls ? ` class="${cls}"` : "") + (pos ? ` style="object-position:${esc(pos)}"` : "") +
    (eager ? ` fetchpriority="high"` : ` loading="lazy" decoding="async"`) + ">";
}
function shot(p, { group = "", caption = "", alt = caption, cls = "shot", pos = "", sizes, extra = "", hidden = false } = {}) {
  const m = mediaInfo[p];
  if (!m) return hidden ? "" : `<div class="${cls}">${img(p, { alt })}${extra}</div>`;
  return `<button type="button" class="${cls}" data-full="img/${m.name}.webp"` + (group ? ` data-group="${esc(group)}"` : "") +
    ` data-caption="${esc(caption)}" aria-label="Foto vergroten${caption ? ": " + esc(caption) : ""}"${hidden ? " hidden" : ""}>` +
    (hidden ? "" : img(p, { alt, pos, sizes })) + extra + `</button>`;
}
const imgUrl = p => mediaInfo[p] ? `img/${mediaInfo[p].name}.webp` : "";

/* ---------- Pagina-omhulsel ---------- */
let S;
function layout({ file, title, desc, active, body, ogImage }) {
  const og = imgUrl(ogImage);
  fs.writeFileSync(path.join(OUT, file), `<!doctype html>
<html lang="nl-BE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${og ? `<meta property="og:image" content="${SITE_URL}${og}">` : ""}
<script>document.documentElement.classList.add("js");</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/logo.css">
</head>
<body id="top">
${S.header(active)}
<main>
${body}
</main>
${S.footer()}
<script src="assets/site.js"></script>
</body>
</html>
`);
}

/* ---------- Bouwen ---------- */
async function main() {
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  await processMedia();
  S = VA.createSite({ img, shot, imgUrl, model: M });

  const css = fs.readFileSync(path.join(SRC, "assets", "site.css"), "utf8") + fs.readFileSync(path.join(SRC, "assets", "extra.css"), "utf8");
  fs.writeFileSync(path.join(OUT, "assets", "site.css"), css);
  fs.copyFileSync(path.join(SRC, "assets", "logo.css"), path.join(OUT, "assets", "logo.css"));
  fs.copyFileSync(path.join(SRC, "assets", "blokken.js"), path.join(OUT, "assets", "blokken.js"));
  let js = fs.readFileSync(path.join(SRC, "assets", "site.js"), "utf8");
  if (S.mailParts.length === 2) js = js.replace('["vai-avanti", "hotmail.com"]', JSON.stringify(S.mailParts));
  const cfgFile = path.join(SRC, "config.json");
  const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
  if (cfg.web3formsKey) js = js.replace('const WEB3FORMS_KEY = "";', `const WEB3FORMS_KEY = ${JSON.stringify(cfg.web3formsKey)};`);
  fs.writeFileSync(path.join(OUT, "assets", "site.js"), js);

  // Pagina's uit blokken
  for (const p of paginas) {
    const first = p.blokken.find(b => blockPhotos(b).length);
    layout({
      file: pageFile(p.id), active: p.id === "start" ? "" : p.id,
      title: p.id === "start" ? "Vai Avanti · Whippetkennel uit Opwijk" : `${p.titel || p.id} · Vai Avanti`,
      desc: p.omschrijving || "Vai Avanti, whippetkennel uit Opwijk (België).",
      ogImage: first ? blockPhotos(first)[0] : "", body: S.renderBlocks(p.blokken)
    });
  }
  // Vaste pagina's
  layout({ file: "honden.html", active: "honden", title: "Onze honden · Vai Avanti", desc: "Maak kennis met de whippets van Vai Avanti: afstamming, gezondheidsresultaten en palmares per hond.", ogImage: site.paginafotos.honden, body: S.hondenBody() });
  for (const d of honden) layout({
    file: `hond-${d.id}.html`, active: "honden", title: `${d.call}${d.name ? ` (${d.name})` : ""} · Vai Avanti`,
    desc: `${d.call}${d.name ? `, officieel ${d.name}` : ""}${d.born ? `, geboren ${d.born}` : ""}. ${d.highlight ? d.highlight + ". " : ""}Afstamming, gezondheid en palmares.`,
    ogImage: d.cover, body: S.hondBody(d)
  });
  layout({ file: "nesten.html", active: "nesten", title: "Nesten · Vai Avanti", desc: `Alle nesten van whippetkennel Vai Avanti met hun pups${site.verwacht && site.verwacht.tonen ? ", en de nesten die verwacht worden" : ""}.`, ogImage: site.paginafotos.nesten, body: S.nestenBody() });
  const eersteJaar = Math.min(...nieuws.map(p => p.year).filter(Boolean));
  layout({ file: "nieuws.html", active: "nieuws", title: "Wedstrijdverslagen · Vai Avanti", desc: `Alle ${nieuws.length} wedstrijdverslagen van Vai Avanti sinds ${eersteJaar}: uitslagen, foto's en verhalen van de renbaan.`, ogImage: site.paginafotos.nieuws, body: S.nieuwsBody() });
  const start = paginas.find(p => p.id === "start");
  layout({ file: "404.html", active: "", title: "Pagina niet gevonden · Vai Avanti", desc: "Deze pagina bestaat niet (meer).", body: S.nietGevondenBody(start && (start.blokken.find(b => b.type === "hero") || {}).foto) });

  // Beheerpagina + een kopie van alle inhoud (met versie-nummers van GitHub)
  const dir = path.join(OUT, "beheer");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(path.join(SRC, "beheer"))) fs.copyFileSync(path.join(SRC, "beheer", f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ mediaInfo, commit: process.env.GITHUB_SHA || null, bestanden, gebouwd: new Date().toISOString() }));

  const pages = new Set(["honden.html", "nesten.html", "nieuws.html", "404.html", ...paginas.map(p => pageFile(p.id)), ...honden.map(d => `hond-${d.id}.html`)]);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html") && !pages.has(f)) fs.unlinkSync(path.join(OUT, f));
  console.log(`${pages.size} pagina's gebouwd · ${paginas.length} eigen pagina's · ${honden.length} honden · ${nesten.length} nesten · ${nieuws.length} verslagen`);
}
main().catch(e => { console.error(e); process.exit(1); });
