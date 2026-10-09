// Eenmalig: zet _bron/data/*.json om naar bewerkbare bestanden in inhoud/ (voor Pages CMS)
// en kopieert de gebruikte foto's naar media/.
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..", "..");
const DATA = path.join(ROOT, "_bron", "data");
const INHOUD = path.join(ROOT, "inhoud");
const MEDIA = path.join(ROOT, "media");
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const honden = read("honden.json"), nesten = read("nesten.json"), nieuws = read("nieuws.json");

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const isoDate = s => {
  const [d, m, y] = s.split(" ");
  return `${y}-${String(MAANDEN.indexOf(m) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
const used = new Set();
const media = id => { used.add(id); return `/media/${id}.webp`; };
const write = (file, front, body = "") => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fm = yaml.dump(front, { lineWidth: -1, quotingType: '"' });
  fs.writeFileSync(file, `---\n${fm}---\n${body ? body.trim() + "\n" : ""}`);
};
// Tekstblokken -> Markdown (enkele regeleinden blijven regeleinden)
const esc = t => t.replace(/([*_`\[\]\\])/g, "\\$1");
const toMd = blocks => {
  const out = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(list.join("\n")); list = []; } };
  for (const b of blocks) {
    if (b.t === "li") { list.push("- " + esc(b.text)); continue; }
    flush();
    out.push(b.t === "h" ? "#### " + esc(b.text) : esc(b.text).split("\n").join("  \n"));
  }
  flush();
  return out.join("\n\n");
};

/* ---------- Honden ---------- */
honden.forEach((d, i) => {
  write(path.join(INHOUD, "honden", d.id + ".md"), {
    roepnaam: d.call, naam: d.name, geslacht: d.sex, status: d.status || "",
    geboren: isoDate(d.born), kleur: d.color, vader: d.sire, moeder: d.dam,
    hoogtepunt: d.highlight, stamboom: d.pedigree || "",
    gezondheid: d.health,
    palmares: d.titles.map(([jaar, titel, plaats]) => ({ jaar, titel, plaats })),
    omslagfoto: media(d.cover), fotoFocus: d.pos || "",
    fotos: d.photos.filter(p => p !== d.cover).map(media),
    volgorde: i + 1
  }, esc(d.note || ""));
});

/* ---------- Nesten ---------- */
for (const l of nesten) {
  write(path.join(INHOUD, "nesten", l.id + "-nest.md"), {
    letter: l.letter, geboren: isoDate(l.born), vader: l.sire, moeder: l.dam,
    foto: l.photos[0] ? media(l.photos[0]) : "",
    pups: l.pups.map(p => ({
      naam: p.name, roepnaam: p.call, geslacht: p.sex, kleur: p.color, woontIn: p.country || "",
      gezondheid: p.health || [], uitslagen: p.results || [],
      fotos: p.photos.map(media), stamboom: p.pedigree || ""
    }))
  }, esc(l.intro));
}

/* ---------- Verslagen ---------- */
const KOP = {
  "2026-wm-revanche": ["Winst voor Flappie, zilver voor Moos", "Met een raketstart en een nieuw persoonlijk record van 17,77 won Vai Avanti Tiamo zijn eerste run, en daarna ook de finale bij de veteranen. Moos vocht zich in de finale vanuit de laatste positie terug naar een knappe tweede plaats."],
  "2026-druk-weekend": ["Europa Cup: brons voor Moos, sterke proeflopen", "Moos werd derde in de A-finale en Flappie verbeterde zich tot 18,13. SeeYa, Nixy en Leroy liepen veelbelovende proeflopen."],
  "2026-kvw-beringen-bk-2026": ["Mayzie wint de Grote Prijs van België 280 m", "Toen de twee koplopers in de bocht botsten, ging Vai Avanti Xamali er aan de buitenkant voorbij en gaf de leiding niet meer uit handen."]
};
const perYear = {};
for (const p of nieuws) (perYear[p.year] = perYear[p.year] || []).push(p);
for (const [year, posts] of Object.entries(perYear)) {
  posts.forEach((p, i) => {
    write(path.join(INHOUD, "nieuws", p.id + ".md"), {
      titel: p.title, datum: `${year}-01-01`, datumOnbekend: true, volgorde: posts.length - i,
      kop: KOP[p.id] ? KOP[p.id][0] : "", samenvatting: KOP[p.id] ? KOP[p.id][1] : "",
      overzicht: !!p.recap, fotos: p.photos.map(media)
    }, toMd(p.body));
  });
}

