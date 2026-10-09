// Bouwt de volledige website in site/ uit de inhoud in inhoud/ (bewerkbaar via Pages CMS),
// de foto's in media/ en de opmaak in _bron/assets/.
// Gebruik: npm run build   (of: node _bron/tools/build.js)
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const sharp = require("sharp");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "_bron");
const INHOUD = path.join(ROOT, "inhoud");
const OUT = path.join(ROOT, "site");

/* ---------- Hulpjes ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const arr = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== "") : (v ? [v] : []);
const iso = v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10);
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const fmtDate = s => { const [y, m, d] = iso(s).split("-").map(Number); return y && m && d ? `${d} ${MAANDEN[m - 1]} ${y}` : ""; };
const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase() && !!a;

/* ---------- Eenvoudige Markdown (zoals Pages CMS die bewaart) ---------- */
function inline(text) {
  const keep = [];
  let s = esc(text).replace(/\\([\\*_`\[\]()#+\-.!>~|])/g, (_, c) => `\u0000${keep.push(c) - 1}\u0000`);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|[\w./#-]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>").replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => esc(keep[i]));
}
function md(src) {
  const text = String(src || "").replace(/\r/g, "").replace(/<br\s*\/?>/gi, "\n").trim();
  if (!text) return "";
  return text.split(/\n{2,}/).map(block => {
    const lines = block.split("\n");
    if (lines.every(l => /^\s*[-*+]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*+]\s+/, ""))}</li>`).join("")}</ul>`;
    const h = block.match(/^#{1,6}\s+(.+)$/);
    if (h && lines.length === 1) return `<h4>${inline(h[1])}</h4>`;
    return `<p>${lines.map(l => inline(l.replace(/(\\|\s{2,})$/, ""))).join("<br>")}</p>`;
  }).join("\n");
}
const plain = src => String(src || "").replace(/\r/g, "").replace(/^#{1,6}\s+/gm, "").replace(/\\(.)/g, "$1").replace(/[*_]/g, "");

/* ---------- Inhoud inlezen ---------- */
function readMd(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { data: yaml.load(m[1]) || {}, body: m[2] } : { data: {}, body: raw };
}
const collection = dir => fs.existsSync(path.join(INHOUD, dir))
  ? fs.readdirSync(path.join(INHOUD, dir)).filter(f => f.endsWith(".md"))
    .map(f => ({ id: slug(f.replace(/\.md$/, "")), ...readMd(path.join(INHOUD, dir, f)) }))
  : [];
const site = JSON.parse(fs.readFileSync(path.join(INHOUD, "site.json"), "utf8"));

const yearOf = s => parseInt(String(s).match(/\d{4}/)?.[0] || "0", 10);
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
    noteMd: body.trim(), extraNames: arr(d.andereNamen).map(String),
    order: Number(d.volgorde ?? 999)
  };
}).filter(d => d.call).sort((a, b) => a.order - b.order || a.call.localeCompare(b.call));

const nesten = collection("nesten").map(({ id, data: l, body }) => ({
  id: slug(l.letter || id), letter: String(l.letter || id).toUpperCase(), bornIso: iso(l.geboren), born: fmtDate(l.geboren),
  sire: l.vader || "", dam: l.moeder || "", introMd: body.trim(),
  photos: arr(l.foto),
  pups: arr(l.pups).map(p => ({
    name: p.naam || "", call: p.roepnaam || p.naam || "", sex: p.geslacht || "", color: p.kleur || "",
    country: p.woontIn || "", health: arr(p.gezondheid).map(String), results: arr(p.uitslagen).map(String),
    photos: arr(p.fotos), pedigree: p.stamboom || "", extraNames: arr(p.andereNamen).map(String)
  })).filter(p => p.call)
})).sort((a, b) => a.bornIso.localeCompare(b.bornIso));

// Verbanden op naam: pup <-> hond met eigen pagina, moeder, nest
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

// Welke honden komen in een verslag voor? Roepnaam (min. 4 letters, ook met -je), officiële naam,
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

/* ---------- Foto's: verkleinen naar site/img (groot) en site/img/t (miniatuur) ---------- */
const mediaInfo = {};
async function processMedia() {
  const all = new Set([
    ...honden.flatMap(d => d.photos), ...nesten.flatMap(l => [...l.photos, ...l.pups.flatMap(p => p.photos)]),
    ...nieuws.flatMap(p => p.photos), site.hero.foto, ...site.team.map(t => t.foto), ...Object.values(site.paginafotos)
  ].filter(Boolean));
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
      else await sharp(src).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(full);
      await sharp(src).rotate().resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toFile(thumb);
      const m2 = await sharp(full).metadata();
      cache[name] = { stamp, w: m2.width, h: m2.height };
      made++;
    }
    mediaInfo[p] = { name, w: cache[name].w, h: cache[name].h };
  }
  // Verkleinde foto's die nergens meer gebruikt worden opruimen
  for (const dir of [path.join(OUT, "img"), path.join(OUT, "img", "t")])
    for (const f of fs.readdirSync(dir)) if (f.endsWith(".webp") && !names.has(f.replace(/\.webp$/, ""))) fs.unlinkSync(path.join(dir, f));
  for (const k of Object.keys(cache)) if (!names.has(k)) delete cache[k];
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  console.log(`${Object.keys(mediaInfo).length} foto's (${made} nieuw verkleind)`);
}
const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4 10-10"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3c0 5 10 6 10 11s-4 4-5 7M17 3c0 3-2 4.5-4.5 6M7 21c0-2 1.2-3.3 3-4.6"/><path d="M8.5 6h7M8 18h7M7.6 12h8.8"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"/><path d="M7 12h3l1.5-2.5 2 4 1.5-1.5h2"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.2 8.1 7.5 9 4.3-.9 7.5-4.6 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>'
};

