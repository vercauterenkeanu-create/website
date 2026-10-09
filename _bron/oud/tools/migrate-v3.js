// Eenmalig (oktober 2026): alles aanpasbaar maken.
// - Onze honden, Nesten en Nieuws worden gewone pagina's uit blokken (met een eigen paginakop).
// - Koppen krijgen een lijst foto's (diavoorstelling) in plaats van één foto.
// - Vaste teksten (knoppen, cijfers, gezondheid, contact, menu, voettekst) komen in de inhoud.
const fs = require("fs");
const path = require("path");
const { BLOKKEN, STANDAARD } = require("../../assets/blokken.js");
const ROOT = path.join(__dirname, "..", "..", "..");
const P = f => path.join(ROOT, "inhoud", f);
const lees = f => JSON.parse(fs.readFileSync(P(f), "utf8"));
const schrijf = (f, d) => fs.writeFileSync(P(f), JSON.stringify(d, null, 2) + "\n");
const kloon = o => JSON.parse(JSON.stringify(o));

const site = lees("site.json");
const pf = site.paginafotos || {};

// Koppen: foto -> fotos
const kopFotos = b => { if ((b.type === "paginakop" || b.type === "hero") && !b.fotos) { b.fotos = b.foto ? [b.foto] : []; delete b.foto; } };
const vulAan = (b, extra) => { for (const [k, v] of Object.entries(extra)) if (b[k] === undefined) b[k] = kloon(v); };

for (const f of fs.readdirSync(P("paginas")).filter(f => f.endsWith(".json"))) {
  const p = lees("paginas/" + f);
  for (const b of p.blokken || []) {
    kopFotos(b);
    if (b.type === "hero") vulAan(b, { knop1tekst: "Ontmoet onze honden", knop1link: "honden.html", knop2tekst: site.verwacht && site.verwacht.tonen ? site.verwacht.label : "Onze nesten", knop2link: site.verwacht && site.verwacht.tonen ? "nesten.html#verwacht" : "nesten.html" });
    if (b.type === "cijfers") vulAan(b, { cijfers: STANDAARD.cijfers });
    if (b.type === "nieuws") vulAan(b, { linktekst: "Alle {verslagen} wedstrijdverslagen", leestekst: "Lees het verslag" });
    if (b.type === "gezondheid") vulAan(b, { knoptekst: "Bekijk de resultaten per hond", knoplink: "honden.html", punten: STANDAARD.punten });
    if (b.type === "nesten") vulAan(b, { linktekst: "Alle nesten en pups" });
    if (b.type === "overons") vulAan(b, { jaartal: "2018", jaartekst: "Lylo, onze eerste", knoptekst: "Lees ons verhaal", knoplink: "over-ons.html" });
    if (b.type === "contact") vulAan(b, BLOKKEN.contact.nieuw);
  }
  schrijf("paginas/" + f, p);
}

const nieuwePagina = (f, d) => { if (!fs.existsSync(P("paginas/" + f))) schrijf("paginas/" + f, d); };
nieuwePagina("honden.json", {
  titel: "Onze honden", inMenu: true, menuVolgorde: 10,
  omschrijving: "Maak kennis met de whippets van Vai Avanti: afstamming, gezondheidsresultaten en palmares per hond.",
  blokken: [
    { type: "paginakop", bovenschrift: "Onze honden", titel: "Het team achter *de naam*", intro: "Klik op een hond voor afstamming, gezondheidsresultaten, palmares en foto's.", fotos: pf.honden ? [pf.honden] : [] },
    { type: "hondenlijst" },
    { type: "uitnesten", ...kloon(BLOKKEN.uitnesten.nieuw) }
  ]
});
nieuwePagina("nesten.json", {
  titel: "Nesten", inMenu: true, menuVolgorde: 20,
  omschrijving: "Alle nesten van whippetkennel Vai Avanti met hun pups, en de nesten die verwacht worden.",
  blokken: [
    { type: "paginakop", bovenschrift: "Pups & nesten", titel: "Onze *nesten*", intro: "Elk nest krijgt zijn eigen letter. Hier vindt u alle pups uit onze nesten, met hun foto's, gezondheidsresultaten en stamboom.", fotos: pf.nesten ? [pf.nesten] : [] },
    { type: "nestenlijst", verwachtTonen: true }
  ]
});
nieuwePagina("nieuws.json", {
  titel: "Wedstrijdverslagen", menuNaam: "Nieuws", inMenu: true, menuVolgorde: 30,
  omschrijving: "Alle {verslagen} wedstrijdverslagen van Vai Avanti sinds {sinds}: uitslagen, foto's en verhalen van de renbaan.",
  blokken: [
    { type: "paginakop", bovenschrift: "Nieuws", titel: "Van de *renbaan*", intro: "Alle {verslagen} wedstrijdverslagen sinds {sinds}, met foto's. Filter op een hond om enkel zijn of haar verslagen te zien.", fotos: pf.nieuws ? [pf.nieuws] : [] },
    { type: "verslagen" }
  ]
});

// Instellingen: menu, voettekst, knop bij de verwachte nesten, kleuren
site.menu = site.menu || { knoptekst: "Contact", knoplink: "contact.html" };
site.voettekst = site.voettekst || {
  tekst: "Whippetkennel uit {plaats}, België. Gezonde racewhippets, gefokt met passie sinds 2020.",
  kolommen: [
    { titel: "Ontdek", links: [{ label: "Onze honden", link: "honden.html" }, { label: "Nesten", link: "nesten.html" }, { label: "Wedstrijdverslagen", link: "nieuws.html" }, { label: "Gezondheid", link: "index.html#gezondheid" }] },
    { titel: "Kennel", links: [{ label: "Over ons", link: "over-ons.html" }, ...(site.verwacht && site.verwacht.tonen ? [{ label: site.verwacht.label || "Verwachte nesten", link: "nesten.html#verwacht" }] : []), { label: "Contact", link: "contact.html" }] }
  ],
  contactTitel: "Contact",
  onderschrift: "Kennelnaam erkend door de KMSH"
};
site.verwacht = { ...site.verwacht };
if (site.verwacht.knoptekst === undefined) Object.assign(site.verwacht, { knoptekst: "Informeer naar de nesten", knoplink: "contact.html#nesten" });
site.thema = site.thema || {};
delete site.paginafotos;
schrijf("site.json", site);
console.log("Inhoud omgezet.");
