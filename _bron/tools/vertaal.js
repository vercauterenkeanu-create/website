// Automatische vertaling van de site: Nederlands -> Engels, Duits, Italiaans, Fins en Deens.
// - Alle teksten (inhoud uit inhoud/ en de vaste teksten van de site) worden verzameld.
// - Per taal staat in vertalingen/<taal>.json wat al vertaald is ({ sleutel: { nl, vertaling } }).
// - Enkel nieuwe of gewijzigde teksten gaan naar Claude (als ANTHROPIC_API_KEY bestaat).
// Een vertaling verbeteren kan door ze in vertalingen/<taal>.json aan te passen.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const VA = require("../assets/blokken.js");

const ROOT = path.join(__dirname, "..", "..");
const MAP = path.join(ROOT, "vertalingen");
const MODEL = "claude-opus-5-5";
const TAALNAAM = { en: "English", de: "German", it: "Italian", fi: "Finnish", da: "Danish" };

// Velden die nooit vertaald worden: namen, links, keuzes, kleuren, data, foto's ...
const NIET = new Set([
  "type", "roepnaam", "naam", "vader", "moeder", "stamboom", "andereNamen", "letter", "datum", "geboren",
  "foto", "fotos", "foto1", "foto2", "omslagfoto", "fotoFocus", "link", "knoplink", "knop1link", "knop2link",
  "volgorde", "menuVolgorde", "inMenu", "overzicht", "datumOnbekend", "achtergrond", "stijl", "hoogte", "uitlijning",
  "donkerte", "wissel", "icoon", "geslacht", "kleurAchtergrond", "kleurTekst", "kleurAccent", "jaar", "jaartal", "getal",
  "email", "telefoon", "instagram", "facebook", "titelLetter", "tekstLetter", "accent", "donker", "licht", "beige",
  "tonen", "fotoRechts", "nieuwsTonen", "verwachtTonen", "van", "citaatVan", "talen", "thema",
  "fotoGrootte", "alleFotos", "grootte", "vorm", "volledig"
]);
const isVertaalbaar = (veld, s) => typeof s === "string" && !NIET.has(veld) && /\p{L}/u.test(s) &&
  !/^(https?:|mailto:|tel:|\/media\/|#)/.test(s) && !/^[\w-]+\.html(#[\w-]*)?$/.test(s);
const sleutel = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);