// Afbeelding met miniatuur + groot formaat, breedte/hoogte tegen verspringen
function img(p, { alt = "", cls = "", pos = "", sizes = "(max-width: 640px) 100vw, 50vw", eager = false } = {}) {
  const m = mediaInfo[p];
  if (!m) return `<span class="no-photo${cls ? " " + cls : ""}" role="img" aria-label="${esc(alt || "Nog geen foto")}"></span>`;
  return `<img src="img/t/${m.name}.webp" srcset="img/t/${m.name}.webp 640w, img/${m.name}.webp 1600w" sizes="${sizes}"` +
    ` width="${m.w}" height="${m.h}" alt="${esc(alt)}"` +
    (cls ? ` class="${cls}"` : "") + (pos ? ` style="object-position:${esc(pos)}"` : "") +
    (eager ? ` fetchpriority="high"` : ` loading="lazy" decoding="async"`) + ">";
}
// Klikbare foto die groot opent
function shot(p, { group = "", caption = "", alt = caption, cls = "shot", pos = "", sizes, extra = "", hidden = false } = {}) {
  const m = mediaInfo[p];
  if (!m) return hidden ? "" : `<div class="${cls}">${img(p, { alt })}${extra}</div>`;
  return `<button type="button" class="${cls}" data-full="img/${m.name}.webp"` + (group ? ` data-group="${esc(group)}"` : "") +
    ` data-caption="${esc(caption)}" aria-label="Foto vergroten${caption ? ": " + esc(caption) : ""}"${hidden ? " hidden" : ""}>` +
    (hidden ? "" : img(p, { alt, pos, sizes })) + extra + `</button>`;
}
const imgUrl = p => mediaInfo[p] ? `img/${mediaInfo[p].name}.webp` : "";

const dogById = Object.fromEntries(honden.map(d => [d.id, d]));
const pupAnchor = p => "pup-" + slug(p.call);
// Alle honden die in verslagen kunnen voorkomen: roepnaam + link
const DOG_INFO = Object.fromEntries(entities.map(e => [e.key, { call: e.call, href: e.href }]));
const litterOf = id => nesten.find(l => l.id === id);
const titleCount = honden.reduce((n, d) => n + d.titles.length, 0) +
  nesten.reduce((n, l) => n + l.pups.reduce((m, p) => m + (p.results || []).length, 0), 0);
