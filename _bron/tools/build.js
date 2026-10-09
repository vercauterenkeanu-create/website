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
const vertaal = require("./vertaal.js");
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
// Foto's in een blok: velden foto, fotos, foto1, foto2, ook in lijsten (bv. teamleden)
const blockPhotos = b => Object.entries(b || {}).flatMap(([k, v]) =>
  Array.isArray(v) && v.some(x => x && typeof x === "object") ? v.flatMap(blockPhotos) : (/^foto(s|\d)?$/.test(k) ? VA.arr(v) : []));
const mediaInfo = {};
async function processMedia() {
  const all = new Set([
    ...honden.flatMap(d => d.photos), ...nesten.flatMap(l => [...l.photos, ...l.pups.flatMap(p => p.photos)]),
    ...nieuws.flatMap(p => p.photos), ...paginas.flatMap(p => p.blokken.flatMap(blockPhotos))
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

/* ---------- Taal van de pagina die gebouwd wordt ---------- */
let woorden = null;   // Map nl -> vertaling, of null voor Nederlands
const t = (s, v) => VA.vulIn(woorden && woorden.has(s) ? woorden.get(s) : s, v);

/* ---------- Afbeeldingen in HTML ---------- */
function img(p, { alt = "", cls = "", pos = "", sizes = "(max-width: 640px) 100vw, 50vw", eager = false } = {}) {
  const m = mediaInfo[p];
  if (!m) return `<span class="no-photo${cls ? " " + cls : ""}" role="img" aria-label="${esc(alt || t("Nog geen foto"))}"></span>`;
  return `<img src="img/t/${m.name}.webp" srcset="img/t/${m.name}.webp 640w, img/${m.name}.webp 1600w" sizes="${sizes}"` +
    ` width="${m.w}" height="${m.h}" alt="${esc(alt)}"` +
    (cls ? ` class="${cls}"` : "") + (pos ? ` style="object-position:${esc(pos)}"` : "") +
    (eager ? ` fetchpriority="high"` : ` loading="lazy" decoding="async"`) + ">";
}
function shot(p, { group = "", caption = "", alt = caption, cls = "shot", pos = "", sizes, extra = "", hidden = false } = {}) {
  const m = mediaInfo[p];
  if (!m) return hidden ? "" : `<div class="${cls}">${img(p, { alt })}${extra}</div>`;
  return `<button type="button" class="${cls}" data-full="img/${m.name}.webp"` + (group ? ` data-group="${esc(group)}"` : "") +
    ` data-caption="${esc(caption)}" aria-label="${esc(t("Foto vergroten"))}${caption ? ": " + esc(caption) : ""}"${hidden ? " hidden" : ""}>` +
    (hidden ? "" : img(p, { alt, pos, sizes })) + extra + `</button>`;
}
const imgUrl = p => mediaInfo[p] ? `img/${mediaInfo[p].name}.webp` : "";

/* ---------- Pagina-omhulsel ---------- */
let talen = ["nl"];   // talen die gepubliceerd worden
const taalPad = (taal, bestand) => (taal === "nl" ? "" : taal + "/") + (bestand === "index.html" ? "" : bestand);
// Link naar dezelfde pagina in een andere taal, gezien vanuit de map van `vanuit`
const taalLink = (vanuit, naar, bestand) => vanuit === "nl" ? (naar === "nl" ? bestand : `${naar}/${bestand}`)
  : (naar === vanuit ? bestand : naar === "nl" ? `../${bestand}` : `../${naar}/${bestand}`);
// Pagina's in /en/, /de/, ... gebruiken de foto's en opmaak van de hoofdmap
const naarSubmap = html => html
  .replace(/(src|href|data-full)="(img|assets)\//g, '$1="../$2/')
  .replace(/srcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|, )img\//g, "$1../img/")}"`);
function layout({ S, taal, file, title, desc, active, body, ogImage }) {
  const og = imgUrl(ogImage);
  const locale = VA.TALEN[taal].locale;
  const alternatief = talen.length > 1 && file !== "404.html"
    ? [...talen.map(c => `<link rel="alternate" hreflang="${c}" href="${SITE_URL}${taalPad(c, file)}">`), `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${taalPad("nl", file)}">`].join("\n") + "\n" : "";
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${og ? `<meta property="og:image" content="${SITE_URL}${og}">` : ""}
${talen.length > 1 ? `<meta property="og:locale" content="${locale.replace("-", "_")}">\n` : ""}${alternatief}<script>document.documentElement.classList.add("js");</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${VA.fontsHref(site.thema)}" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/logo.css">
${VA.themaCss(site.thema) ? `<style>${VA.themaCss(site.thema)}</style>\n` : ""}</head>
<body id="top">
${S.header(active, file)}
<main>
${body}
</main>
${S.footer()}
<script src="assets/site.js"></script>
</body>
</html>
`;
  const map = taal === "nl" ? OUT : path.join(OUT, taal);
  fs.mkdirSync(map, { recursive: true });
  fs.writeFileSync(path.join(map, file), taal === "nl" ? html : naarSubmap(html));
}

// Alle pagina's van één taal
function bouwTaal(taal, model) {
  const S = VA.createSite({
    img, shot, imgUrl, model,
    vertaal: woorden ? s => (woorden.has(s) ? woorden.get(s) : s) : null,
    taalLinks: bestand => talen.map(c => ({ code: c, href: taalLink(taal, c, bestand) }))
  });
  const bestanden = [];
  // Alle pagina's bestaan uit blokken (ook Onze honden, Nesten en Nieuws)
  for (const p of model.paginas) {
    const first = p.blokken.find(b => blockPhotos(b).length);
    const file = pageFile(p.id);
    layout({
      S, taal, file, active: p.id === "start" ? "" : p.id,
      title: p.id === "start" ? t("Vai Avanti · Whippetkennel uit Opwijk") : `${model.vul(p.titel || p.id)} · Vai Avanti`,
      desc: model.vul(p.omschrijving || "") || t("Vai Avanti, whippetkennel uit Opwijk (België)."),
      ogImage: first ? blockPhotos(first)[0] : "", body: S.renderBlocks(p.blokken)
    });
    bestanden.push(file);
  }
  // Een pagina per hond
  for (const d of model.honden) {
    const file = `hond-${d.id}.html`;
    layout({
      S, taal, file, active: "honden", title: `${d.call}${d.name ? ` (${d.name})` : ""} · Vai Avanti`,
      desc: [d.call, d.name && t("officieel {naam}", { naam: d.name }), d.born && t("geboren {datum}", { datum: d.born })].filter(Boolean).join(", ") +
        `. ${d.highlight ? d.highlight + ". " : ""}${t("Afstamming, gezondheid en palmares.")}`,
      ogImage: d.cover, body: S.hondBody(d)
    });
    bestanden.push(file);
  }
  return { S, bestanden };
}

/* ---------- Bouwen ---------- */
async function main() {
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  await processMedia();

  // Vertalingen bijwerken (enkel nieuwe of gewijzigde teksten worden vertaald)
  const gewenst = (site.talen || Object.keys(vertaal.TAALNAAM)).filter(c => vertaal.TAALNAAM[c]);
  const teksten = vertaal.alleTeksten(raw);
  const klaar = {};
  await Promise.all(gewenst.map(async taal => {
    const geheugen = vertaal.laad(taal);
    await vertaal.vulAan(geheugen, teksten, taal);
    vertaal.bewaar(taal, geheugen, teksten);
    const w = vertaal.woordenboek(geheugen);
    const dekking = [...teksten.keys()].filter(s => w.has(s)).length / (teksten.size || 1);
    if (dekking >= 0.8) klaar[taal] = w;
    else console.warn(`${taal}: pas ${Math.round(dekking * 100)}% vertaald, deze taal komt nog niet online`);
  }));
  talen = ["nl", ...gewenst.filter(c => klaar[c])];

  // Nederlands (de hoofdmap)
  woorden = null;
  const { S, bestanden: nlPaginas } = bouwTaal("nl", M);
  const start = paginas.find(p => p.id === "start");
  const startHero = start && start.blokken.find(b => b.type === "hero");
  layout({ S, taal: "nl", file: "404.html", active: "", title: "Pagina niet gevonden · Vai Avanti", desc: "Deze pagina bestaat niet (meer).", body: S.nietGevondenBody(startHero && (VA.arr(startHero.fotos)[0] || startHero.foto)) });
  const pages = new Set(["404.html", ...nlPaginas]);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html") && !pages.has(f)) fs.unlinkSync(path.join(OUT, f));

  // Andere talen in hun eigen map; de honden in de verslagen blijven die uit het Nederlands
  const hondenIn = Object.fromEntries(nieuws.map(p => [p.id, p.dogs]));
  for (const taal of talen.slice(1)) {
    woorden = klaar[taal];
    const model = VA.bouwModel(vertaal.vertaalRaw(raw, woorden), taal);
    for (const p of model.nieuws) p.dogs = hondenIn[p.id] || p.dogs;
    const gemaakt = new Set(bouwTaal(taal, model).bestanden);
    for (const f of fs.readdirSync(path.join(OUT, taal))) if (f.endsWith(".html") && !gemaakt.has(f)) fs.unlinkSync(path.join(OUT, taal, f));
  }
  woorden = null;
  for (const c of Object.keys(VA.TALEN)) if (c !== "nl" && !talen.includes(c) && fs.existsSync(path.join(OUT, c))) fs.rmSync(path.join(OUT, c), { recursive: true });

  // Opmaak en scripts
  const css = fs.readFileSync(path.join(SRC, "assets", "site.css"), "utf8") + fs.readFileSync(path.join(SRC, "assets", "extra.css"), "utf8");
  fs.writeFileSync(path.join(OUT, "assets", "site.css"), css);
  fs.copyFileSync(path.join(SRC, "assets", "logo.css"), path.join(OUT, "assets", "logo.css"));
  fs.copyFileSync(path.join(SRC, "assets", "blokken.js"), path.join(OUT, "assets", "blokken.js"));
  let js = fs.readFileSync(path.join(SRC, "assets", "site.js"), "utf8");
  if (S.mailParts.length === 2) js = js.replace('["vai-avanti", "hotmail.com"]', JSON.stringify(S.mailParts));
  const cfgFile = path.join(SRC, "config.json");
  const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
  if (cfg.web3formsKey) js = js.replace('const WEB3FORMS_KEY = "";', `const WEB3FORMS_KEY = ${JSON.stringify(cfg.web3formsKey)};`);
  // De vaste teksten van site.js per taal
  const scriptWoorden = Object.fromEntries(talen.slice(1).map(c => [c, Object.fromEntries(vertaal.scriptTeksten().filter(s => klaar[c].has(s)).map(s => [s, klaar[c].get(s)]))]));
  js = js.replace("const TEKSTEN = {};", () => `const TEKSTEN = ${JSON.stringify(scriptWoorden)};`);
  fs.writeFileSync(path.join(OUT, "assets", "site.js"), js);

  // Beheerpagina + een kopie van alle inhoud (met versie-nummers van GitHub)
  const dir = path.join(OUT, "beheer");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(path.join(SRC, "beheer"))) fs.copyFileSync(path.join(SRC, "beheer", f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ mediaInfo, commit: process.env.GITHUB_SHA || null, bestanden, talen, gebouwd: new Date().toISOString() }));

  console.log(`${pages.size} pagina's gebouwd · ${paginas.length} eigen pagina's · ${honden.length} honden · ${nesten.length} nesten · ${nieuws.length} verslagen · talen: ${talen.join(", ")}`);
}
main().catch(e => { console.error(e); process.exit(1); });
