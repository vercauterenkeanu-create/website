// Eenmalig: zet de vaste teksten uit inhoud/site.json om naar pagina's met blokken in inhoud/paginas/.
// site.json houdt daarna enkel de instellingen (verwachte nesten, contact, foto's van de vaste pagina's).
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..", "..");
const file = path.join(ROOT, "inhoud", "site.json");
const s = JSON.parse(fs.readFileSync(file, "utf8"));
const team = s.team || [];
const dir = path.join(ROOT, "inhoud", "paginas");
fs.mkdirSync(dir, { recursive: true });
const write = (id, data) => fs.writeFileSync(path.join(dir, id + ".json"), JSON.stringify(data, null, 2) + "\n");

write("start", {
  titel: "Startpagina", inMenu: false, menuVolgorde: 0,
  omschrijving: "Vai Avanti is een whippetkennel uit Opwijk (België). Gezonde, geteste racewhippets, onze nesten en verslagen van de renbaan.",
  blokken: [
    { type: "hero", bovenschrift: s.hero.bovenschrift, titel: s.hero.titel, intro: s.hero.intro, foto: s.hero.foto, nieuwsTonen: true },
    { type: "cijfers" },
    { type: "honden", bovenschrift: "Onze honden", titel: "Het team achter *de naam*", intro: "Elke hond heeft een eigen pagina met afstamming, gezondheid, palmares en foto's." },
    { type: "nieuws", bovenschrift: "Van de renbaan", titel: "Laatste *nieuws*" },
    { type: "gezondheid", bovenschrift: "Gezondheid voorop", titel: "Getest, gedocumenteerd en *transparant*", intro: "Een snelle whippet is pas een goede whippet als hij ook gezond is. Daarom laten wij onze fokhonden uitgebreid onderzoeken en tonen we de resultaten per hond." },
    { type: "nesten", bovenschrift: "Pups & nesten", titel: "Onze *nesten*", intro: "Elk nest krijgt zijn eigen letter. Klik op een nest voor alle pups, hun foto's en gezondheidsresultaten." },
    { type: "overons", bovenschrift: "Over ons", titel: s.overOns.titel, tekst: s.overOns.startpagina, foto1: team[0] && team[0].foto, foto2: team[1] && team[1].foto, citaat: s.overOns.citaat, citaatVan: s.overOns.citaatVan },
    { type: "contact" }
  ]
});
write("over-ons", {
  titel: "Over ons", inMenu: true, menuVolgorde: 40,
  omschrijving: `Het verhaal achter whippetkennel Vai Avanti: ${team.map(t => t.naam).join(" en ")}.`,
  blokken: [
    { type: "paginakop", bovenschrift: "Ons verhaal", titel: s.overOns.titel, intro: s.overOns.intro, foto: s.paginafotos.overOns },
    { type: "team", leden: team },
    { type: "aankondiging", stijl: "Licht", label: "Kennismaken?", titel: "Benieuwd naar onze *nesten*?", tekst: "", knoptekst: "Neem contact op", knoplink: "contact.html#nesten" }
  ]
});
write("contact", {
  titel: "Contact", inMenu: false, menuVolgorde: 0,
  omschrijving: "Neem contact op met whippetkennel Vai Avanti: vragen over onze honden of onze nesten.",
  blokken: [
    { type: "paginakop", bovenschrift: "Contact", titel: "Kom *kennismaken*", intro: "Vragen over onze honden of over onze nesten? Stuur ons een bericht of bel ons gerust.", foto: s.paginafotos.contact },
    { type: "contact" }
  ]
});
const instellingen = {
  verwacht: s.verwacht,
  contact: s.contact,
  paginafotos: { honden: s.paginafotos.honden, nesten: s.paginafotos.nesten, nieuws: s.paginafotos.nieuws }
};
fs.writeFileSync(file, JSON.stringify(instellingen, null, 2) + "\n");
console.log("pagina's: start, over-ons, contact; site.json bevat nu enkel instellingen");