const SITE_URL = "https://www.vai-avanti.be/";
const C = site.contact;
const mailParts = String(C.email || "").split("@");
const mailFallback = mailParts.length === 2 ? `${mailParts[0]} [at] ${mailParts[1]}` : "";
const telHref = "tel:" + String(C.telefoon || "").replace(/[^\d+]/g, "");
const V = site.verwacht || {};

/* ---------- Teksten voor de nieuwsteasers op de startpagina ---------- */
const firstText = p => plain(p.body).split(/\n{2,}/).map(s => s.trim()).find(s => s.length > 60) || plain(p.body).trim();
const clip = (s, n) => s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s;
const teaser = p => [p.kop || p.title, p.summary || clip(firstText(p).replace(/\s+/g, " "), 200)];

/* ---------- Vaste delen ---------- */
const NAV = [["honden.html", "Onze honden", "honden"], ["nesten.html", "Nesten", "nesten"], ["nieuws.html", "Nieuws", "nieuws"], ["over-ons.html", "Over ons", "over-ons"]];
const header = active => `<header class="site-header">
  <nav class="wrap nav" aria-label="Hoofdmenu">
    <a class="brand" href="index.html" aria-label="Vai Avanti – startpagina"><span class="brand-logo" role="img" aria-label="Vai Avanti"></span></a>
    <ul class="nav-links">
${NAV.map(([href, label, key]) => `      <li><a href="${href}"${key === active ? ' class="active" aria-current="page"' : ""}>${label}</a></li>`).join("\n")}
    </ul>
    <a class="btn nav-cta" href="contact.html"${active === "contact" ? ' aria-current="page"' : ""}>Contact</a>
    <button class="menu-toggle" aria-label="Menu openen" aria-expanded="false">${ICON.menu}</button>
  </nav>
</header>`;

const footer = () => `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <span class="brand-logo" role="img" aria-label="Vai Avanti"></span>
        <p>Whippetkennel uit ${esc(String(C.plaats || "").replace(/^\d+\s*/, "").replace(/,.*$/, ""))}, België. Gezonde racewhippets, gefokt met passie sinds 2020.</p>
        <div class="socials">
          ${C.instagram ? `<a href="${esc(C.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.insta}</a>` : ""}
          ${C.facebook ? `<a href="${esc(C.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>` : ""}
          <a href="contact.html" data-mail-link aria-label="E-mail">${ICON.mail}</a>
        </div>
      </div>
      <div>
        <h4>Ontdek</h4>
        <ul>
          <li><a href="honden.html">Onze honden</a></li>
          <li><a href="nesten.html">Nesten</a></li>
          <li><a href="nieuws.html">Wedstrijdverslagen</a></li>
          <li><a href="index.html#gezondheid">Gezondheid</a></li>
        </ul>
      </div>
      <div>
        <h4>Kennel</h4>
        <ul>
          <li><a href="over-ons.html">Over ons</a></li>
          ${V.tonen ? `<li><a href="nesten.html#verwacht">${esc(V.label || "Verwachte nesten")}</a></li>` : ""}
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li>${esc(C.plaats)}</li>
          <li><a href="${telHref}">${esc(C.telefoon)}</a></li>
          <li><a href="contact.html" data-mail-link data-mail>${esc(mailFallback)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Vai Avanti · Kennelnaam erkend door de KMSH</span>
      <a href="#top" style="color:inherit;text-decoration:none">Terug naar boven ↑</a>
    </div>
  </div>
</footer>`;

function layout({ file, title, desc, active, body, ogImage = site.hero.foto }) {
  const html = `<!doctype html>
<html lang="nl-BE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${imgUrl(ogImage) ? `<meta property="og:image" content="${SITE_URL}${imgUrl(ogImage)}">` : ""}
<script>document.documentElement.classList.add("js");</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/logo.css">
</head>
<body id="top">
${header(active)}
<main>
${body}
</main>
${footer()}
<script src="assets/site.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, file), html);
}

