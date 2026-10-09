// Zet de nieuwspagina uit ../content.json om naar ../data/nieuws.json
// (één object per verslag, met jaar, tekstblokken, eigen foto's en de honden die erin voorkomen).
// Daarnaast ../data/fotos.json: foto-id -> beste bron-URL, voor alle pagina's.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const content = require(path.join(ROOT, "content.json"));

const photoId = src => (src.match(/\/(\d{9})-/) || [])[1];

// Alle foto-URL's (hoogste resolutie) per id
const fotos = {};
for (const pg of content) for (const s of pg.sections) for (const b of s.blocks)
  if (b.t === "img") { const id = photoId(b.src); if (id && !fotos[id]) fotos[id] = b.src; }

// Honden die in verslagen kunnen voorkomen (roepnaam of officiële naam)
const DOGS = {
  flappie: /\b(Flappie|Tiamo)\b/i,
  vienna: /\b(Vienna|Tahiti)\b/i,
  lylo: /\b(Lylo|Ryleigh)\b/i,
  mayzie: /\b(Mayzie|Xamali)\b/i,
  nixy: /\b(Nixy|Yiruma)\b/i,
  bayah: /\b(Bayah|Samba Supersonic)\b/i,
  moos: /\b(Moos|Moosje|Xtreme)/i,
  seeya: /\b(SeeYa|Ylva)\b/i,
  leroy: /\b(Leroy|You Got The Moves Like Jagger)\b/i,
  unto: /\b(Unto|You Are On Fire)\b/i,
  tara: /\b(Tara|Yulia)\b/i,
  yoshi: /\b(Ytte|Yoshi)\b/i,
  sergio: /\b(Sergio|Thiago)\b/i,
  thor: /\bThor\b/,
  xander: /\bXander\b/,
  viny: /\b(Viny|Xoi)\b/,
  mila: /\b(Mila|Vai Avanti Unexpected)\b/,
  xena: /\bXena\b/
};

// Titels die netter kunnen (rest blijft zoals op de site)
const TITLES = {
  "KVW BERINGEN BK2026": "KVW Beringen: BK 2026",
  "GWRV De coevering": "GWRV De Coevering",
  "Zilverenhaas Beringen": "Zilveren Haas Beringen",
  "WRA invitatieren": "WRA Invitatieren",
  "Vai Avanti X…. nest ❤️": "Vai Avanti X-nest ❤️",
  "Vai Avanti Y nest": "Vai Avanti Y-nest",
  "3 harten ren Geldrop": "3 Hartenren Geldrop",
  "3 Harten ren": "3 Hartenren",
  "2023 RECAP": "Terugblik 2023",
  "Grote prijs van Nederland!": "Grote Prijs van Nederland",
  "WM revanche Gelsenkirchen": "WM Revanche Gelsenkirchen",
  "Champ of sand": "Champ of the Sand",
  "Champ of Sand": "Champ of the Sand",
  "European Champ of sand": "European Champ of the Sand",
  "Gouden haas 2022": "Gouden Haas 2022",
  "Grote prijs Beringen": "Grote Prijs Beringen",
  "Grote prijs Beringen 2021": "Grote Prijs Beringen 2021",
  "Chatillon-La-Palud": "Châtillon-la-Palud",
  "Nieuwe jaarlijkse traditie om het jaar af te sluiten Vai Avanti wandeling": "Vai Avanti-wandeling: een nieuwe jaarlijkse traditie"
};

// Webnode-voorbeeldtekst die op de live site is blijven staan
const PLACEHOLDER = /uw tekst begint|dicta sunt|ipsum quia/i;

const slug = s => {
  const full = s.replace(/ß/g, "ss").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return full.length <= 50 ? full : full.slice(0, 50).replace(/-[^-]*$/, "");
};

// Korte regel zonder leesteken, gevolgd door gewone tekst = tussenkopje (bv. "Liperi")
const isSubhead = (b, next) => b.t === "p" && next && next.t === "p" &&
  b.text.length <= 40 && !/[.!?:…,]$/.test(b.text.trim()) && !b.text.includes("\n") && next.text.length > b.text.length &&
  !/^\d/.test(b.text) && !/\d+[.,]\d\d/.test(b.text) && !/\b\d\.\s/.test(b.text);

const page = content.find(p => p.page === "nieuws/");
const posts = [];
let year = 2026;
for (const sec of page.sections) {
  let blocks = sec.blocks.filter(b => !(b.t === "img" && b.bg));
  if (!blocks.length) continue;
  if (blocks[0].t === "h" && /^NIEUWS$/i.test(blocks[0].text)) continue;
  // Jaartal als scheiding ("2025", of "2024" gevolgd door de titel van het eerste verslag)
  if (blocks[0].t === "h" && /^20\d\d$/.test(blocks[0].text.trim())) {
    year = +blocks[0].text.trim();
    blocks = blocks.slice(1);
    if (!blocks.length) continue;
  }
  const first = blocks.findIndex(b => b.t === "h");
  const rawTitle = first >= 0 ? blocks[first].text.replace(/\s+/g, " ").trim() : "Zonder titel";
  const body = blocks.filter((b, i) => i !== first && b.t !== "img" && b.t !== "link" && !PLACEHOLDER.test(b.text))
    .map(b => ({ t: b.t, text: b.text }))
    .map((b, i, arr) => isSubhead(b, arr[i + 1]) ? { t: "h", text: b.text } : b);
  const photos = blocks.filter(b => b.t === "img").map(b => photoId(b.src)).filter(Boolean);
  const all = rawTitle + "\n" + body.map(b => b.text).join("\n");
  const dogs = Object.keys(DOGS).filter(k => DOGS[k].test(all));
  const title = TITLES[rawTitle] || rawTitle;
  let id = year + "-" + slug(title);
  while (posts.some(p => p.id === id)) id += "-2";
  posts.push({ id, year, title, recap: /samenvatting|recap|terugblik/i.test(title), dogs, photos, body });
}

fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data", "nieuws.json"), JSON.stringify(posts, null, 1));
fs.writeFileSync(path.join(ROOT, "data", "fotos.json"), JSON.stringify(fotos, null, 1));
console.log(posts.length + " verslagen, " + Object.keys(fotos).length + " foto's in totaal");
for (const p of posts) console.log(p.year, p.id.padEnd(46), ("p" + p.body.length).padEnd(4), ("f" + p.photos.length).padEnd(3), p.dogs.join(","));
