// Bouwt de volledige website in site/ uit:
//   inhoud/   (verslagen, honden, nesten via Pages CMS; pagina's en instellingen via /beheer of Pages CMS)
//   media/    (foto's)
//   _bron/assets/ (opmaak en de gedeelde blokken-module)
// Gebruik: npm run build
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const sharp = require("sharp");
const crypto = require("crypto");
const VA = require("../assets/blokken.js");
const { esc, slug, md, plain, ICON } = VA;

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "_bron");
const INHOUD = path.join(ROOT, "inhoud");
const OUT = path.join(ROOT, "site");
const SITE_URL = "https://www.vai-avanti.be/";

/* ---------- Hulpjes ---------- */
const arr = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== "") : (v ? [v] : []);
const iso = v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10);
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const fmtDate = s => { const [y, m, d] = iso(s).split("-").map(Number); return y && m && d ? `${d} ${MAANDEN[m - 1]} ${y}` : ""; };
const same = (a, b) => !!a && String(a).trim().toLowerCase() === String(b || "").trim().toLowerCase();
const yearOf = s => parseInt(String(s).match(/\d{4}/)?.[0] || "0", 10);
const clip = (s, n) => s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s;

/* ---------- Inhoud inlezen ---------- */
function readMd(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { data: yaml.load(m[1]) || {}, body: m[2] } : { data: {}, body: raw };
}
const listDir = (dir, ext) => fs.existsSync(path.join(INHOUD, dir)) ? fs.readdirSync(path.join(INHOUD, dir)).filter(f => f.endsWith(ext)) : [];
const collection = dir => listDir(dir, ".md").map(f => ({ id: slug(f.replace(/\.md$/, "")), ...readMd(path.join(INHOUD, dir, f)) }));
const site = JSON.parse(fs.readFileSync(path.join(INHOUD, "site.json"), "utf8"));
site.paginafotos = site.paginafotos || {};
const V = site.verwacht || {};

const paginas = listDir("paginas", ".json").map(f => {
  const p = JSON.parse(fs.readFileSync(path.join(INHOUD, "paginas", f), "utf8"));
  return { id: slug(f.replace(/\.json$/, "")), ...p, blokken: arr(p.blokken) };
});

const honden = collection("honden").map(({ id, data: d, body }) => {
  const photos = arr(d.fotos);
  const cover = d.omslagfoto || photos[0];
  return {
    id, call: d.roepnaam || id, name: d.naam || "", sex: d.geslacht || "", status: d.status || "",
    born: fmtDate(d.geboren), color: d.kleur || "", sire: d.vader || "", dam: d.moeder || "",
    highlight: d.hoogtepunt || "", pedigree: d.stamboom || "", health: arr(d.gezondheid).map(String),
    titles: arr(d.palmares).map(t => [String(t.jaar ?? ""), t.titel || "", t.plaats || ""]).filter(t => t[1])
      .sort((a, b) => yearOf(b[0]) - yearOf(a[0])),
    cover, pos: d.fotoFocus || "", photos: [cover, ...photos.filter(p => p !== cover)].filter(Boolean),
    noteMd: body.trim(), extraNames: arr(d.andereNamen).map(String), order: Number(d.volgorde ?? 999)
  };
}).filter(d => d.call).sort((a, b) => a.order - b.order || a.call.localeCompare(b.call));

const nesten = collection("nesten").map(({ id, data: l, body }) => ({
  id: slug(l.letter || id), letter: String(l.letter || id).toUpperCase(), bornIso: iso(l.geboren), born: fmtDate(l.geboren),
  sire: l.vader || "", dam: l.moeder || "", introMd: body.trim(), photos: arr(l.foto),
  pups: arr(l.pups).map(p => ({
    name: p.naam || "", call: p.roepnaam || p.naam || "", sex: p.geslacht || "", color: p.kleur || "",
    country: p.woontIn || "", health: arr(p.gezondheid).map(String), results: arr(p.uitslagen).map(String),
    photos: arr(p.fotos), pedigree: p.stamboom || "", extraNames: arr(p.andereNamen).map(String)
  })).filter(p => p.call)
})).sort((a, b) => a.bornIso.localeCompare(b.bornIso));