const pageHero = ({ eyebrow, title, lead = "", bg = "", pos = "", crumbs = "" }) => `<section class="page-hero">
  ${bg && mediaInfo[bg] ? `<div class="bg">${img(bg, { pos, sizes: "100vw", eager: true })}</div>` : ""}
  <div class="wrap">
    ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ""}
    <span class="eyebrow">${eyebrow}</span>
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ""}
  </div>
</section>`;

/* ---------- Bouwstenen ---------- */
const dogCard = d => `<a class="dog-card reveal" href="hond-${d.id}.html">
  <div class="dog-media">
    ${img(d.cover, { alt: `${d.call} (${d.name})`, pos: d.pos, sizes: "(max-width: 640px) 100vw, 33vw" })}
    <div class="badges">${d.sex ? `<span class="badge">${esc(d.sex)}</span>` : ""}${d.status ? `<span class="badge gold">${esc(d.status)}</span>` : ""}</div>
  </div>
  <div class="dog-body">
    <h3>${esc(d.call)}</h3>
    <div class="dog-official">${esc(d.name)}</div>
    <div class="dog-meta">${[d.born && "Geboren " + d.born, d.color].filter(Boolean).map(esc).join(" · ")}</div>
    ${d.highlight ? `<div class="dog-highlight">${ICON.trophy}<span>${esc(d.highlight)}</span></div>` : ""}
    <div class="dog-more"><span class="link-arrow">Bekijk profiel ${ICON.arrow}</span></div>
  </div>
</a>`;

const healthChips = list => `<div class="chips">${list.map(h => `<span class="chip">${ICON.check}${esc(h)}</span>`).join("")}</div>`;

const reportChips = p => p.dogs.filter(k => DOG_INFO[k]).map(k => `<a class="chip" href="${DOG_INFO[k].href}">${esc(DOG_INFO[k].call)}</a>`).join("");

const reportDate = p => p.dateKnown ? fmtDate(p.dateIso) : String(p.year);

const mention = p => `<a class="mention" href="nieuws.html#${p.id}">
  ${p.photos[0] && mediaInfo[p.photos[0]] ? img(p.photos[0], { alt: "", sizes: "96px" }) : '<span class="ph"></span>'}
  <span><small>${esc(reportDate(p))}${p.recap ? " · Seizoensoverzicht" : ""}</small><b>${esc(p.title)}</b></span>
  ${ICON.arrow}
</a>`;

const contactBlock = () => `<div class="contact-card reveal">
  <div class="contact-info dark">
    <span class="eyebrow">Contact</span>
    <h2>Kom <em>kennismaken</em></h2>
    <p class="lead">Vragen over onze honden of over onze nesten? Stuur ons een bericht of bel ons gerust.</p>
    <ul class="contact-list">
      <li><a href="${telHref}"><span class="icon">${ICON.phone}</span><div><small>Telefoon</small><span>${esc(C.telefoon)}</span></div></a></li>
      <li><a href="contact.html" data-mail-link><span class="icon">${ICON.mail}</span><div><small>E-mail</small><span data-mail>${esc(mailFallback)}</span></div></a></li>
      ${C.instagram ? `<li><a href="${esc(C.instagram)}" target="_blank" rel="noopener"><span class="icon">${ICON.insta}</span><div><small>Instagram</small><span>@${esc(C.instagram.replace(/\/+$/, "").split("/").pop())}</span></div></a></li>` : ""}
      <li><div><span class="icon">${ICON.pin}</span><div><small>Locatie</small><span>${esc(C.plaats)}</span></div></div></li>
    </ul>
  </div>
  <form class="contact-form" id="contact-form">
    <h3>Stuur ons een bericht</h3>
    <p>We antwoorden zo snel mogelijk.</p>
    <div class="row">
      <label>Naam<input id="naam" name="naam" required autocomplete="name"></label>
      <label>E-mailadres<input id="email" name="email" type="email" required autocomplete="email"></label>
    </div>
    <label>Onderwerp
      <select name="onderwerp" id="onderwerp">
        <option>Informatie over onze nesten</option>
        <option>Vraag over onze honden</option>
        <option>Iets anders</option>
      </select>
    </label>
    <label>Bericht<textarea id="bericht" name="bericht" required></textarea></label>
    <div class="hp" aria-hidden="true"><label>Laat dit leeg<input type="checkbox" id="botcheck" name="botcheck" tabindex="-1" autocomplete="off"></label></div>
    <div id="captcha-slot"></div>
    <div class="form-foot">
      <small id="form-status" aria-live="polite"></small>
      <button class="btn btn-dark" type="submit" id="form-submit">Verstuur bericht ${ICON.arrow}</button>
    </div>
  </form>
</div>`;

