// Eenmalig: zet inhoud/{nieuws,honden,nesten}/*.md (YAML + tekst) om naar *.json met een veld "tekst".
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const ROOT = path.join(__dirname, "..", "..", "..");
const isoDatum = v => v instanceof Date ? v.toISOString().slice(0, 10) : v;
const schoon = o => {
  if (Array.isArray(o)) return o.map(schoon);
  if (o && typeof o === "object" && !(o instanceof Date)) return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, schoon(v)]));
  return isoDatum(o);
};
let n = 0;
for (const dir of ["nieuws", "honden", "nesten"]) {
  const map = path.join(ROOT, "inhoud", dir);
  for (const f of fs.readdirSync(map).filter(f => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(map, f), "utf8").replace(/^﻿/, "");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    const data = schoon(m ? yaml.load(m[1]) || {} : {});
    data.tekst = (m ? m[2] : raw).replace(/\r/g, "").trim();
    fs.writeFileSync(path.join(map, f.replace(/\.md$/, ".json")), JSON.stringify(data, null, 2) + "\n");
    fs.unlinkSync(path.join(map, f));
    n++;
  }
}
console.log(n + " bestanden omgezet naar JSON");
