// Werkt .pages.yml (Pages CMS) bij: "Pagina's" met dezelfde bloktypes als de beheerpagina,
// en "Instellingen" voor inhoud/site.json. Gebruik: node _bron/tools/cms-config.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { BLOKKEN } = require("../assets/blokken.js");

const FILE = path.join(__dirname, "..", "..", ".pages.yml");
const cfg = yaml.load(fs.readFileSync(FILE, "utf8"));

const veld = v => {
  const base = { name: v.naam, label: v.label };
  if (v.hulp) base.description = v.hulp;
  switch (v.type) {
    case "regel": case "link": return { ...base, type: "string" };
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
  fields: b.velden.length ? b.velden.map(veld) : [{ name: "uitleg", label: "Uitleg", type: "string", hidden: true }]
}));

const paginas = {
  name: "paginas", label: "Pagina's", type: "collection", path: "inhoud/paginas", format: "json",
  filename: "{primary}.json",
  view: { primary: "titel", fields: ["titel", "inMenu"] },
  fields: [
    { name: "titel", label: "Naam van de pagina", type: "string", required: true },
    { name: "inMenu", label: "Toon in het menu", type: "boolean" },
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
      { name: "tekst", label: "Tekst", type: "text" }] },
    { name: "contact", label: "Contactgegevens", type: "object", fields: [
      { name: "telefoon", label: "Telefoon", type: "string" }, { name: "email", label: "E-mailadres", type: "string" },
      { name: "plaats", label: "Postcode en gemeente", type: "string" }, { name: "instagram", label: "Link naar Instagram", type: "string" },
      { name: "facebook", label: "Link naar Facebook", type: "string" }] },
    { name: "paginafotos", label: "Foto bovenaan de vaste pagina's", type: "object", fields: [
      { name: "honden", label: "Onze honden", type: "image" }, { name: "nesten", label: "Nesten", type: "image" }, { name: "nieuws", label: "Nieuws", type: "image" }] }
  ]
};

cfg.content = cfg.content.filter(c => c.name !== "site" && c.name !== "paginas");
cfg.content.push(paginas, instellingen);
const header = "# Beheerscherm (Pages CMS) voor de website van Vai Avanti.\n" +
  "# Pagina's en instellingen bewerk je het makkelijkst via /beheer op de site zelf (met voorbeeld).\n" +
  "# Dit bestand wordt deels gemaakt door _bron/tools/cms-config.js.\n\n";
fs.writeFileSync(FILE, header + yaml.dump(cfg, { lineWidth: -1, noRefs: true }));
console.log(".pages.yml bijgewerkt:", cfg.content.map(c => c.label).join(", "));