const expectedBand = () => V.tonen ? `<div class="expected-band reveal" id="verwacht">
  <div class="litter-letter">${esc((String(V.label || "").match(/\d{4}/) || ["Nieuw"])[0])}</div>
  <div class="txt">
    <div class="litter-date">${esc(V.label || "")}</div>
    <h2>${inline(V.titel || "")}</h2>
    <p>${esc(V.tekst || "")}</p>
  </div>
  <a class="btn btn-gold" href="contact.html#nesten">Informeer naar de nesten ${ICON.arrow}</a>
</div>` : "";

const healthSection = () => `<section class="dark health" id="gezondheid">
  <div class="wrap health-grid">
    <div class="reveal">
      <span class="eyebrow">Gezondheid voorop</span>
      <h2>Getest, gedocumenteerd en <em>transparant</em></h2>
      <p class="lead">Een snelle whippet is pas een goede whippet als hij ook gezond is. Daarom laten wij onze fokhonden uitgebreid onderzoeken en tonen we de resultaten per hond.</p>
      <a class="btn btn-gold" href="honden.html">Bekijk de resultaten per hond ${ICON.arrow}</a>
    </div>
    <div class="health-items">
      <div class="health-item reveal"><div class="icon">${ICON.dna}</div><h3>DNA-testen</h3><p>Myostatin deficiency en Factor VII deficiency: N/N (normal).</p></div>
      <div class="health-item reveal"><div class="icon">${ICON.heart}</div><h3>Hart &amp; rug</h3><p>Hartonderzoek en rugscreening (LTV en SP) bij onze fokdieren.</p></div>
      <div class="health-item reveal"><div class="icon">${ICON.clip}</div><h3>Heupen &amp; ellebogen</h3><p>Officieel gescreend, met resultaten tot Excellent / A1.</p></div>
      <div class="health-item reveal"><div class="icon">${ICON.shield}</div><h3>MyDogDNA</h3><p>Volledige DNA-screening: clear op alle 272 checkpoints.</p></div>
    </div>
  </div>
</section>`;

/* =====================================================================
   Pagina's
   ===================================================================== */

