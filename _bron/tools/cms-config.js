// Werkt .pages.yml (Pages CMS) bij: "Pagina's" met dezelfde bloktypes als de beheerpagina,
// en "Instellingen" voor inhoud/site.json. Gebruik: node _bron/tools/cms-config.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { BLOKKEN, KLEUR_VELDEN, LETTERS } = require("../assets/blokken.js");

const FILE = path.join(__dirname, "..", "..", ".pages.yml");
const cfg = yaml.load(fs.readFileSync(FILE, "utf8"));

const veld = v => {
  const base = { name: v.naam, label: v.label };
  if (v.hulp) base.description = v.hulp;
  switch (v.type) {
    case "regel": case "link": case "kleur": return { ...base, type: "string" };
    case "woorden": return { ...base, type: "string", list: true };
    case "datum": return { ...base, type: "date", options: { format: "yyyy-MM-dd" } };
    case "tekst": return { ...base, type: "text" };
    case "opmaak": return { ...base, type: "rich-text", options: { format: "markdown", media: false } };
    case "foto": return { ...base, type: "image" };
    case "fotos": return { ...base, type: "image", options: { multiple: { max: 40 } } };
    case "aanuit": return { ...base, type: "boolean" };
    case "keuze": return { ...base, type: "select", options: { values: v.opties } };
    case "lijst": return { ...base, type: "object", list: true, fields: v.velden.map(veld) };
    default: return { ...base, type: "string" };
  }
};
const blocks = Object.entries(BLOKKEN).map(([name, b]) => ({
  name, label: b.label,
  fields: [...b.velden, ...KLEUR_VELDEN].map(veld)
}));

const paginas = {
  name: "paginas", label: "Pagina's", type: "collection", path: "inhoud/paginas", format: "json",
  filename: "{primary}.json",
  view: { primary: "titel", fields: ["titel", "inMenu"] },
  fields: [
    { name: "titel", label: "Naam van de pagina", type: "string", required: true },
    { name: "inMenu", label: "Toon in het menu", type: "boolean" },
    { name: "menuNaam", label: "Naam in het menu (leeg = de naam van de pagina)", type: "string" },
    { name: "menuVolgorde", label: "Plaats in het menu", type: "number", description: "Onze honden = 10, Nesten = 20, Nieuws = 30, Over ons = 40." },
    { name: "omschrijving", label: "Korte omschrijving voor Google", type: "text" },
    { name: "blokken", label: "Blokken", type: "block", list: true, blockKey: "type", blocks }
  ]
};
const instellingen = {
  name: "site", label: "Instellingen", type: "file", path: "inhoud/site.json", format: "json",
  fields: [
    { name: "verwacht", label: "Verwachte nesten", type: "object", fields: [
      { name: "tonen", label: "Tonen op de site", type: "boolean" },
      { name: "label", label: "Klein opschrift (bijvoorbeeld Verwacht in 2027)", type: "string" },
      { name: "titel", label: "Titel", type: "string", description: "Zet *sterretjes* rond een woord om het goud en schuin te maken." },
      { name: "tekst", label: "Tekst", type: "text" },
      { name: "knoptekst", label: "Tekst op de knop", type: "string" }, { name: "knoplink", label: "Knop gaat naar", type: "string" }] },
    { name: "contact", label: "Contactgegevens", type: "object", fields: [
      { name: "telefoon", label: "Telefoon", type: "string" }, { name: "email", label: "E-mailadres", type: "string" },
      { name: "plaats", label: "Postcode en gemeente", type: "string" }, { name: "instagram", label: "Link naar Instagram", type: "string" },
      { name: "facebook", label: "Link naar Facebook", type: "string" }] },
    { name: "thema", label: "Kleuren en lettertypes", type: "object", fields: [
      ...["accent:Accentkleur (nu goud)", "donker:Donkere kleur", "licht:Achtergrond", "beige:Tweede achtergrond", "tekst:Tekstkleur"].map(x => ({ name: x.split(":")[0], label: x.split(":")[1], type: "string", description: "Kleurcode zoals #c9a052. Leeg = standaard." })),
      { name: "titelLetter", label: "Lettertype van de titels", type: "select", options: { values: Object.keys(LETTERS.titel) } },
      { name: "tekstLetter", label: "Lettertype van de tekst", type: "select", options: { values: Object.keys(LETTERS.tekst) } }] },
    { name: "talen", label: "Talen (automatisch vertaald)", type: "string", list: true, description: "Codes: en, de, it, fi, da." },
    { name: "menu", label: "Knop rechts in het menu", type: "object", fields: [
      { name: "knoptekst", label: "Tekst (leeg = geen knop)", type: "string" }, { name: "knoplink", label: "Gaat naar", type: "string" }] },
    { name: "voettekst", label: "Voettekst", type: "object", fields: [
      { name: "tekst", label: "Tekst onder het logo", type: "text" },
      { name: "kolommen", label: "Kolommen met links", type: "object", list: true, fields: [
        { name: "titel", label: "Titel", type: "string" },
        { name: "links", label: "Links", type: "object", list: true, fields: [{ name: "label", label: "Tekst", type: "string" }, { name: "link", label: "Gaat naar", type: "string" }] }] },
      { name: "contactTitel", label: "Titel van de kolom met contactgegevens", type: "string" },
      { name: "onderschrift", label: "Helemaal onderaan", type: "string" }] }
  ]
};

// Verslagen, honden en nesten staan als JSON met de lopende tekst in het veld "tekst"
for (const c of cfg.content.filter(c => ["nieuws", "honden", "nesten"].includes(c.name))) {
  c.format = "json";
  c.filename = c.filename.replace(/\.md$/, ".json");
  for (const f of c.fields) if (f.name === "body") f.name = "tekst";
}

cfg.content = cfg.content.filter(c => c.name !== "site" && c.name !== "paginas");
cfg.content.push(paginas, instellingen);
const header = "# Beheerscherm (Pages CMS) voor de website van Vai Avanti.\n" +
  "# Alles bewerk je het makkelijkst via /beheer op de site zelf (met voorbeeld); dit is de reserve.\n" +
  "# Dit bestand wordt deels gemaakt door _bron/tools/cms-config.js.\n\n";
fs.writeFileSync(FILE, header + yaml.dump(cfg, { lineWidth: -1, noRefs: true }));
console.log(".pages.yml bijgewerkt:", cfg.content.map(c => c.label).join(", "));