/* ---------- Teksten verzamelen ---------- */
// Inhoud: tekst -> soort (waar ze staat, als hulp voor de vertaler)
function inhoudTeksten(raw) {
  const uit = new Map();
  const loop = (o, soort, veld) => {
    if (typeof o === "string") { if (isVertaalbaar(veld, o) && !uit.has(o)) uit.set(o, `${soort}.${veld}`); return; }
    if (Array.isArray(o)) return o.forEach(x => loop(x, soort, veld));
    if (o && typeof o === "object") {
      if (NIET.has(veld) && veld !== "") return;
      const s = o.type ? `${soort}.blok-${o.type}` : soort;
      for (const [k, v] of Object.entries(o)) loop(v, s, k);
    }
  };
  loop(raw.site, "instellingen", "");
  for (const [map, soort] of [["paginas", "pagina"], ["nieuws", "wedstrijdverslag"], ["honden", "hond"], ["nesten", "nest"]])
    for (const d of Object.values(raw[map] || {})) loop(d, soort, "");
  return uit;
}
// Vaste teksten in de code: alles tussen t("...") of T("...")
function codeTeksten(bestanden) {
  const uit = new Map();
  for (const f of bestanden) {
    const src = fs.readFileSync(f, "utf8");
    // t("tekst") en t(voorwaarde ? "enkelvoud" : "meervoud", ...)
    const gevonden = [...src.matchAll(/\b[tT]\("((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
    for (const m of src.matchAll(/\b[tT]\([^"()]*\?\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) gevonden.push(m[1], m[2]);
    for (const g of gevonden) {
      const s = JSON.parse(`"${g}"`);
      if (s && !uit.has(s)) uit.set(s, "vaste tekst van de site (knop, label of zin)");
    }
  }
  for (const s of VA.UI_EXTRA) uit.set(s, "geslacht van een hond");
  return uit;
}
const CODE = ["_bron/assets/blokken.js", "_bron/assets/site.js", "_bron/tools/build.js"].map(f => path.join(ROOT, f));
function alleTeksten(raw) {
  return new Map([...codeTeksten(CODE), ...inhoudTeksten(raw)]);
}
// Enkel de vaste teksten uit site.js (die heeft de browser nodig)
const scriptTeksten = () => [...codeTeksten([path.join(ROOT, "_bron/assets/site.js")]).keys()].filter(s => !VA.UI_EXTRA.includes(s));

/* ---------- Geheugen per taal ---------- */
const geheugenPad = taal => path.join(MAP, `${taal}.json`);
const laad = taal => fs.existsSync(geheugenPad(taal)) ? JSON.parse(fs.readFileSync(geheugenPad(taal), "utf8")) : {};
// Bewaren met enkel de teksten die nog gebruikt worden, in vaste volgorde (rustige verschillen in git)
function bewaar(taal, geheugen, teksten) {
  const nodig = new Set([...teksten.keys()].map(sleutel));
  const uit = {};
  for (const k of Object.keys(geheugen).sort()) if (nodig.has(k)) uit[k] = geheugen[k];
  fs.mkdirSync(MAP, { recursive: true });
  const nieuw = JSON.stringify(uit, null, 2) + "\n";
  if (!fs.existsSync(geheugenPad(taal)) || fs.readFileSync(geheugenPad(taal), "utf8") !== nieuw) fs.writeFileSync(geheugenPad(taal), nieuw);
}
const woordenboek = geheugen => {
  const m = new Map();
  for (const v of Object.values(geheugen)) if (v && v.nl && v.vertaling) m.set(v.nl, v.vertaling);
  return m;
};

/* ---------- Controle van een vertaling ---------- */
// Plaatshouders, links en Markdown-sterretjes moeten blijven kloppen
const plaatshouders = s => (s.match(/\{[a-z]+\}/gi) || []).sort().join(",");
const links = s => (s.match(/\]\(([^)]+)\)/g) || []).sort().join(",");
const klopt = (nl, v) => typeof v === "string" && v.trim() !== "" && plaatshouders(nl) === plaatshouders(v) && links(nl) === links(v) &&
  (nl.match(/\*/g) || []).length % 2 === (v.match(/\*/g) || []).length % 2;

/* ---------- Vertalen met Claude ---------- */
const systeem = taal => `You translate the website of Vai Avanti, a small whippet kennel in Opwijk (Belgium) that breeds whippets and races them on sand and grass tracks across Europe. The source language is Dutch (Flemish). Translate every text into ${TAALNAAM[taal]} so it reads as if a native ${TAALNAAM[taal]} speaker wrote it for a dog-breeding website: natural, warm and accurate, never word-for-word.

Rules:
1. Keep proper names unchanged: dog names (call names and registered names such as "Vai Avanti Tiamo" or "Old Road's Ryleigh", also with a Dutch diminutive like "Moosje"), people, kennels, race tracks, clubs, towns and event names (for example "WM Revanche", "Golden Cup", "Grand Prix Yoko Ono", "Zilveren Haas"). Do translate the generic words around them, and country names.
2. Keep Markdown exactly as it is: **bold**, *italic*, headings that start with "#### ", list lines that start with "- ", blank lines between paragraphs, single line breaks, and links [text](url): translate the link text, never the url. In titles, *asterisks* mark the words shown in gold italics: put them around the matching translated words.
3. Keep placeholders in curly braces such as {n}, {naam}, {datum}, {letter}, {land}, {verslagen} or {sinds} exactly as they are; they are filled in later. A text like "{letter}-nest" means a litter named by a letter (for example "T-nest" is the T litter).
4. Use the usual dog-breeding and racing terms of ${TAALNAAM[taal]}: teef = female (bitch), reu = male (dog), nest = litter, pup = puppy, dekking = mating, stamboom = pedigree, fokker = breeder, renbaan = race track, ereplaats = podium place, kampioen = champion, veteraan = veteran.
5. Keep numbers, dates, times, distances (such as 350 m), results and abbreviations (KMSH, CGRC, BK, NK, WM) as they are, but write decimals the ${TAALNAAM[taal]} way (${taal === "en" ? "a race time 21,95 becomes 21.95" : "keep the decimal comma, as in 21,95"}); ordinal places take the ${TAALNAAM[taal]} form (1e plaats -> 1st place).
6. Each item has a "soort" that tells where the text appears (menu label, button, page title, race report, colour of a dog, ...). Short interface texts stay short; titles stay titles.
7. Return every item with exactly the same id, in the JSON format requested.`;
const SCHEMA = {
  type: "object",
  properties: {
    vertalingen: {
      type: "array",
      items: { type: "object", properties: { id: { type: "string" }, tekst: { type: "string" } }, required: ["id", "tekst"], additionalProperties: false }
    }
  },
  required: ["vertalingen"],
  additionalProperties: false
};
// Pakketjes van hoogstens ~6000 tekens, zodat een antwoord nooit te lang wordt
function pakketten(items) {
  const uit = [];
  let huidig = [], lengte = 0;
  for (const it of items) {
    if (huidig.length && (lengte + it.tekst.length > 6000 || huidig.length >= 40)) { uit.push(huidig); huidig = []; lengte = 0; }
    huidig.push(it); lengte += it.tekst.length;
  }
  if (huidig.length) uit.push(huidig);
  return uit;
}
let client = null;
async function claude() {
  if (!client) { const { default: Anthropic } = await import("@anthropic-ai/sdk"); client = new Anthropic(); }
  return client;
}
async function vertaalPakket(items, taal) {
  const c = await claude();
  const antwoord = await c.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: systeem(taal),
    messages: [{ role: "user", content: JSON.stringify({ doeltaal: TAALNAAM[taal], teksten: items.map(i => ({ id: i.id, soort: i.soort, tekst: i.tekst })) }) }]
  });
  if (antwoord.stop_reason === "refusal") throw new Error(`geweigerd (${(antwoord.stop_details || {}).category || "?"})`);
  if (antwoord.stop_reason === "max_tokens") {
    if (items.length === 1) throw new Error("antwoord te lang");
    const helft = Math.ceil(items.length / 2);
    return [...await vertaalPakket(items.slice(0, helft), taal), ...await vertaalPakket(items.slice(helft), taal)];
  }
  const tekst = antwoord.content.filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(tekst).vertalingen;
}
// Vult het geheugen aan met wat ontbreekt. Geeft { totaal, ontbrekend, vertaald, fouten } terug.
async function vulAan(geheugen, teksten, taal, log = console.log) {
  const ontbrekend = [...teksten].filter(([s]) => !(geheugen[sleutel(s)] && geheugen[sleutel(s)].vertaling))
    .map(([s, soort]) => ({ id: sleutel(s), tekst: s, soort }));
  const stand = { totaal: teksten.size, ontbrekend: ontbrekend.length, vertaald: 0, fouten: 0 };
  if (!ontbrekend.length) return stand;
  if (!process.env.ANTHROPIC_API_KEY) { log(`  ${taal}: ${ontbrekend.length} teksten nog niet vertaald (geen ANTHROPIC_API_KEY)`); return stand; }
  const perId = new Map(ontbrekend.map(i => [i.id, i]));
  for (const pakket of pakketten(ontbrekend)) {
    try {
      for (const v of await vertaalPakket(pakket, taal)) {
        const bron = perId.get(v.id);
        if (!bron) continue;
        if (klopt(bron.tekst, v.tekst)) { geheugen[v.id] = { nl: bron.tekst, vertaling: v.tekst }; stand.vertaald++; }
        else { stand.fouten++; log(`  ${taal}: vertaling afgekeurd voor "${bron.tekst.slice(0, 60)}"`); }
      }
    } catch (e) {
      stand.fouten += pakket.length;
      log(`  ${taal}: vertalen mislukt (${e.status ? e.status + " " : ""}${e.message})`);
      if (e.status === 401 || e.status === 403) break;
    }
  }
  log(`  ${taal}: ${stand.vertaald} van ${ontbrekend.length} nieuwe teksten vertaald`);
  return stand;
}

/* ---------- Inhoud in een andere taal ---------- */
function vertaalRaw(raw, woorden) {
  const loop = (o, veld) => {
    if (typeof o === "string") return isVertaalbaar(veld, o) && woorden.has(o) ? woorden.get(o) : o;
    if (Array.isArray(o)) return o.map(x => loop(x, veld));
    if (o && typeof o === "object") {
      if (NIET.has(veld) && veld !== "") return o;
      return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, loop(v, k)]));
    }
    return o;
  };
  return loop(raw, "");
}

module.exports = { TAALNAAM, alleTeksten, scriptTeksten, laad, bewaar, woordenboek, vulAan, vertaalRaw, sleutel, klopt, systeem };