/* ---------- Startpagina ---------- */
function home() {
  const latest = nieuws.slice(0, 3);
  const [l0] = latest;
  const newsCard = (p, cls) => p ? `<a class="news-card ${cls} reveal" href="nieuws.html#${p.id}">
        <div class="media">${img(p.photos[0], { alt: p.title, pos: "center 30%", sizes: cls === "featured" ? "(max-width: 980px) 100vw, 55vw" : "(max-width: 980px) 100vw, 20vw" })}</div>
        <div class="news-body">
          <span class="news-tag">${esc(p.title)} · ${esc(reportDate(p))}</span>
          <h3>${esc(teaser(p)[0])}</h3>
          <p>${esc(teaser(p)[1])}</p>
          <span class="link-arrow">Lees het verslag ${ICON.arrow}</span>
        </div>
      </a>` : "";
  const litterCards = nesten.map(l => `<a class="litter reveal" href="nesten.html#${l.id}" style="text-decoration:none;color:inherit">
      <div class="litter-letter">${esc(l.letter)}</div>
      <h3>${esc(l.letter)}-nest</h3>
      <div class="litter-date">${l.born ? "Geboren " + esc(l.born) : "&nbsp;"}</div>
      <p class="litter-parents">${esc(l.sire)} <span>×</span> ${esc(l.dam)}</p>
      <div class="chips">${l.pups.map(p => `<span class="chip">${esc(p.name.replace(/^Vai Avanti /i, ""))} <small>· ${esc(p.call)}</small></span>`).join("")}</div>
    </a>`).join("\n");
  const team = site.team || [];
  const letters = nesten.map(l => l.letter);
  const nestList = letters.length > 1 ? letters.slice(0, -1).join("-, ") + "- en " + letters.slice(-1) : letters.join("");

  layout({
    file: "index.html", active: "", title: "Vai Avanti · Whippetkennel uit Opwijk",
    desc: "Vai Avanti is een whippetkennel uit Opwijk (België). Gezonde, geteste racewhippets, onze nesten en verslagen van de renbaan.",
    body: `<section class="hero">
  <div class="hero-media">${img(site.hero.foto, { alt: "Racende whippets", sizes: "100vw", eager: true })}</div>
  <div class="wrap">
    <div class="hero-content">
      <span class="eyebrow">${esc(site.hero.bovenschrift)}</span>
      <h1>${inline(site.hero.titel)}</h1>
      <p class="lead">${esc(site.hero.intro)}</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="honden.html">Ontmoet onze honden ${ICON.arrow}</a>
        <a class="btn btn-ghost" href="nesten.html${V.tonen ? "#verwacht" : ""}">${esc(V.tonen && V.label ? V.label : "Onze nesten")}</a>
      </div>
    </div>
  </div>
  ${l0 ? `<a class="hero-news" href="nieuws.html#${l0.id}">
    ${img(l0.photos[0], { alt: "", sizes: "58px" })}
    <div><small>Laatste nieuws</small><span>${esc(teaser(l0)[0])}</span></div>
  </a>` : ""}
</section>

<section class="stats" aria-label="Vai Avanti in cijfers">
  <div class="wrap">
    <div class="stats-card reveal">
      <div class="stat"><strong>2020</strong><span>Kennelnaam erkend door de KMSH</span></div>
      <div class="stat"><strong>${nesten.length}</strong><span>Nesten gefokt: het ${esc(nestList)}-nest</span></div>
      <div class="stat"><strong>${titleCount}</strong><span>Titels en ereplaatsen van onze honden</span></div>
      <div class="stat"><strong>272</strong><span>MyDogDNA-checkpoints, allemaal clear</span></div>
    </div>
  </div>
</section>

<section id="honden">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <span class="eyebrow">Onze honden</span>
        <h2>Het team achter <em>de naam</em></h2>
        <p class="lead">Elke hond heeft een eigen pagina met afstamming, gezondheid, palmares en foto's.</p>
      </div>
    </div>
    <div class="dogs-grid">
${honden.map(dogCard).join("\n")}
    </div>
  </div>
</section>

<section class="news" id="nieuws">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <span class="eyebrow">Van de renbaan</span>
        <h2>Laatste <em>nieuws</em></h2>
      </div>
      <a class="link-arrow" href="nieuws.html">Alle ${nieuws.length} wedstrijdverslagen ${ICON.arrow}</a>
    </div>
    <div class="news-grid">
      ${newsCard(latest[0], "featured")}
      ${newsCard(latest[1], "small")}
      ${newsCard(latest[2], "small")}
    </div>
  </div>
</section>

${healthSection()}

<section id="nesten">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <span class="eyebrow">Pups &amp; nesten</span>
        <h2>Onze <em>nesten</em></h2>
        <p class="lead">Elk nest krijgt zijn eigen letter. Klik op een nest voor alle pups, hun foto's en gezondheidsresultaten.</p>
      </div>
      <a class="link-arrow" href="nesten.html">Alle nesten en pups ${ICON.arrow}</a>
    </div>
    <div class="litters">
${litterCards}
    </div>
    ${V.tonen ? `<div style="margin-top:20px">${expectedBand()}</div>` : ""}
  </div>
</section>

<section class="about" id="over-ons">
  <div class="wrap about-grid">
    <div class="about-media reveal">
      ${team[0] ? img(team[0].foto, { alt: team[0].naam, cls: "main", sizes: "(max-width: 980px) 86vw, 40vw" }) : ""}
      ${team[1] ? img(team[1].foto, { alt: team[1].naam, cls: "inset", sizes: "(max-width: 980px) 50vw, 25vw" }) : ""}
      <div class="since"><strong>2018</strong><small>Lylo, onze eerste</small></div>
    </div>
    <div class="about-text reveal">
      <span class="eyebrow">Over ons</span>
      <h2>${inline(site.overOns.titel)}</h2>
      <p>${esc(site.overOns.startpagina)}</p>
      ${site.overOns.citaat ? `<blockquote>“${esc(site.overOns.citaat)}”<cite>${esc(site.overOns.citaatVan || "")}</cite></blockquote>` : ""}
      <p style="margin-top:28px"><a class="btn btn-dark" href="over-ons.html">Lees ons verhaal ${ICON.arrow}</a></p>
    </div>
  </div>
</section>

<section id="contact">
  <div class="wrap">
    ${contactBlock()}
  </div>
</section>`
  });
}