const dogByName = name => honden.find(d => same(d.name, name));
for (const l of nesten) {
  l.damId = dogByName(l.dam)?.id;
  for (const p of l.pups) p.dog = dogByName(p.name)?.id;
}
for (const d of honden) {
  d.damId = dogByName(d.dam)?.id;
  d.litter = nesten.find(l => l.pups.some(p => same(p.name, d.name)))?.id;
}

const nieuws = collection("nieuws").map(({ id, data: p, body }) => {
  const dateIso = iso(p.datum) || `${id.slice(0, 4)}-01-01`;
  return {
    id, title: p.titel || id, dateIso, dateKnown: !!p.datum && (!p.datumOnbekend || !/-01-01$/.test(dateIso)), year: yearOf(dateIso) || yearOf(id),
    order: Number(p.volgorde || 0), kop: p.kop || "", summary: p.samenvatting || "",
    recap: !!p.overzicht, photos: arr(p.fotos), body: body || ""
  };
}).sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.order - a.order || a.id.localeCompare(b.id));

// Honden herkennen in verslagen: roepnaam (min. 4 letters, ook met -je), officiële naam,
// naam zonder "Vai Avanti" en eventuele andere namen.
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const entities = [];
const addEntity = (key, call, name, extra, href) => {
  const words = [], phrases = [];
  if (call && call.length >= 4) words.push(call);
  const short = name.replace(/^Vai Avanti\s+/i, "");
  if (short && !/\s/.test(short) && short.length >= 4) words.push(short); else if (short) phrases.push(short);
  if (name && /\s/.test(name)) phrases.push(name);
  for (const x of extra) (/\s/.test(x) ? phrases : words).push(x);
  const tests = [
    ...words.map(w => new RegExp(`\\b(${reEsc(w)}|${reEsc(w.toUpperCase())})(je)?\\b`)),
    ...phrases.map(ph => new RegExp(`\\b${reEsc(ph)}\\b`, "i"))
  ];
  entities.push({ key, call, href, test: t => tests.some(r => r.test(t)) });
};
for (const d of honden) addEntity(d.id, d.call, d.name, d.extraNames, `hond-${d.id}.html`);
for (const l of nesten) for (const p of l.pups) if (!p.dog) addEntity("pup-" + slug(p.call), p.call, p.name, p.extraNames, `nesten.html#pup-${slug(p.call)}`);
for (const p of nieuws) {
  const t = p.title + "\n" + plain(p.body);
  p.dogs = entities.filter(e => e.test(t)).map(e => e.key);
}
const DOG_INFO = Object.fromEntries(entities.map(e => [e.key, { call: e.call, href: e.href }]));
const titleCount = honden.reduce((n, d) => n + d.titles.length, 0) + nesten.reduce((n, l) => n + l.pups.reduce((m, p) => m + p.results.length, 0), 0);

/* ---------- Menu ---------- */
const pageFile = p => p.id === "start" ? "index.html" : `${p.id}.html`;
const menu = [
  { key: "honden", label: "Onze honden", href: "honden.html", order: 10, fixed: true },
  { key: "nesten", label: "Nesten", href: "nesten.html", order: 20, fixed: true },
  { key: "nieuws", label: "Nieuws", href: "nieuws.html", order: 30, fixed: true },
  ...paginas.filter(p => p.inMenu && p.id !== "start" && p.id !== "contact")
    .map(p => ({ key: p.id, label: p.titel || p.id, href: pageFile(p), order: Number(p.menuVolgorde ?? 50) }))
].sort((a, b) => a.order - b.order);

/* ---------- Foto's: verkleinen naar site/img (groot) en site/img/t (miniatuur) ---------- */
const blockPhotos = b => Object.entries(b || {}).flatMap(([k, v]) =>
  k === "leden" ? arr(v).flatMap(blockPhotos) : (/^foto/.test(k) ? arr(v) : []));