/* ---------- Algemene teksten ---------- */
const site = {
  hero: {
    bovenschrift: "Whippetkennel · Opwijk · sinds 2020",
    titel: "Gefokt voor snelheid, grootgebracht met *hart.*",
    intro: "Vai Avanti – Italiaans voor ‘ga door’ – is een kleine, toegewijde whippetkennel. Wij fokken gezonde, sociale whippets en racen met trots op de renbanen van België, Nederland, Duitsland en ver daarbuiten.",
    foto: media("200000179")
  },
  verwacht: {
    tonen: true,
    titel: "Twee nieuwe nesten",
    label: "Verwacht in 2027",
    tekst: "Met veel trots kondigen wij twee nesten aan voor 2027. Interesse? Neem gerust contact met ons op voor meer informatie."
  },
  overOns: {
    titel: "Doorgaan. *Altijd vooruit.*",
    intro: "Vai Avanti is Italiaans voor ‘ga door’. Een naam die past bij alles wat we met onze honden willen bereiken.",
    startpagina: "Al van kinds af aan ben ik te vinden op de windhondenrenbanen, in binnen- en buitenland. In 2018 werd een droom werkelijkheid met Lylo, mijn eerste eigen hond. Twee jaar later keurde de KMSH, nét op tijd, mijn kennelnaam goed en kwam ons eerste nest ter wereld.",
    citaat: "Vai Avanti: een naam die past bij alles wat ik met mijn honden wil bereiken, namelijk doorgaan.",
    citaatVan: "Shany Van der Meulen"
  },
  team: [
    {
      naam: "Shany Van der Meulen", rol: "Oprichter & fokker", foto: media("200000141"),
      tekst: [
        "In 2020 mocht ik met veel trots mijn eigen kennelnaam aanvragen. In mei verwachtte ik toen mijn eerste eigen nest en het was redelijk krap om de kennelnaam op tijd goedgekeurd te hebben door de KMSH. Wonder boven wonder kon ik met veel trots mijn eerste nest aankondigen onder mijn nieuwe kennelnaam ‘Vai Avanti’. Een naam die op mijn lijf geschreven was, maar ook zo hard past bij wat ik wil bereiken met mijn honden: doorgaan!",
        "Wie mij al langer kent, weet dat ik van kleins af aan terug te vinden ben op de windhondenrenbanen, zowel in binnen- als in buitenland. In 2018 was het dan eindelijk zover en had ik mijn eerste echte eigen hond: Lylo. Lylo was voor mij een grote droom die werkelijkheid werd en samen hebben wij ongelofelijk veel avonturen beleefd.",
        "In 2020 was het dan ook de beurt aan mijn eerste nest. Dankzij mijn oma en haar partner mocht ik Bayah (Samba Supersonic) gebruiken om mijn eerste nest te fokken. Uit dat nest kwamen 4 kleine dropjes: 1 teef (waar ik zo op gehoopt had) en 3 reuen. Het plan was om een teef te houden en nooit om ook nog een reu te houden, maar ondertussen is ook dat geschiedenis en vervoegden Vienna en Flappie ons team.",
        "Mijn eerste nest fokken was al een droom op zich, maar daar hield het niet op. Zonder verwachtingen presteerden zij meer dan waar ik ooit op had durven hopen. Vienna is een ongelofelijke hond die al zoveel bewezen heeft op jonge leeftijd, en ook haar broer Flappie moest niet onderdoen en heeft enkele mooie titels op zijn palmares kunnen schrijven.",
        "Ondertussen zijn we enkele jaren verder en bestaat ons team uit 5 vaste waarden. Een dochter van Lylo en een dochter van Vienna hebben ons team nog versterkt, en we zijn heel nieuwsgierig naar wat zij ons nog allemaal gaan laten zien."
      ].join("\n\n")
    },
    {
      naam: "Keanu Vercauteren", rol: "Teamlid sinds 2022", foto: media("200000410"),
      tekst: [
        "Sinds 2022 is Keanu lid van team Vai Avanti. Vanaf dag 1 had Keanu een ongelofelijke klik met de honden, maar vooral met Flappie. Die twee zijn twee handen op één buik en altijd in elkaars buurt terug te vinden. Samen hebben ze ook al enkele mooie wedstrijden gewonnen.",
        "Keanu bracht ons ook terug in contact met de flyballsport, waar we sinds kort mee aan de slag zijn met Mayzie en Nixy.",
        "Op naar nog meer avonturen samen!"
      ].join("\n\n")
    }
  ],
  contact: {
    telefoon: "+32 493 18 02 90",
    email: "vai-avanti@hotmail.com",
    plaats: "1745 Opwijk, België",
    instagram: "https://www.instagram.com/vai.avanti2020/",
    facebook: "https://www.facebook.com/vai.avanti2020"
  },
  paginafotos: {
    honden: media("200000500"), nesten: media("200000201"), nieuws: media("200000232"),
    overOns: media("200000470"), contact: media("200000200")
  }
};
fs.writeFileSync(path.join(INHOUD, "site.json"), JSON.stringify(site, null, 2) + "\n");

/* ---------- Foto's ---------- */
fs.mkdirSync(MEDIA, { recursive: true });
let n = 0;
for (const id of used) {
  const src = path.join(ROOT, "site", "img", id + ".webp");
  if (!fs.existsSync(src)) { console.log("ontbreekt:", id); continue; }
  fs.copyFileSync(src, path.join(MEDIA, id + ".webp"));
  n++;
}
console.log(`${honden.length} honden, ${nesten.length} nesten, ${nieuws.length} verslagen, ${n} foto's naar media/`);