/* ---------- Onze honden ---------- */
function hondenPage() {
  const elsewhere = nesten.flatMap(l => l.pups.filter(p => !p.dog).map(p => ({ ...p, litter: l })));
  layout({
    file: "honden.html", active: "honden", title: "Onze honden · Vai Avanti",
    desc: "Maak kennis met de whippets van Vai Avanti: afstamming, gezondheidsresultaten en palmares per hond.",
    ogImage: site.paginafotos.honden,
    body: `${pageHero({ eyebrow: "Onze honden", title: "Het team achter <em>de naam</em>", lead: "Klik op een hond voor afstamming, gezondheidsresultaten, palmares en foto's.", bg: site.paginafotos.honden, pos: "center 35%" })}
<section class="section-tight">
  <div class="wrap">
    <div class="dogs-grid">
${honden.map(dogCard).join("\n")}
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
        ${healthChips(d.health)}
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
        ${health.length ? healthChips(health) : ""}
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
    body: `${pageHero({ eyebrow: "Pups &amp; nesten", title: "Onze <em>nesten</em>", lead: "Elk nest krijgt zijn eigen letter. Hier vindt u alle pups uit onze nesten, met hun foto's, gezondheidsresultaten en stamboom.", bg: site.paginafotos.nesten, pos: "center 40%" })}
${V.tonen ? `<section class="section-tight" style="padding-bottom:0">
  <div class="wrap">${expectedBand()}</div>
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
  const report = p => {
    const text = plain(p.body);
    const long = text.length > 520 || text.split(/\n{2,}/).length > 4;
    const extra = p.photos.length - 4;
    const photos = p.photos.filter(ph => mediaInfo[ph]);
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
    body: `${pageHero({ eyebrow: "Nieuws", title: "Van de <em>renbaan</em>", lead: `Alle ${nieuws.length} wedstrijdverslagen sinds ${firstYear}, met foto's. Filter op een hond om enkel zijn of haar verslagen te zien.`, bg: site.paginafotos.nieuws, pos: "center 40%" })}
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

/* ---------- Over ons ---------- */
function overOns() {
  const team = site.team || [];
  const nameHtml = n => { const parts = String(n).split(" "); return parts.length > 1 ? `${esc(parts.slice(0, -1).join(" "))} <em>${esc(parts.slice(-1)[0])}</em>` : esc(n); };
  layout({
    file: "over-ons.html", active: "over-ons", title: "Over ons · Vai Avanti",
    desc: `Het verhaal achter whippetkennel Vai Avanti: ${team.map(t => t.naam).join(" en ")}.`,
    ogImage: site.paginafotos.overOns,
    body: `${pageHero({ eyebrow: "Ons verhaal", title: inline(site.overOns.titel), lead: esc(site.overOns.intro), bg: site.paginafotos.overOns, pos: "center 35%" })}
<section class="section-tight">
  <div class="wrap">
${team.map((t, i) => `    <div class="person${i % 2 ? " flip" : ""} reveal">
      <div class="person-photo">${img(t.foto, { alt: t.naam, sizes: "(max-width: 980px) 100vw, 40vw" })}</div>
      <div class="person-text">
        <span class="eyebrow">${esc(t.rol)}</span>
        <h2>${nameHtml(t.naam)}</h2>
        ${md(t.tekst)}
      </div>
    </div>`).join("\n")}
  </div>
</section>
<section class="band section-tight">
  <div class="wrap cta-band reveal">
    <div><span class="eyebrow">Kennismaken?</span><h2>Benieuwd naar onze <em>nesten</em>?</h2></div>
    <a class="btn btn-dark" href="contact.html#nesten">Neem contact op ${ICON.arrow}</a>
  </div>
</section>`
  });
}

/* ---------- Contact ---------- */
function contactPage() {
  layout({
    file: "contact.html", active: "contact", title: "Contact · Vai Avanti",
    desc: "Neem contact op met whippetkennel Vai Avanti: vragen over onze honden of onze nesten.",
    ogImage: site.paginafotos.contact,
    body: `${pageHero({ eyebrow: "Contact", title: "Kom <em>kennismaken</em>", lead: "Vragen over onze honden of over onze nesten? Stuur ons een bericht of bel ons gerust.", bg: site.paginafotos.contact, pos: "center 60%" })}
<section class="section-tight">
  <div class="wrap">
    ${contactBlock()}
  </div>
</section>`
  });
}

/* ---------- 404 ---------- */
function notFound() {
  layout({
    file: "404.html", active: "", title: "Pagina niet gevonden · Vai Avanti", desc: "Deze pagina bestaat niet (meer).",
    body: `${pageHero({ eyebrow: "404", title: "Deze pagina is <em>weggerend</em>", lead: "De pagina die u zoekt bestaat niet (meer). Misschien vindt u het via een van deze pagina's.", bg: site.hero.foto })}
<section class="section-tight"><div class="wrap cta-band">
  <a class="btn btn-dark" href="index.html">Naar de startpagina ${ICON.arrow}</a>
  <a class="link-arrow" href="nieuws.html">Wedstrijdverslagen ${ICON.arrow}</a>
</div></section>`
  });
}

/* ---------- Bouwen ---------- */
async function main() {
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  await processMedia();

  const css = fs.readFileSync(path.join(SRC, "assets", "site.css"), "utf8") + fs.readFileSync(path.join(SRC, "assets", "extra.css"), "utf8");
  fs.writeFileSync(path.join(OUT, "assets", "site.css"), css);
  fs.copyFileSync(path.join(SRC, "assets", "logo.css"), path.join(OUT, "assets", "logo.css"));
  let js = fs.readFileSync(path.join(SRC, "assets", "site.js"), "utf8");
  if (mailParts.length === 2) js = js.replace('["vai-avanti", "hotmail.com"]', JSON.stringify(mailParts));
  const cfgFile = path.join(SRC, 'config.json');
  const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : {};
  if (cfg.web3formsKey) js = js.replace('const WEB3FORMS_KEY = "";', `const WEB3FORMS_KEY = ${JSON.stringify(cfg.web3formsKey)};`);
  fs.writeFileSync(path.join(OUT, "assets", "site.js"), js);

  home();
  hondenPage();
  honden.forEach(dogPage);
  nestenPage();
  nieuwsPage();
  overOns();
  contactPage();
  notFound();

  // Opruimen: pagina's van honden die niet meer bestaan
  const pages = new Set(["index.html", "honden.html", "nesten.html", "nieuws.html", "over-ons.html", "contact.html", "404.html", ...honden.map(d => `hond-${d.id}.html`)]);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html") && !pages.has(f)) fs.unlinkSync(path.join(OUT, f));
  console.log(`${pages.size} pagina's gebouwd · ${honden.length} honden · ${nesten.length} nesten · ${nieuws.length} verslagen`);
}
main().catch(e => { console.error(e); process.exit(1); });
