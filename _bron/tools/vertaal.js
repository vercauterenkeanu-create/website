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
  "fotoGrootte", "alleFotos", "grootte", "vorm", "volledig", "woontIn"
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
/* ---------- Vertalen met DeepL (gratis: 500.000 tekens per maand) ----------
   DeepL krijgt elke regel apart, met de opmaak omgezet naar tags die het bewaart:
   **vet** -> <b>, *schuin* -> <i>, [link](adres) -> <a>, en namen en {plaatshouders} in <x> (nooit vertalen). */
const DEEPL_TAAL = { en: "EN-GB", de: "DE", it: "IT", fi: "FI", da: "DA" };
const DEEPL_FORMEEL = { de: "prefer_more", it: "prefer_less" };
// Namen die nooit vertaald worden, naast de namen van honden en pups uit de inhoud
const ALTIJD_BEWAREN = ["Vai Avanti", "Shany", "Keanu", "MyDogDNA", "Breed Archive", "KMSH", "CGRC", "WM Revanche", "Champ of the Sand",
  "Zilveren Haas", "Gouden Haas", "Gouden Windhond", "Gouden windhond", "Lenteprijs", "Tulpenren", "Zilveren Champignon", "3 Hartenren"];
function namenUit(raw) {
  const namen = new Set(ALTIJD_BEWAREN);
  const voeg = v => { for (const n of [].concat(v || [])) if (typeof n === "string" && n.trim().length >= 3) namen.add(n.trim()); };
  for (const d of Object.values(raw.honden || {})) [d.roepnaam, d.naam, d.andereNamen, d.vader, d.moeder].forEach(voeg);
  for (const l of Object.values(raw.nesten || {})) {
    [l.vader, l.moeder].forEach(voeg);
    for (const p of l.pups || []) [p.naam, p.roepnaam, p.andereNamen].forEach(voeg);
  }
  voeg(((raw.site || {}).vertaling || {}).nietVertalen);
  return [...namen].sort((a, b) => b.length - a.length);
}
// DeepL werkt in HTML-modus: <span translate="no"> blijft onvertaald maar telt mee in de zin
const htmlEsc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const htmlTerug = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0*39;|&#x0*27;|&apos;/gi, "'").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&");
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const vast = inhoud => '<span translate="no">' + inhoud + "</span>";
function naarTags(regel, namen) {
  const links = [];
  let s = htmlEsc(regel)
    .replace(/\\([\\*_`[\]()#+\-.!>~|])/g, m => vast(m))
    .replace(/\{([a-z]+)\}/gi, m => vast(m))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, tekst, url) => '<a href="' + (links.push(url) - 1) + '">' + tekst + "</a>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  // Namen worden tijdelijk een codewoord (Vqzaa, Vqzab, ...): DeepL behandelt dat als een gewone eigennaam in de zin
  // en laat het staan. "Vai Avanti" telt samen met de rest van de stamboomnaam (Vai Avanti Thiago). Enkel buiten bestaande tags.
  const delen = namen.map(n => n === "Vai Avanti" ? "Vai Avanti(?:\\s+(?!\\p{Lu}-)\\p{Lu}[\\p{L}'’]*)*" : reEsc(htmlEsc(n)));
  const re = new RegExp("(?<![\\p{L}\\d])(" + delen.join("|") + ")(je|tje)?(?![\\p{L}\\d])", "gu");
  const codes = [];
  const code = i => "Vqz" + String.fromCharCode(97 + Math.floor(i / 26) % 26) + String.fromCharCode(97 + i % 26);
  let binnenVast = 0;
  s = s.split(/(<[^>]+>)/).map(deel => {
    if (deel.startsWith("<span")) { binnenVast++; return deel; }
    if (deel === "</span>") { binnenVast--; return deel; }
    if (deel.startsWith("<") || binnenVast) return deel;
    return deel.replace(re, m => code(codes.push(m) - 1));
  }).join("");
  return { s, links, codes: codes.map((naam, i) => ({ code: code(i), naam })) };
}
// Geeft null terug als DeepL een naam (codewoord) kwijt is
const vanTags = (s, links, codes = []) => {
  if (codes.some(c => !s.includes(c.code))) return null;
  for (const c of codes) s = s.split(c.code).join(c.naam);
  return htmlTerug(s
    .replace(/<a href="(\d+)"[^>]*>([\s\S]*?)<\/a>/g, (m, i, tekst) => "[" + tekst + "](" + links[+i] + ")")
    .replace(/<b>([\s\S]*?)<\/b>/g, "**$1**")
    .replace(/<i>([\s\S]*?)<\/i>/g, "*$1*")
    .replace(/<span[^>]*translate="no"[^>]*>([\s\S]*?)<\/span>/g, "$1"));
};
// Een tekst opdelen in regels; opsommingstekens, kopjes en regeleinden blijven buiten de vertaling
function regelsVan(tekst) {
  return tekst.split(/(\n+)/).map(deel => {
    if (/^\n+$/.test(deel) || !deel.trim()) return { vast: deel };
    const m = deel.match(/^(\s*(?:[-*+]\s+|#{1,6}\s+)?)([\s\S]*?)(\s{2,}|\\)?$/);
    return { voor: m[1], tekst: m[2], na: m[3] || "" };
  });
}
async function deeplVraag(teksten, taal, context) {
  const sleutel = (process.env.DEEPL_API_KEY || "").trim();
  const basis = process.env.DEEPL_API_URL || (sleutel.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");
  const body = { text: teksten, source_lang: "NL", target_lang: DEEPL_TAAL[taal], tag_handling: "html", preserve_formatting: true, context };
  if (DEEPL_FORMEEL[taal]) body.formality = DEEPL_FORMEEL[taal];
  for (let poging = 0; ; poging++) {
    const res = await fetch(`${basis}/v2/translate`, { method: "POST", headers: { Authorization: `DeepL-Auth-Key ${sleutel}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return (await res.json()).translations.map(t => t.text);
    if ((res.status === 429 || res.status >= 500) && poging < 3) { await new Promise(r => setTimeout(r, 2000 * (poging + 1))); continue; }
    let detail = ""; try { const j = await res.json(); detail = j.message || (j.error || {}).message || ""; } catch (e) { /* geen json */ }
    throw Object.assign(new Error(res.status === 456 ? "gratis tekens van deze maand zijn op" : detail || "fout"), { status: res.status });
  }
}
// Racetijden staan in de verslagen vaak met een punt (21.45); in het Nederlands is dat een uur.
// Voor DeepL worden ze kommagetallen (21,45), zodat het ze als tijd in seconden behandelt.
const kommagetallen = s => s.replace(/(?<![\d.,])(\d+)\.(\d{2,3})(?!\d|[.,]\d)/g, "$1,$2");
const CONTEXT = "Website van Vai Avanti, een kleine whippetkennel in Opwijk (België) die whippets fokt en ermee racet op renbanen in Europa.";
// Vertaalt items [{ id, tekst, soort }] -> [{ id, tekst }]
async function vertaalMetDeepL(items, taal, namen) {
  const uit = [];
  const kort = [], lang = [];
  for (const it of items) (regelsVan(it.tekst).filter(r => r.tekst !== undefined).length > 1 ? lang : kort).push(it);
  // Korte teksten (één regel) samen in pakketjes van 50
  for (let i = 0; i < kort.length; i += 50) {
    const groep = kort.slice(i, i + 50).map(it => ({ it, r: regelsVan(it.tekst) }));
    const delen = groep.map(g => g.r.find(r => r.tekst !== undefined)).map(r => naarTags(kommagetallen(r.tekst), namen));
    const vertaald = await deeplVraag(delen.map(d => d.s), taal, `${CONTEXT} Losse korte teksten van de site: knoppen, menu's, titels en labels.`);
    groep.forEach((g, j) => {
      const terug = vanTags(vertaald[j], delen[j].links, delen[j].codes);
      if (terug !== null) uit.push({ id: g.it.id, tekst: g.r.map(r => r.tekst === undefined ? r.vast : r.voor + terug + r.na).join("") });
    });
  }
  // Langere teksten (verslagen, verhalen): per tekst, met de hele tekst als context
  for (const it of lang) {
    const regels = regelsVan(it.tekst);
    const delen = regels.filter(r => r.tekst !== undefined).map(r => naarTags(kommagetallen(r.tekst), namen));
    const vertaald = await deeplVraag(delen.map(d => d.s), taal, `${CONTEXT} Soort tekst: ${it.soort}. Volledige tekst: ${it.tekst.slice(0, 3000)}`);
    const terug = vertaald.map((v, k) => vanTags(v, delen[k].links, delen[k].codes));
    if (terug.includes(null)) continue;
    let k = 0;
    uit.push({ id: it.id, tekst: regels.map(r => r.tekst === undefined ? r.vast : r.voor + terug[k++] + r.na).join("") });
  }
  return uit;
}

// Vult het geheugen aan met wat ontbreekt. Geeft { totaal, ontbrekend, vertaald, fouten } terug.
// Vertaler: DeepL als DEEPL_API_KEY bestaat (gratis), anders Claude als ANTHROPIC_API_KEY bestaat.
// opties.raw = de inhoud, om namen van honden en pups te kennen (die vertaalt DeepL nooit)
async function vulAan(geheugen, teksten, taal, log = console.log, opties = {}) {
  const ontbrekend = [...teksten].filter(([s]) => !(geheugen[sleutel(s)] && geheugen[sleutel(s)].vertaling))
    .map(([s, soort]) => ({ id: sleutel(s), tekst: s, soort }));
  const stand = { totaal: teksten.size, ontbrekend: ontbrekend.length, vertaald: 0, fouten: 0 };
  if (!ontbrekend.length) return stand;
  const deepl = !!(process.env.DEEPL_API_KEY || "").trim();
  stand.motor = deepl ? "deepl" : process.env.ANTHROPIC_API_KEY ? "claude" : null;
  if (!deepl && !process.env.ANTHROPIC_API_KEY) { stand.melding = "geen DEEPL_API_KEY of ANTHROPIC_API_KEY"; log(`  ${taal}: ${ontbrekend.length} teksten nog niet vertaald (${stand.melding})`); return stand; }
  const namen = deepl ? namenUit(opties.raw || {}) : [];
  const perId = new Map(ontbrekend.map(i => [i.id, i]));
  for (const pakket of pakketten(ontbrekend)) {
    try {
      for (const v of await (deepl ? vertaalMetDeepL(pakket, taal, namen) : vertaalPakket(pakket, taal))) {
        const bron = perId.get(v.id);
        if (!bron) continue;
        if (klopt(bron.tekst, v.tekst)) { geheugen[v.id] = { nl: bron.tekst, vertaling: v.tekst }; stand.vertaald++; }
        else { stand.fouten++; stand.melding = `vertaling afgekeurd voor "${bron.tekst.slice(0, 60)}"`; log(`  ${taal}: ${stand.melding}`); }
      }
    } catch (e) {
      stand.fouten += pakket.length;
      stand.melding = `vertalen mislukt (${e.status ? e.status + " " : ""}${e.message})`;
      log(`  ${taal}: ${stand.melding}`);
      if (e.status === 401 || e.status === 403 || e.status === 456) break;
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

module.exports = { TAALNAAM, alleTeksten, scriptTeksten, laad, bewaar, woordenboek, vulAan, vertaalRaw, sleutel, klopt, systeem, naarTags, vanTags, regelsVan, namenUit };