const mediaInfo = {};
async function processMedia() {
  const all = new Set([
    ...honden.flatMap(d => d.photos), ...nesten.flatMap(l => [...l.photos, ...l.pups.flatMap(p => p.photos)]),
    ...nieuws.flatMap(p => p.photos), ...Object.values(site.paginafotos),
    ...paginas.flatMap(p => p.blokken.flatMap(blockPhotos))
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
      const big = Math.max(meta.width, meta.height);
      if (/\.webp$/i.test(src) && big <= 1600 && !meta.orientation) fs.copyFileSync(src, full);
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

/* ---------- Gegevens voor de blokken ---------- */
const firstText = p => plain(p.body).split(/\n{2,}/).map(s => s.trim()).find(s => s.length > 60) || plain(p.body).trim();
const reportDate = p => p.dateKnown ? fmtDate(p.dateIso) : String(p.year);
const nieuwsKaarten = nieuws.slice(0, 3).map(p => ({
  id: p.id, titel: p.title, datum: reportDate(p), foto: p.photos[0] || "",
  kop: p.kop || p.title, tekst: p.summary || clip(firstText(p).replace(/\s+/g, " "), 200)
}));
const blockData = {
  site, menu, titleCount, nieuwsKaarten, nieuwsAantal: nieuws.length,
  honden: honden.map(({ id, call, name, sex, status, born, color, highlight, cover, pos }) => ({ id, call, name, sex, status, born, color, highlight, cover, pos })),
  nesten: nesten.map(({ id, letter, born, sire, dam, pups }) => ({ id, letter, born, sire, dam, pups: pups.map(({ name, call }) => ({ name, call })) }))
};
const S = VA.createSite({ img, shot, imgUrl, data: blockData });

/* ---------- Pagina-omhulsel ---------- */
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

/* ---------- Pagina's uit blokken (startpagina, over ons, contact, eigen pagina's) ---------- */
function blockPage(p) {
  const first = p.blokken.find(b => /foto/.test(Object.keys(b).join(" ")));
  layout({
    file: pageFile(p), active: p.id === "start" ? "" : p.id,
    title: p.id === "start" ? "Vai Avanti · Whippetkennel uit Opwijk" : `${p.titel || p.id} · Vai Avanti`,
    desc: p.omschrijving || "Vai Avanti, whippetkennel uit Opwijk (België).",
    ogImage: first ? blockPhotos(first)[0] : "",
    body: S.renderBlocks(p.blokken)
  });
}

/* ---------- Onze honden ---------- */
const pupAnchor = p => "pup-" + slug(p.call);
const litterOf = id => nesten.find(l => l.id === id);
function hondenPage() {
  const elsewhere = nesten.flatMap(l => l.pups.filter(p => !p.dog).map(p => ({ ...p, litter: l })));
  layout({
    file: "honden.html", active: "honden", title: "Onze honden · Vai Avanti",
    desc: "Maak kennis met de whippets van Vai Avanti: afstamming, gezondheidsresultaten en palmares per hond.",
    ogImage: site.paginafotos.honden,
    body: `${S.pageHero({ eyebrow: "Onze honden", title: "Het team achter <em>de naam</em>", lead: "Klik op een hond voor afstamming, gezondheidsresultaten, palmares en foto's.", bg: site.paginafotos.honden, pos: "center 35%" })}
<section class="section-tight">
  <div class="wrap">
    <div class="dogs-grid">
${honden.map(S.dogCard).join("\n")}
    </div>
  </div>
</section>
${elsewhere.length ? `<section class="band section-tight">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <span class="eyebrow">Uit onze nesten</span>
        <h2>Ook <em>Vai Avanti</em></h2>
        <p class="lead">Deze honden komen uit onze nesten en wonen bij hun eigen baasjes.</p>
      </div>
      <a class="link-arrow" href="nesten.html">Alle nesten ${ICON.arrow}</a>
    </div>
    <div class="mini-grid">
${elsewhere.map(p => `      <a class="mini reveal" href="nesten.html#${pupAnchor(p)}">${img(p.photos[0], { alt: p.call, sizes: "200px" })}<b>${esc(p.call)}</b><small>${esc(p.name)}<br>${esc(p.litter.letter)}-nest · ${esc(p.sex)}${p.country ? " · " + esc(p.country) : ""}</small></a>`).join("\n")}
    </div>
  </div>
</section>` : ""}`
  });
}

/* ---------- Hondenpagina's ---------- */
const mention = p => `<a class="mention" href="nieuws.html#${p.id}">
  ${p.photos[0] && mediaInfo[p.photos[0]] ? img(p.photos[0], { alt: "", sizes: "96px" }) : '<span class="ph"></span>'}
  <span><small>${esc(reportDate(p))}${p.recap ? " · Seizoensoverzicht" : ""}</small><b>${esc(p.title)}</b></span>
  ${ICON.arrow}
</a>`;
function dogPage(d, i) {
  const posts = nieuws.filter(p => p.dogs.includes(d.id));
  const litter = d.litter && litterOf(d.litter);
  const asDam = nesten.filter(l => same(l.dam, d.name)), asSire = nesten.filter(l => same(l.sire, d.name));
  const prev = honden[(i - 1 + honden.length) % honden.length], next = honden[(i + 1) % honden.length];
  const gal = `dog-${d.id}`;
  const famRow = (label, value, href) => !value ? "" : href
    ? `<a href="${href}"><span><small>${label}</small><span>${esc(value)}</span></span>${ICON.arrow}</a>`
    : `<div class="fam"><span><small>${label}</small><span>${esc(value)}</span></span></div>`;
  const gallery = d.photos.filter(p => p !== d.cover);
  layout({
    file: `hond-${d.id}.html`, active: "honden", title: `${d.call}${d.name ? ` (${d.name})` : ""} · Vai Avanti`,
    desc: `${d.call}${d.name ? `, officieel ${d.name}` : ""}${d.born ? `, geboren ${d.born}` : ""}. ${d.highlight ? d.highlight + ". " : ""}Afstamming, gezondheid en palmares.`,
    ogImage: d.cover,
    body: `<section class="dog-hero">
  <div class="wrap dog-hero-grid">
    <div>
      <div class="crumbs"><a href="honden.html">Onze honden</a><span>/</span><span>${esc(d.call)}</span></div>
      <span class="eyebrow">${esc(d.sex)}${d.status ? " · " + esc(d.status) : ""}</span>
      <h1>${esc(d.call)}</h1>
      <div class="dog-official">${esc(d.name)}</div>
      ${d.highlight ? `<div class="highlight">${ICON.trophy}<span>${esc(d.highlight)}</span></div>` : ""}
      ${d.noteMd ? `<div class="note-dark">${md(d.noteMd)}</div>` : ""}
    </div>
    ${shot(d.cover, { group: gal, caption: `${d.call} (${d.name})`, cls: "shot dog-hero-photo", pos: d.pos, sizes: "(max-width: 980px) 100vw, 55vw" })}
  </div>
</section>

<section class="section-tight">
  <div class="wrap dog-cols">
    <div>
      <div class="reveal">
        <h2 class="sub-label">Gegevens</h2>
        <dl class="facts">
          <div><dt>Geboren</dt><dd>${esc(d.born || "–")}</dd></div>
          <div><dt>Kleur</dt><dd>${esc(d.color || "–")}</dd></div>
          <div><dt>Geslacht</dt><dd>${esc(d.sex || "–")}</dd></div>
          <div><dt>Stamboom</dt><dd>${d.pedigree ? `<a href="${esc(d.pedigree)}" target="_blank" rel="noopener">Breed Archive</a>` : "–"}</dd></div>
        </dl>
      </div>
      ${d.health.length ? `<div class="reveal">
        <h2 class="sub-label">Gezondheid</h2>
        ${S.healthChips(d.health)}
      </div>` : ""}
      <div class="reveal">
        <h2 class="sub-label">Familie</h2>
        <div class="family">
          ${famRow("Vader", d.sire, dogByName(d.sire) ? `hond-${dogByName(d.sire).id}.html` : "")}
          ${famRow("Moeder", d.dam, d.damId ? `hond-${d.damId}.html` : "")}
          ${litter ? famRow("Geboren in", `${litter.letter}-nest${litter.born ? ` (${litter.born})` : ""}`, `nesten.html#${litter.id}`) : ""}
          ${asDam.map(l => famRow("Moeder van", `${l.letter}-nest${l.born ? ` (${l.born})` : ""}`, `nesten.html#${l.id}`)).join("\n          ")}
          ${asSire.map(l => famRow("Vader van", `${l.letter}-nest${l.born ? ` (${l.born})` : ""}`, `nesten.html#${l.id}`)).join("\n          ")}
        </div>
      </div>
    </div>
    <div>
      <div class="reveal">
        <h2 class="sub-label">${d.titles.length ? `Palmares · ${d.titles.length} ${d.titles.length === 1 ? "titel" : "titels"}` : "Palmares"}</h2>
        ${d.titles.length
          ? `<ul class="palmares">${d.titles.map(([y, t, p]) => `<li><b>${esc(y)}</b><span>${esc(t)}${p ? ` <small>· ${esc(p)}</small>` : ""}</span></li>`).join("")}</ul>`
          : `<p class="note">${asDam.length || asSire.length ? `${esc(d.call)} kreeg een ereplaats als ouder van onze nesten.` : `${esc(d.call)} staat nog aan het begin van ${d.sex === "Reu" ? "zijn" : "haar"} carrière.`}</p>`}
      </div>
    </div>
  </div>
</section>

${gallery.length ? `<section class="band section-tight">
  <div class="wrap">
    <div class="section-head reveal"><div><span class="eyebrow">Foto's</span><h2>${esc(d.call)} in <em>beeld</em></h2></div></div>
    <div class="gallery">
${gallery.map(p => "      " + shot(p, { group: gal, caption: `${d.call} (${d.name})`, sizes: "(max-width: 640px) 50vw, 25vw" })).join("\n")}
    </div>
  </div>
</section>` : ""}

${posts.length ? `<section class="section-tight">
  <div class="wrap">
    <div class="section-head reveal">
      <div><span class="eyebrow">In het nieuws</span><h2>${posts.length} ${posts.length === 1 ? "verslag" : "verslagen"} met <em>${esc(d.call)}</em></h2></div>
      <a class="link-arrow" href="nieuws.html#hond-${d.id}">Toon ze allemaal in het archief ${ICON.arrow}</a>
    </div>
    <div class="mention-list">
${posts.slice(0, 8).map(mention).join("\n")}
    </div>
  </div>
</section>` : ""}

<section class="section-tight" style="padding-top:0">
  <div class="wrap dog-nav">
    <a class="link-arrow" href="hond-${prev.id}.html">${ICON.back} ${esc(prev.call)}</a>
    <a class="link-arrow" href="honden.html">Alle honden</a>
    <a class="link-arrow" href="hond-${next.id}.html">${esc(next.call)} ${ICON.arrow}</a>
  </div>
</section>`
  });
}

/* ---------- Nesten ---------- */
function nestenPage() {
  const dogById = Object.fromEntries(honden.map(d => [d.id, d]));
  const pupCard = p => {
    const d = p.dog && dogById[p.dog];
    const health = p.health.length ? p.health : (d ? d.health : []);
    const pedigree = p.pedigree || (d ? d.pedigree : "");
    const g = pupAnchor(p);
    return `<article class="pup reveal" id="${g}">
      ${shot(p.photos[0], { group: g, caption: `${p.call} (${p.name})`, sizes: "(max-width: 640px) 100vw, 33vw", extra: p.photos.length > 1 ? `<span class="count">${p.photos.length} foto's</span>` : "" })}
      ${p.photos.slice(1).map(ph => shot(ph, { group: g, caption: `${p.call} (${p.name})`, hidden: true })).join("")}
      <div class="pup-body">
        <h3>${esc(p.call)}</h3>
        <div class="dog-official">${esc(p.name)}</div>
        <div class="pup-meta">${[p.sex, p.color].filter(Boolean).map(esc).join(" · ")}${p.country ? ` · woont in ${esc(p.country)}` : (d ? " · bij ons" : "")}</div>
        ${health.length ? S.healthChips(health) : ""}
        ${p.results.length ? `<ul class="pup-results">${p.results.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
        <div class="pup-links">
          ${d ? `<a class="link-arrow" href="hond-${d.id}.html">Bekijk profiel ${ICON.arrow}</a>` : ""}
          ${pedigree ? `<a class="link-arrow" href="${esc(pedigree)}" target="_blank" rel="noopener">Stamboom ${ICON.arrow}</a>` : ""}
        </div>
      </div>
    </article>`;
  };
  const blocks = [...nesten].reverse().map(l => `<section class="litter-block" id="${l.id}">
  <div class="wrap">
    <div class="litter-head reveal">
      <div class="litter-letter">${esc(l.letter)}</div>
      <div>
        <h2>${esc(l.letter)}-nest</h2>
        <div class="meta">${l.born ? `Geboren ${esc(l.born)} · ` : ""}${l.pups.length} ${l.pups.length === 1 ? "pup" : "pups"} op deze site<br>
          ${esc(l.sire)} × ${l.damId ? `<a href="hond-${l.damId}.html">${esc(l.dam)}</a>` : esc(l.dam)}</div>
        ${l.introMd ? `<div class="litter-intro">${md(l.introMd)}</div>` : ""}
      </div>
      ${l.photos[0] && mediaInfo[l.photos[0]] ? shot(l.photos[0], { group: "nest-" + l.id, caption: `${l.letter}-nest`, sizes: "300px" }) : ""}
    </div>
    <div class="pups">
${l.pups.map(pupCard).join("\n")}
    </div>
  </div>
</section>`).join("\n");
  layout({
    file: "nesten.html", active: "nesten", title: "Nesten · Vai Avanti",
    desc: `Alle nesten van whippetkennel Vai Avanti met hun pups${V.tonen ? ", en de nesten die verwacht worden" : ""}.`,
    ogImage: site.paginafotos.nesten,
    body: `${S.pageHero({ eyebrow: "Pups &amp; nesten", title: "Onze <em>nesten</em>", lead: "Elk nest krijgt zijn eigen letter. Hier vindt u alle pups uit onze nesten, met hun foto's, gezondheidsresultaten en stamboom.", bg: site.paginafotos.nesten, pos: "center 40%" })}
${V.tonen ? `<section class="section-tight" style="padding-bottom:0">
  <div class="wrap">${S.expectedBand()}</div>
</section>` : ""}
${blocks}`
  });
}

/* ---------- Nieuws ---------- */
function nieuwsPage() {
  const years = [...new Set(nieuws.map(p => p.year))].sort((a, b) => b - a);
  const counts = {};
  for (const p of nieuws) for (const k of p.dogs) if (DOG_INFO[k]) counts[k] = (counts[k] || 0) + 1;
  const filterDogs = Object.keys(counts).filter(k => counts[k] >= 3).sort((a, b) => counts[b] - counts[a]);
  const reportChips = p => p.dogs.filter(k => DOG_INFO[k]).map(k => `<a class="chip" href="${DOG_INFO[k].href}">${esc(DOG_INFO[k].call)}</a>`).join("");
  const report = p => {
    const text = plain(p.body);
    const long = text.length > 520 || text.split(/\n{2,}/).length > 4;
    const photos = p.photos.filter(ph => mediaInfo[ph]);
    const extra = photos.length - 4;
    return `<article class="report reveal${p.recap ? " recap" : ""}${photos.length ? "" : " no-photo"}" id="${p.id}" data-dogs="${p.dogs.join(" ")}">
      ${photos.length ? `<div class="report-media">
        ${shot(photos[0], { group: p.id, caption: p.title, sizes: "(max-width: 980px) 100vw, 340px" })}
        ${photos.length > 1 ? `<div class="thumbs">${photos.slice(1, 4).map((ph, i) => shot(ph, { group: p.id, caption: p.title, sizes: "110px", extra: i === 2 && extra > 0 ? `<span class="count">+${extra}</span>` : "" })).join("")}</div>` : ""}
        ${photos.slice(4).map(ph => shot(ph, { group: p.id, caption: p.title, hidden: true })).join("")}
      </div>` : ""}
      <div class="report-body">
        <span class="report-tag">${p.recap ? "Seizoensoverzicht · " : ""}${esc(reportDate(p))}${photos.length ? ` · ${photos.length} ${photos.length === 1 ? "foto" : "foto's"}` : ""}</span>
        <h3>${esc(p.title)}</h3>
        ${p.dogs.some(k => DOG_INFO[k]) ? `<div class="chips">${reportChips(p)}</div>` : ""}
        ${text.trim() ? `<div class="report-text${long ? " clamped" : ""}">${md(p.body)}</div>
        ${long ? `<button class="more-btn" type="button" aria-expanded="false">Lees het volledige verslag ${ICON.down}</button>` : ""}` : ""}
      </div>
    </article>`;
  };
  const firstYear = years[years.length - 1];
  layout({
    file: "nieuws.html", active: "nieuws", title: "Wedstrijdverslagen · Vai Avanti",
    desc: `Alle ${nieuws.length} wedstrijdverslagen van Vai Avanti sinds ${firstYear}: uitslagen, foto's en verhalen van de renbaan.`,
    ogImage: site.paginafotos.nieuws,
    body: `${S.pageHero({ eyebrow: "Nieuws", title: "Van de <em>renbaan</em>", lead: `Alle ${nieuws.length} wedstrijdverslagen sinds ${firstYear}, met foto's. Filter op een hond om enkel zijn of haar verslagen te zien.`, bg: site.paginafotos.nieuws, pos: "center 40%" })}
<div class="news-toolbar" id="archief">
  <div class="wrap">
    <div class="filter-chips" role="group" aria-label="Filter op hond">
      <button type="button" data-filter="alle" aria-pressed="true">Alle <small>${nieuws.length}</small></button>
${filterDogs.map(k => `      <button type="button" data-filter="${k}" aria-pressed="false">${esc(DOG_INFO[k].call)} <small>${counts[k]}</small></button>`).join("\n")}
    </div>
    <nav class="year-links" aria-label="Spring naar jaar"><span>Jaar</span>${years.map(y => `<a href="#jaar-${y}">${y}</a>`).join("")}</nav>
  </div>
</div>
<div class="wrap" id="archive" style="padding-bottom:100px">
${years.map(y => {
    const ps = nieuws.filter(p => p.year === y);
    return `<section class="year-block" id="jaar-${y}">
  <div class="year-head"><h2>${y}</h2><span>${ps.length} ${ps.length === 1 ? "verslag" : "verslagen"}</span></div>
  <div class="reports">
${ps.map(report).join("\n")}
  </div>
</section>`;
  }).join("\n")}
  <p class="empty-state" id="archive-empty" hidden>Geen verslagen gevonden voor deze hond.</p>
</div>`
  });
}

/* ---------- 404 ---------- */
function notFound() {
  const start = paginas.find(p => p.id === "start");
  const heroFoto = start && (start.blokken.find(b => b.type === "hero") || {}).foto;
  layout({
    file: "404.html", active: "", title: "Pagina niet gevonden · Vai Avanti", desc: "Deze pagina bestaat niet (meer).",
    body: `${S.pageHero({ eyebrow: "404", title: "Deze pagina is <em>weggerend</em>", lead: "De pagina die u zoekt bestaat niet (meer). Misschien vindt u het via een van deze pagina's.", bg: heroFoto })}
<section class="section-tight"><div class="wrap cta-band">
  <a class="btn btn-dark" href="index.html">Naar de startpagina ${ICON.arrow}</a>
  <a class="link-arrow" href="nieuws.html">Wedstrijdverslagen ${ICON.arrow}</a>
</div></section>`
  });
}

/* ---------- Beheerpagina ---------- */
function beheer() {
  const dir = path.join(OUT, "beheer");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(path.join(SRC, "beheer"))) fs.copyFileSync(path.join(SRC, "beheer", f), path.join(dir, f));
  // Gegevens die de beheerpagina nodig heeft om blokken met honden/nesten/nieuws te tonen
  // + een kopie van de bewerkbare inhoud, om rond te kijken zonder koppelcode
  const inhoud = {
    site: JSON.parse(fs.readFileSync(path.join(INHOUD, "site.json"), "utf8")),
    paginas: Object.fromEntries(listDir("paginas", ".json").map(f => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(INHOUD, "paginas", f), "utf8"))]))
  };
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({
    ...blockData, mediaInfo, vasteMenu: menu.filter(m => m.fixed), inhoud, gebouwd: new Date().toISOString()
  }));
}

/* ---------- Bouwen ---------- */
async function main() {
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  await processMedia();

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

  paginas.forEach(blockPage);
  hondenPage();
  honden.forEach(dogPage);
  nestenPage();
  nieuwsPage();
  notFound();
  beheer();

  const pages = new Set(["honden.html", "nesten.html", "nieuws.html", "404.html", ...paginas.map(pageFile), ...honden.map(d => `hond-${d.id}.html`)]);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html") && !pages.has(f)) fs.unlinkSync(path.join(OUT, f));
  console.log(`${pages.size} pagina's gebouwd · ${paginas.length} eigen pagina's · ${honden.length} honden · ${nesten.length} nesten · ${nieuws.length} verslagen`);
}
main().catch(e => { console.error(e); process.exit(1); });
