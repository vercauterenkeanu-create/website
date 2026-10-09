/* Vai Avanti – gedeelde opmaak van pagina's en blokken.
   Wordt gebruikt door de bouwstap (Node) en door de beheerpagina (browser), zodat het voorbeeld
   in de beheerpagina er precies zo uitziet als de echte site. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VA = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Tekst ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function inline(text) {
    const keep = [];
    let s = esc(text).replace(/\\([\\*_`\[\]()#+\-.!>~|])/g, (_, c) => `\u0000${keep.push(c) - 1}\u0000`);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|tel:[^)\s]+|[\w./#-]+)\)/g, '<a href="$2">$1</a>')
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

  /* ---------- Kleine hulpjes ---------- */
  const arr = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== "") : (v ? [v] : []);
  const iso = v => (v && typeof v === "object" && typeof v.toISOString === "function") ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10);
  const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  // Talen van de site. Nederlands is de brontaal; de andere worden automatisch vertaald.
  const TALEN = {
    nl: { naam: "Nederlands", locale: "nl-BE", en: "en" },
    en: { naam: "English", locale: "en-GB", en: "and" },
    de: { naam: "Deutsch", locale: "de-DE", en: "und" },
    it: { naam: "Italiano", locale: "it-IT", en: "e" },
    fi: { naam: "Suomi", locale: "fi-FI", en: "ja" },
    da: { naam: "Dansk", locale: "da-DK", en: "og" }
  };
  const fmtDate = (s, taal = "nl") => {
    const [y, m, d] = iso(s).split("-").map(Number);
    if (!(y && m && d)) return "";
    if (taal === "nl" || !TALEN[taal]) return `${d} ${MAANDEN[m - 1]} ${y}`;
    return new Intl.DateTimeFormat(TALEN[taal].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
  };
  // Tekst met {plaatshouders} invullen
  const vulIn = (s, v) => v ? String(s).replace(/\{([a-z]+)\}/gi, (m, k) => k in v ? v[k] : m) : String(s);
  // Vaste woorden die niet letterlijk als t-tekst in de code staan maar wel vertaald moeten worden
  const UI_EXTRA = ["Teef", "Reu"];
  const same = (a, b) => !!a && String(a).trim().toLowerCase() === String(b || "").trim().toLowerCase();
  const yearOf = s => parseInt((String(s).match(/\d{4}/) || ["0"])[0], 10);
  const clip = (s, n) => s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s;
  const pageFile = id => id === "start" ? "index.html" : `${id}.html`;
  const heeft = (o, k) => o && o[k] !== undefined && o[k] !== null;

  /* ---------- Kleuren en lettertypes ---------- */
  const isKleur = c => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c || "").trim());
  const rgb = c => { let h = String(c).trim().slice(1); if (h.length === 3) h = h.replace(/./g, x => x + x); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const hex = a => "#" + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const meng = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  // Uit één accentkleur de lichte, donkere en verloopvariant maken (zoals het standaard goud)
  const accentVars = a => [`--gold:${a}`, `--gold-2:${meng(a, "#ffffff", .42)}`, `--gold-3:${meng(a, "#000000", .24)}`,
    `--gold-grad:linear-gradient(135deg, ${meng(a, "#ffffff", .5)} 0%, ${a} 48%, ${meng(a, "#000000", .24)} 100%)`];
  const LETTERS = {
    titel: {
      "Cormorant Garamond": "ital,wght@0,500;0,600;0,700;1,500;1,600", "Playfair Display": "ital,wght@0,500;0,600;0,700;1,500;1,600",
      "Lora": "ital,wght@0,500;0,600;0,700;1,500;1,600", "Libre Baskerville": "ital,wght@0,400;0,700;1,400",
      "DM Serif Display": "ital@0;1", "Cinzel": "wght@500;600;700"
    },
    tekst: {
      "Manrope": "wght@400;500;600;700", "Inter": "wght@400;500;600;700", "Nunito Sans": "wght@400;500;600;700",
      "Lato": "wght@400;700", "Open Sans": "wght@400;500;600;700", "Raleway": "wght@400;500;600;700"
    }
  };
  const letterVan = (soort, naam) => LETTERS[soort][naam] ? naam : Object.keys(LETTERS[soort])[0];
  const fontsHref = (thema = {}) => {
    const t = letterVan("titel", thema.titelLetter), s = letterVan("tekst", thema.tekstLetter);
    return `https://fonts.googleapis.com/css2?family=${t.replace(/ /g, "+")}:${LETTERS.titel[t]}&family=${s.replace(/ /g, "+")}:${LETTERS.tekst[s]}&display=swap`;
  };
  // Enkel wat Shany veranderd heeft komt in de stijl; de rest blijft zoals in site.css
  function themaCss(thema = {}) {
    const v = [];
    if (isKleur(thema.accent)) v.push(...accentVars(thema.accent));
    if (isKleur(thema.donker)) v.push(`--ink:${thema.donker}`, `--ink-2:${meng(thema.donker, "#ffffff", .04)}`, `--ink-3:${meng(thema.donker, "#ffffff", .09)}`);
    if (isKleur(thema.licht)) v.push(`--paper:${thema.licht}`);
    if (isKleur(thema.beige)) v.push(`--ivory:${thema.beige}`, `--line:${meng(thema.beige, "#000000", .08)}`);
    if (isKleur(thema.tekst)) v.push(`--text:${thema.tekst}`, `--muted:${meng(thema.tekst, isKleur(thema.licht) ? thema.licht : "#fffcf6", .42)}`);
    if (thema.titelLetter && LETTERS.titel[thema.titelLetter]) v.push(`--serif:"${thema.titelLetter}", Georgia, "Times New Roman", serif`);
    if (thema.tekstLetter && LETTERS.tekst[thema.tekstLetter]) v.push(`--sans:"${thema.tekstLetter}", system-ui, -apple-system, "Segoe UI", sans-serif`);
    return v.length ? `:root{${v.join(";")}}` : "";
  }
  // Eigen kleuren van één blok
  function blokStijl(b) {
    const s = [];
    const kop = b.type === "hero" || b.type === "paginakop";
    if (isKleur(b.kleurAchtergrond)) s.push(kop ? `--ink:${b.kleurAchtergrond}` : "", `background:${b.kleurAchtergrond}`);
    if (isKleur(b.kleurTekst)) {
      const t = b.kleurTekst, ond = isKleur(b.kleurAchtergrond) ? b.kleurAchtergrond : "#fffcf6";
      s.push(`color:${t}`, `--text:${t}`, `--muted:${meng(t, ond, .3)}`, `--muted-light:${meng(t, ond, .3)}`, `--kop-lead:${meng(t, ond, .18)}`);
    }
    if (isKleur(b.kleurAccent)) s.push(...accentVars(b.kleurAccent));
    return s.filter(Boolean).join(";");
  }

  /* ---------- Iconen ---------- */
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
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.2 8.1 7.5 9 4.3-.9 7.5-4.6 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>'
  };

  /* ---------- Bloktypes: wat Shany kan toevoegen en welke velden ze heeft ----------
     Veldtypes: regel (één regel tekst), tekst (meerdere regels), opmaak (tekst met vet/kopjes/lijstjes),
     foto, fotos (meerdere), aanuit, keuze (opties), lijst (herhaalbare groep velden). */
  const F = {
    bovenschrift: { naam: "bovenschrift", label: "Klein opschrift", type: "regel" },
    titel: { naam: "titel", label: "Titel", type: "regel", hulp: "Zet *sterretjes* rond een woord om het goud en schuin te maken." },
    intro: { naam: "intro", label: "Introtekst", type: "tekst" },
    achtergrond: { naam: "achtergrond", label: "Achtergrond", type: "keuze", opties: ["Wit", "Beige", "Donker"] },
    fotos: { naam: "fotos", label: "Foto's", type: "fotos", hulp: "Meer dan één foto? Dan wisselen ze vanzelf af (diavoorstelling)." },
    knoptekst: { naam: "knoptekst", label: "Tekst op de knop (leeg = geen knop)", type: "regel" },
    knoplink: { naam: "knoplink", label: "Knop gaat naar", type: "link" },
    linktekst: { naam: "linktekst", label: "Tekst van de link rechts (leeg = geen link)", type: "regel" }
  };
  // Opmaak van een kop (paginakop en grote foto)
  const KOP = [
    { naam: "hoogte", label: "Hoogte", type: "keuze", opties: ["Normaal", "Klein", "Groot"], groep: "Opmaak van de kop" },
    { naam: "uitlijning", label: "Tekst", type: "keuze", opties: ["Links", "Midden"], groep: "Opmaak van de kop" },
    { naam: "donkerte", label: "Foto donkerder maken", type: "keuze", opties: ["Normaal", "Weinig", "Veel"], groep: "Opmaak van de kop" },
    { naam: "fotoFocus", label: "Belangrijkste deel van de foto", type: "keuze", opties: ["Midden", "Boven", "Onder"], groep: "Opmaak van de kop" },
    { naam: "wissel", label: "Diavoorstelling: volgende foto na", type: "keuze", opties: ["6 sec", "4 sec", "8 sec", "12 sec"], groep: "Opmaak van de kop" }
  ];
  // Eigen kleuren: elk blok kan ze krijgen (leeg = de kleuren van de site)
  const KLEUR_VELDEN = [
    { naam: "kleurAchtergrond", label: "Achtergrond", type: "kleur", groep: "Kleuren van dit blok" },
    { naam: "kleurTekst", label: "Tekst", type: "kleur", groep: "Kleuren van dit blok" },
    { naam: "kleurAccent", label: "Accent (goud)", type: "kleur", groep: "Kleuren van dit blok" }
  ];
  const ICONEN = { DNA: "dna", Hart: "heart", Klembord: "clip", Schild: "shield", Vinkje: "check", Beker: "trophy", Telefoon: "phone", Locatie: "pin" };
  const TOKENS_HULP = "Automatisch ingevuld: {verslagen} = aantal verslagen, {sinds} = eerste jaar, {honden}, {nesten}, {nestletters} (T-, U-, X- en Y), {titels}.";
  // Standaardinhoud van blokken die vroeger vaste tekst hadden
  const STANDAARD = {
    cijfers: [
      { getal: "2020", tekst: "Kennelnaam erkend door de KMSH" }, { getal: "{nesten}", tekst: "Nesten gefokt: het {nestletters}-nest" },
      { getal: "{titels}", tekst: "Titels en ereplaatsen van onze honden" }, { getal: "272", tekst: "MyDogDNA-checkpoints, allemaal clear" }
    ],
    punten: [
      { icoon: "DNA", titel: "DNA-testen", tekst: "Myostatin deficiency en Factor VII deficiency: N/N (normal)." },
      { icoon: "Hart", titel: "Hart & rug", tekst: "Hartonderzoek en rugscreening (LTV en SP) bij onze fokdieren." },
      { icoon: "Klembord", titel: "Heupen & ellebogen", tekst: "Officieel gescreend, met resultaten tot Excellent / A1." },
      { icoon: "Schild", titel: "MyDogDNA", tekst: "Volledige DNA-screening: clear op alle 272 checkpoints." }
    ]
  };
  const BLOKKEN = {
    tekst: { label: "Tekst", omschrijving: "Een titel met een stuk tekst.", velden: [F.bovenschrift, F.titel, { naam: "tekst", label: "Tekst", type: "opmaak" }, F.achtergrond], nieuw: { titel: "Nieuwe titel", tekst: "Schrijf hier je tekst.", achtergrond: "Wit" } },
    tekstfoto: { label: "Tekst met foto", omschrijving: "Tekst naast een grote foto, eventueel met een knop.", velden: [F.bovenschrift, F.titel, { naam: "tekst", label: "Tekst", type: "opmaak" }, { naam: "foto", label: "Foto", type: "foto" }, { naam: "fotoRechts", label: "Foto rechts zetten", type: "aanuit" }, { naam: "knoptekst", label: "Tekst op de knop (mag leeg)", type: "regel" }, { naam: "knoplink", label: "Knop gaat naar", type: "link" }, F.achtergrond], nieuw: { titel: "Nieuwe titel", tekst: "Schrijf hier je tekst.", achtergrond: "Wit" } },
    fotos: { label: "Foto's", omschrijving: "Een fotogalerij. Bezoekers kunnen de foto's groot bekijken.", velden: [F.bovenschrift, F.titel, { naam: "fotos", label: "Foto's", type: "fotos" }, F.achtergrond], nieuw: { titel: "Foto's", fotos: [], achtergrond: "Beige" } },
    citaat: { label: "Citaat", omschrijving: "Een opvallende uitspraak in grote letters.", velden: [{ naam: "tekst", label: "Citaat", type: "tekst" }, { naam: "van", label: "Van wie", type: "regel" }, F.achtergrond], nieuw: { tekst: "Een mooie uitspraak.", van: "", achtergrond: "Beige" } },
    aankondiging: { label: "Aankondiging met knop", omschrijving: "Een opvallende balk met titel, tekst en knop.", velden: [{ naam: "label", label: "Klein opschrift", type: "regel" }, F.titel, { naam: "tekst", label: "Tekst", type: "tekst" }, { naam: "knoptekst", label: "Tekst op de knop", type: "regel" }, { naam: "knoplink", label: "Knop gaat naar", type: "link" }, { naam: "stijl", label: "Stijl", type: "keuze", opties: ["Donker", "Licht"] }], nieuw: { label: "Nieuw", titel: "Iets om aan te kondigen", tekst: "", knoptekst: "Neem contact op", knoplink: "contact.html", stijl: "Donker" } },
    paginakop: { label: "Paginakop met foto", omschrijving: "De donkere kop bovenaan een pagina, met één of meer foto's.", velden: [F.bovenschrift, F.titel, { ...F.intro, hulp: TOKENS_HULP }, F.fotos, F.knoptekst, F.knoplink, ...KOP], nieuw: { bovenschrift: "Vai Avanti", titel: "Nieuwe *pagina*", intro: "", fotos: [] } },
    hero: {
      label: "Grote foto met titel", omschrijving: "Het grote openingsbeeld van de startpagina, met één of meer foto's.",
      velden: [F.bovenschrift, { ...F.titel, label: "Grote titel" }, F.intro, F.fotos,
        { naam: "knop1tekst", label: "Eerste knop: tekst (leeg = geen knop)", type: "regel" }, { naam: "knop1link", label: "Eerste knop gaat naar", type: "link" },
        { naam: "knop2tekst", label: "Tweede knop: tekst (leeg = geen knop)", type: "regel" }, { naam: "knop2link", label: "Tweede knop gaat naar", type: "link" },
        { naam: "nieuwsTonen", label: "Laatste nieuws tonen in de foto", type: "aanuit" }, ...KOP],
      nieuw: { bovenschrift: "Vai Avanti", titel: "Titel", intro: "", fotos: [], knop1tekst: "Ontmoet onze honden", knop1link: "honden.html", knop2tekst: "", knop2link: "nesten.html", nieuwsTonen: true }
    },
    cijfers: {
      label: "Kerncijfers", omschrijving: "Een rij opvallende cijfers.",
      velden: [{ naam: "cijfers", label: "Cijfers", type: "lijst", hulp: TOKENS_HULP, velden: [{ naam: "getal", label: "Getal", type: "regel" }, { naam: "tekst", label: "Tekst", type: "regel" }] }],
      nieuw: { cijfers: [{ getal: "{nesten}", tekst: "Nesten gefokt" }, { getal: "{titels}", tekst: "Titels en ereplaatsen" }] }
    },
    honden: { label: "Onze honden (overzicht)", omschrijving: "De kaartjes van alle honden, met een titel erboven.", velden: [F.bovenschrift, F.titel, F.intro], nieuw: { bovenschrift: "Onze honden", titel: "Het team achter *de naam*", intro: "" } },
    hondenlijst: { label: "Alle honden (kaartjes)", omschrijving: "Enkel de kaartjes van alle honden. Titel mag leeg blijven.", velden: [F.bovenschrift, F.titel, F.intro], nieuw: {} },
    uitnesten: { label: "Honden uit onze nesten", omschrijving: "De honden uit onze nesten die bij hun eigen baasjes wonen.", velden: [F.bovenschrift, F.titel, F.intro, F.linktekst], nieuw: { bovenschrift: "Uit onze nesten", titel: "Ook *Vai Avanti*", intro: "Deze honden komen uit onze nesten en wonen bij hun eigen baasjes.", linktekst: "Alle nesten" } },
    nieuws: { label: "Laatste nieuws", omschrijving: "De drie nieuwste wedstrijdverslagen.", velden: [F.bovenschrift, F.titel, { ...F.linktekst, hulp: TOKENS_HULP }, { naam: "leestekst", label: "Tekst onder elk verslag", type: "regel" }], nieuw: { bovenschrift: "Van de renbaan", titel: "Laatste *nieuws*", linktekst: "Alle {verslagen} wedstrijdverslagen", leestekst: "Lees het verslag" } },
    verslagen: { label: "Alle verslagen (archief)", omschrijving: "Alle wedstrijdverslagen per jaar, met de filter per hond. Zet dit maar op één pagina.", velden: [], nieuw: {} },
    gezondheid: {
      label: "Gezondheid", omschrijving: "Het donkere blok over de gezondheidstesten.",
      velden: [F.bovenschrift, F.titel, F.intro, F.knoptekst, F.knoplink,
        { naam: "punten", label: "Punten", type: "lijst", velden: [{ naam: "icoon", label: "Icoon", type: "keuze", opties: Object.keys(ICONEN) }, { naam: "titel", label: "Titel", type: "regel" }, { naam: "tekst", label: "Tekst", type: "tekst" }] }],
      nieuw: { bovenschrift: "Gezondheid voorop", titel: "Getest, gedocumenteerd en *transparant*", intro: "", knoptekst: "Bekijk de resultaten per hond", knoplink: "honden.html", punten: [{ icoon: "DNA", titel: "DNA-testen", tekst: "" }] }
    },
    nesten: { label: "Onze nesten (overzicht)", omschrijving: "De kaartjes van alle nesten, met de verwachte nesten eronder.", velden: [F.bovenschrift, F.titel, F.intro, F.linktekst], nieuw: { bovenschrift: "Pups & nesten", titel: "Onze *nesten*", intro: "", linktekst: "Alle nesten en pups" } },
    nestenlijst: { label: "Alle nesten met pups", omschrijving: "Elk nest met al zijn pups, foto's en stambomen.", velden: [{ naam: "verwachtTonen", label: "Verwachte nesten bovenaan tonen", type: "aanuit" }], nieuw: { verwachtTonen: true } },
    verwacht: { label: "Verwachte nesten", omschrijving: "De aankondiging van de verwachte nesten. De tekst pas je aan bij Instellingen.", velden: [], nieuw: {} },
    overons: {
      label: "Over ons (kort)", omschrijving: "Twee foto's, een korte tekst en een citaat.",
      velden: [F.bovenschrift, F.titel, { naam: "tekst", label: "Tekst", type: "tekst" }, { naam: "foto1", label: "Grote foto", type: "foto" }, { naam: "foto2", label: "Kleine foto", type: "foto" },
        { naam: "jaartal", label: "Jaartal op de foto (leeg = niet tonen)", type: "regel" }, { naam: "jaartekst", label: "Tekst onder het jaartal", type: "regel" },
        { naam: "citaat", label: "Citaat", type: "tekst" }, { naam: "citaatVan", label: "Citaat van", type: "regel" }, F.knoptekst, F.knoplink],
      nieuw: { bovenschrift: "Over ons", titel: "Over *ons*", tekst: "", knoptekst: "Lees ons verhaal", knoplink: "over-ons.html" }
    },
    team: { label: "Teamleden", omschrijving: "Foto en verhaal per persoon.", velden: [{ naam: "leden", label: "Teamleden", type: "lijst", velden: [{ naam: "naam", label: "Naam", type: "regel" }, { naam: "rol", label: "Rol", type: "regel" }, { naam: "foto", label: "Foto", type: "foto" }, { naam: "tekst", label: "Verhaal", type: "opmaak" }] }], nieuw: { leden: [{ naam: "Naam", rol: "", tekst: "" }] } },
    contact: {
      label: "Contactformulier", omschrijving: "Contactgegevens en het formulier. Telefoon, e-mail en adres pas je aan bij Instellingen.",
      velden: [F.bovenschrift, F.titel, F.intro, { naam: "formulierTitel", label: "Titel van het formulier", type: "regel" }, { naam: "formulierTekst", label: "Tekst onder die titel", type: "regel" },
        { naam: "onderwerpen", label: "Keuzes bij 'Onderwerp'", type: "woorden", hulp: "De eerste keuze wordt gekozen bij 'Informeer naar de nesten', de tweede bij vragen over de honden." },
        { naam: "knoptekst", label: "Tekst op de verstuurknop", type: "regel" }],
      nieuw: { bovenschrift: "Contact", titel: "Kom *kennismaken*", intro: "Vragen over onze honden of over onze nesten? Stuur ons een bericht of bel ons gerust.", formulierTitel: "Stuur ons een bericht", formulierTekst: "We antwoorden zo snel mogelijk.", onderwerpen: ["Informatie over onze nesten", "Vraag over onze honden", "Iets anders"], knoptekst: "Verstuur bericht" }
    }
  };

  /* ---------- Velden van verslagen, honden en nesten (beheerpagina en Pages CMS) ---------- */
  const lijstVan = (naam, label, hulp) => ({ naam, label, type: "woorden", hulp });
  const VELDEN = {
    nieuws: [
      { naam: "titel", label: "Titel", type: "regel", hulp: "Bijvoorbeeld de naam van de wedstrijd of de renbaan." },
      { naam: "datum", label: "Datum", type: "datum" },
      { naam: "fotos", label: "Foto's", type: "fotos", hulp: "De eerste foto wordt de grote foto." },
      { naam: "tekst", label: "Verslag", type: "opmaak", hulp: "De namen van de honden worden vanzelf herkend en gelinkt." },
      { naam: "overzicht", label: "Dit is een seizoensoverzicht", type: "aanuit" },
      { naam: "kop", label: "Kop op de startpagina (mag leeg blijven)", type: "regel" },
      { naam: "samenvatting", label: "Korte samenvatting op de startpagina (mag leeg blijven)", type: "tekst" }
    ],
    honden: [
      { naam: "roepnaam", label: "Roepnaam", type: "regel" },
      { naam: "naam", label: "Officiële naam", type: "regel", hulp: "Zoals in de stamboom, bijvoorbeeld Vai Avanti Tiamo." },
      { naam: "geslacht", label: "Geslacht", type: "keuze", opties: ["Teef", "Reu"] },
      { naam: "status", label: "Label op de foto (mag leeg blijven)", type: "regel", hulp: "Bijvoorbeeld Veteraan, Op rust of Jong talent." },
      { naam: "geboren", label: "Geboren op", type: "datum" },
      { naam: "kleur", label: "Kleur", type: "regel" },
      { naam: "vader", label: "Vader", type: "regel" },
      { naam: "moeder", label: "Moeder", type: "regel", hulp: "Gebruik exact de officiële naam, dan wordt ze automatisch gelinkt." },
      { naam: "hoogtepunt", label: "Grootste prestatie (kort)", type: "regel" },
      { naam: "omslagfoto", label: "Hoofdfoto", type: "foto" },
      { naam: "fotos", label: "Meer foto's", type: "fotos" },
      lijstVan("gezondheid", "Gezondheidsresultaten", "Eén resultaat per regel, bijvoorbeeld Heupen Excellent / A1."),
      { naam: "palmares", label: "Palmares", type: "lijst", hulp: "De volgorde maakt niet uit; de site sorteert op jaar.", velden: [{ naam: "jaar", label: "Jaar", type: "regel" }, { naam: "titel", label: "Titel", type: "regel" }, { naam: "plaats", label: "Plaats", type: "regel" }] },
      { naam: "stamboom", label: "Link naar de stamboom (Breed Archive)", type: "regel" },
      lijstVan("andereNamen", "Andere namen in verslagen (mag leeg blijven)", "Roepnaam en officiële naam worden al herkend."),
      { naam: "tekst", label: "Over deze hond", type: "opmaak" }
    ],
    nesten: [
      { naam: "letter", label: "Letter van het nest", type: "regel" },
      { naam: "geboren", label: "Geboren op", type: "datum" },
      { naam: "vader", label: "Vader", type: "regel" },
      { naam: "moeder", label: "Moeder", type: "regel", hulp: "Gebruik exact de officiële naam, dan wordt ze automatisch gelinkt." },
      { naam: "foto", label: "Foto of affiche van het nest", type: "foto" },
      { naam: "tekst", label: "Over dit nest", type: "opmaak" },
      { naam: "pups", label: "Pups", type: "lijst", velden: [
        { naam: "naam", label: "Officiële naam", type: "regel" }, { naam: "roepnaam", label: "Roepnaam", type: "regel" },
        { naam: "geslacht", label: "Geslacht", type: "keuze", opties: ["Teef", "Reu"] }, { naam: "kleur", label: "Kleur", type: "regel" },
        { naam: "woontIn", label: "Woont in (land, leeg = bij ons)", type: "regel" }, { naam: "fotos", label: "Foto's", type: "fotos" },
        lijstVan("gezondheid", "Gezondheidsresultaten"), lijstVan("uitslagen", "Uitslagen"),
        { naam: "stamboom", label: "Link naar de stamboom", type: "regel" }, lijstVan("andereNamen", "Andere namen in verslagen (mag leeg blijven)")] }
    ]
  };

  /* ---------- Van ruwe bestanden naar alles wat de pagina's nodig hebben ----------
     raw = { site, paginas: {id: data}, honden: {id: data}, nesten: {id: data}, nieuws: {id: data} } */
  function bouwModel(raw, taal = "nl") {
    const site = raw.site || {};
    site.paginafotos = site.paginafotos || {};
    const paginas = Object.entries(raw.paginas || {}).map(([id, p]) => ({ id: slug(id), ...p, blokken: arr(p.blokken) }));

    const honden = Object.entries(raw.honden || {}).map(([id, d]) => {
      const photos = arr(d.fotos);
      const cover = d.omslagfoto || photos[0];
      return {
        id: slug(id), call: d.roepnaam || id, name: d.naam || "", sex: d.geslacht || "", status: d.status || "",
        born: fmtDate(d.geboren, taal), color: d.kleur || "", sire: d.vader || "", dam: d.moeder || "",
        highlight: d.hoogtepunt || "", pedigree: d.stamboom || "", health: arr(d.gezondheid).map(String),
        titles: arr(d.palmares).map(t => [String(t.jaar ?? ""), t.titel || "", t.plaats || ""]).filter(t => t[1]).sort((a, b) => yearOf(b[0]) - yearOf(a[0])),
        cover, pos: d.fotoFocus || "", photos: [cover, ...photos.filter(p => p !== cover)].filter(Boolean),
        noteMd: String(d.tekst || "").trim(), extraNames: arr(d.andereNamen).map(String), order: Number(d.volgorde ?? 999)
      };
    }).filter(d => d.call).sort((a, b) => a.order - b.order || a.call.localeCompare(b.call));

    const nesten = Object.entries(raw.nesten || {}).map(([id, l]) => ({
      id: slug(l.letter || id), letter: String(l.letter || id).toUpperCase(), bornIso: iso(l.geboren), born: fmtDate(l.geboren, taal),
      sire: l.vader || "", dam: l.moeder || "", introMd: String(l.tekst || "").trim(), photos: arr(l.foto),
      pups: arr(l.pups).map(p => ({
        name: p.naam || "", call: p.roepnaam || p.naam || "", sex: p.geslacht || "", color: p.kleur || "",
        country: p.woontIn || "", health: arr(p.gezondheid).map(String), results: arr(p.uitslagen).map(String),
        photos: arr(p.fotos), pedigree: p.stamboom || "", extraNames: arr(p.andereNamen).map(String)
      })).filter(p => p.call)
    })).sort((a, b) => a.bornIso.localeCompare(b.bornIso));

    const dogByName = name => honden.find(d => same(d.name, name));
    for (const l of nesten) { l.damId = (dogByName(l.dam) || {}).id; for (const p of l.pups) p.dog = (dogByName(p.name) || {}).id; }
    for (const d of honden) { d.damId = (dogByName(d.dam) || {}).id; d.sireId = (dogByName(d.sire) || {}).id; d.litter = (nesten.find(l => l.pups.some(p => same(p.name, d.name))) || {}).id; }

    const nieuws = Object.entries(raw.nieuws || {}).map(([id, p]) => {
      const dateIso = iso(p.datum) || `${String(id).slice(0, 4)}-01-01`;
      return {
        id, title: p.titel || id, dateIso, dateKnown: !!p.datum && (!p.datumOnbekend || !/-01-01$/.test(dateIso)), year: yearOf(dateIso) || yearOf(id),
        order: Number(p.volgorde || 0), kop: p.kop || "", summary: p.samenvatting || "", recap: !!p.overzicht, photos: arr(p.fotos), body: p.tekst || ""
      };
    }).sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.order - a.order || String(a.id).localeCompare(String(b.id)));

    // Honden herkennen in verslagen: roepnaam (min. 4 letters, ook met -je), officiële naam,
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
    for (const p of nieuws) { const t = p.title + "\n" + plain(p.body); p.dogs = entities.filter(e => e.test(t)).map(e => e.key); }
    const DOG_INFO = {};
    for (const e of entities) DOG_INFO[e.key] = { call: e.call, href: e.href };
    const titleCount = honden.reduce((n, d) => n + d.titles.length, 0) + nesten.reduce((n, l) => n + l.pups.reduce((m, p) => m + p.results.length, 0), 0);

    // Het menu: alle pagina's met "Toon in het menu", in volgorde, met hun menunaam
    const menu = paginas.filter(p => p.inMenu).map(p => ({ key: p.id === "start" ? "" : p.id, label: p.menuNaam || p.titel || p.id, href: pageFile(p.id), order: Number(p.menuVolgorde ?? 50) }))
      .sort((a, b) => a.order - b.order);

    // Woorden tussen {accolades} die de site zelf invult
    const letters = nesten.map(l => l.letter);
    const TOKENS = {
      verslagen: String(nieuws.length), sinds: String(Math.min(...nieuws.map(p => p.year).filter(Boolean)) || ""),
      honden: String(honden.length), nesten: String(nesten.length),
      nestletters: letters.length > 1 ? letters.slice(0, -1).join("-, ") + `- ${(TALEN[taal] || TALEN.nl).en} ` + letters.slice(-1) : letters.join(""),
      // Zelfde letters zonder streepjes (T, U, X en Y), voor talen die geen "het T-nest" kennen
      nestlijst: letters.length > 1 ? letters.slice(0, -1).join(", ") + ` ${(TALEN[taal] || TALEN.nl).en} ` + letters.slice(-1) : letters.join(""),
      titels: String(titleCount), plaats: String((site.contact || {}).plaats || "").replace(/^\d+\s*/, "").replace(/,.*$/, ""),
      jaar: String(new Date().getFullYear())
    };
    const vul = v => typeof v === "string" ? v.replace(/\{([a-z]+)\}/g, (m, k) => k in TOKENS ? TOKENS[k] : m)
      : Array.isArray(v) ? v.map(vul) : (v && typeof v === "object") ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, vul(x)])) : v;

    const reportDate = p => p.dateKnown ? fmtDate(p.dateIso, taal) : String(p.year);
    const firstText = p => plain(p.body).split(/\n{2,}/).map(s => s.trim()).find(s => s.length > 60) || plain(p.body).trim();
    const nieuwsKaarten = nieuws.slice(0, 3).map(p => ({
      id: p.id, titel: p.title, datum: reportDate(p), foto: p.photos[0] || "",
      kop: p.kop || p.title, tekst: p.summary || clip(firstText(p).replace(/\s+/g, " "), 200)
    }));
    return { site, paginas, honden, nesten, nieuws, DOG_INFO, titleCount, menu, nieuwsKaarten, nieuwsAantal: nieuws.length, reportDate, dogByName, TOKENS, vul, taal };
  }

  /* ---------- Site-opbouw ---------- */
  function createSite(ctx) {
    const { img, shot, imgUrl } = ctx;
    const D = ctx.model;
    const site = D.site || {};
    const C = site.contact || {};
    const V = site.verwacht || {};
    const mailParts = String(C.email || "").split("@");
    const mailFallback = mailParts.length === 2 ? `${mailParts[0]} [at] ${mailParts[1]}` : "";
    const mailShown = ctx.showMail ? C.email : mailFallback;
    const telHref = "tel:" + String(C.telefoon || "").replace(/[^\d+]/g, "");
    const menu = D.menu || [];
    const vul = D.vul || (v => v);
    const MK = site.menu || {};
    // Vaste tekst van de site in de taal van deze pagina, met plaatshouders zoals {n}
    const taal = D.taal || "nl";
    const t = (s, v) => vulIn(ctx.vertaal ? ctx.vertaal(s) : s, v);
    // Taalkeuze: ctx.taalLinks(bestand) geeft [{ code, href }] voor alle talen van de site
    const taalKeuze = bestand => {
      const links = ctx.taalLinks ? ctx.taalLinks(bestand) : [];
      if (links.length < 2) return "";
      return `<details class="taalkeuze">
      <summary aria-label="${esc(t("Taal kiezen"))}">${ICON.globe}<span>${esc(taal.toUpperCase())}</span></summary>
      <ul>
${links.map(l => `        <li><a href="${esc(l.href)}" hreflang="${l.code}" lang="${l.code}" data-taal="${l.code}"${l.code === taal ? ' aria-current="true"' : ""}>${esc(TALEN[l.code].naam)}</a></li>`).join("\n")}
      </ul>
    </details>`;
    };
    const VT = vul(site.voettekst || {});

    const header = (active, bestand) => `<header class="site-header">
  <nav class="wrap nav" aria-label="${esc(t("Hoofdmenu"))}">
    <a class="brand" href="index.html" aria-label="${esc(t("Vai Avanti – startpagina"))}"><span class="brand-logo" role="img" aria-label="Vai Avanti"></span></a>
    <ul class="nav-links">
${menu.map(m => `      <li><a href="${esc(m.href)}"${m.key === active ? ' class="active" aria-current="page"' : ""}>${esc(m.label)}</a></li>`).join("\n")}
    </ul>
    ${taalKeuze(bestand || pageFile(active || "start"))}
    ${heeft(MK, "knoptekst") && !MK.knoptekst ? "" : `<a class="btn nav-cta" href="${esc(MK.knoplink || "contact.html")}"${pageFile(active || "start") === (MK.knoplink || "contact.html") ? ' aria-current="page"' : ""}>${esc(MK.knoptekst || "Contact")}</a>`}
    <button class="menu-toggle" aria-label="${esc(t("Menu openen"))}" aria-expanded="false">${ICON.menu}</button>
  </nav>
</header>`;

    const kolommen = arr(VT.kolommen);
    const footer = () => `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid" style="--kolommen:${kolommen.length + 1}">
      <div>
        <span class="brand-logo" role="img" aria-label="Vai Avanti"></span>
        ${VT.tekst ? `<p>${esc(VT.tekst)}</p>` : ""}
        <div class="socials">
          ${C.instagram ? `<a href="${esc(C.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.insta}</a>` : ""}
          ${C.facebook ? `<a href="${esc(C.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>` : ""}
          <a href="contact.html" data-mail-link aria-label="E-mail">${ICON.mail}</a>
        </div>
      </div>
${kolommen.map(k => `      <div>
        ${k.titel ? `<h4>${esc(k.titel)}</h4>` : ""}
        <ul>
${arr(k.links).filter(l => l.label).map(l => `          <li><a href="${esc(l.link || "index.html")}">${esc(l.label)}</a></li>`).join("\n")}
        </ul>
      </div>`).join("\n")}
      <div>
        <h4>${esc(VT.contactTitel || "Contact")}</h4>
        <ul>
          <li>${esc(C.plaats)}</li>
          <li><a href="${telHref}">${esc(C.telefoon)}</a></li>
          <li><a href="contact.html" data-mail-link data-mail>${esc(mailShown)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Vai Avanti${VT.onderschrift ? ` · ${esc(VT.onderschrift)}` : ""}</span>
      <a href="#top" style="color:inherit;text-decoration:none">${esc(t("Terug naar boven"))} ↑</a>
    </div>
  </div>
</footer>`;

    // Eén foto of een diavoorstelling (de eerste foto is zichtbaar zonder JavaScript)
    const beelden = (lijst, o, wissel) => lijst.length > 1
      ? `<div class="slides" data-wissel="${parseInt(wissel, 10) || 6}">${lijst.map((p, i) => img(p, { ...o, cls: i ? "" : "on", eager: !i && o.eager })).join("")}</div>`
      : (lijst[0] ? img(lijst[0], o) : "");
    const kopKlassen = b => [
      { Klein: "kop-klein", Groot: "kop-groot" }[b.hoogte], b.uitlijning === "Midden" ? "kop-midden" : "",
      { Weinig: "kop-licht", Veel: "kop-donker" }[b.donkerte]
    ].filter(Boolean).map(c => " " + c).join("");
    const focus = (b, standaard) => ({ Boven: standaard.split(" ")[0] + " 15%", Onder: standaard.split(" ")[0] + " 85%" }[b.fotoFocus] || standaard);

    const pageHero = ({ eyebrow, title, lead = "", bg = "", pos = "", crumbs = "", fotos, cls = "", wissel, knop = "" }) => {
      const lijst = (fotos || arr(bg)).filter(p => imgUrl(p));
      return `<section class="page-hero${cls}">
  ${lijst.length ? `<div class="bg">${beelden(lijst, { pos, sizes: "100vw", eager: true }, wissel)}</div>` : ""}
  <div class="wrap">
    ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ""}
    ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ""}
    ${knop}
  </div>
</section>`;
    };

    const dogCard = d => `<a class="dog-card reveal" href="hond-${d.id}.html">
  <div class="dog-media">
    ${img(d.cover, { alt: `${d.call} (${d.name})`, pos: d.pos, sizes: "(max-width: 640px) 100vw, 33vw" })}
    <div class="badges">${d.sex ? `<span class="badge">${esc(t(d.sex))}</span>` : ""}${d.status ? `<span class="badge gold">${esc(d.status)}</span>` : ""}</div>
  </div>
  <div class="dog-body">
    <h3>${esc(d.call)}</h3>
    <div class="dog-official">${esc(d.name)}</div>
    <div class="dog-meta">${[d.born && t("Geboren {datum}", { datum: d.born }), d.color].filter(Boolean).map(esc).join(" · ")}</div>
    ${d.highlight ? `<div class="dog-highlight">${ICON.trophy}<span>${esc(d.highlight)}</span></div>` : ""}
    <div class="dog-more"><span class="link-arrow">${esc(t("Bekijk profiel"))} ${ICON.arrow}</span></div>
  </div>
</a>`;

    const healthChips = list => `<div class="chips">${list.map(h => `<span class="chip">${ICON.check}${esc(h)}</span>`).join("")}</div>`;

    const CN = BLOKKEN.contact.nieuw;
    const contactBlock = (b = {}) => {
      const w = k => heeft(b, k) ? b[k] : CN[k];
      const onderwerpen = arr(w("onderwerpen")).map(String);
      return `<div class="contact-card reveal">
  <div class="contact-info dark">
    ${w("bovenschrift") ? `<span class="eyebrow">${esc(w("bovenschrift"))}</span>` : ""}
    <h2>${inline(w("titel"))}</h2>
    ${w("intro") ? `<p class="lead">${esc(w("intro"))}</p>` : ""}
    <ul class="contact-list">
      <li><a href="${telHref}"><span class="icon">${ICON.phone}</span><div><small>${esc(t("Telefoon"))}</small><span>${esc(C.telefoon)}</span></div></a></li>
      <li><a href="contact.html" data-mail-link><span class="icon">${ICON.mail}</span><div><small>${esc(t("E-mail"))}</small><span data-mail>${esc(mailShown)}</span></div></a></li>
      ${C.instagram ? `<li><a href="${esc(C.instagram)}" target="_blank" rel="noopener"><span class="icon">${ICON.insta}</span><div><small>Instagram</small><span>@${esc(String(C.instagram).replace(/\/+$/, "").split("/").pop())}</span></div></a></li>` : ""}
      <li><div><span class="icon">${ICON.pin}</span><div><small>${esc(t("Locatie"))}</small><span>${esc(C.plaats)}</span></div></div></li>
    </ul>
  </div>
  <form class="contact-form" id="contact-form">
    ${w("formulierTitel") ? `<h3>${esc(w("formulierTitel"))}</h3>` : ""}
    ${w("formulierTekst") ? `<p>${esc(w("formulierTekst"))}</p>` : ""}
    <div class="row">
      <label>${esc(t("Naam"))}<input id="naam" name="naam" required autocomplete="name"></label>
      <label>${esc(t("E-mailadres"))}<input id="email" name="email" type="email" required autocomplete="email"></label>
    </div>
    ${onderwerpen.length ? `<label>${esc(t("Onderwerp"))}
      <select name="onderwerp" id="onderwerp">
${onderwerpen.map(o => `        <option>${esc(o)}</option>`).join("\n")}
      </select>
    </label>` : ""}
    <label>${esc(t("Bericht"))}<textarea id="bericht" name="bericht" required></textarea></label>
    <div class="hp" aria-hidden="true"><label>${esc(t("Laat dit leeg"))}<input type="checkbox" id="botcheck" name="botcheck" tabindex="-1" autocomplete="off"></label></div>
    <div id="captcha-slot"></div>
    <div class="form-foot">
      <small id="form-status" aria-live="polite"></small>
      <button class="btn btn-dark" type="submit" id="form-submit">${esc(w("knoptekst") || t("Verstuur"))} ${ICON.arrow}</button>
    </div>
  </form>
</div>`;
    };

    const expectedBand = () => V.tonen ? `<div class="expected-band reveal" id="verwacht">
  <div class="litter-letter">${esc((String(V.label || "").match(/\d{4}/) || [t("Nieuw")])[0])}</div>
  <div class="txt">
    <div class="litter-date">${esc(V.label || "")}</div>
    <h2>${inline(V.titel || "")}</h2>
    <p>${esc(V.tekst || "")}</p>
  </div>
  ${heeft(V, "knoptekst") && !V.knoptekst ? "" : `<a class="btn btn-gold" href="${esc(V.knoplink || "contact.html#nesten")}">${esc(V.knoptekst || t("Informeer naar de nesten"))} ${ICON.arrow}</a>`}
</div>` : "";

    const head = (b, fallbackTitle, extra = "") => `<div class="section-head reveal">
      <div>
        ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
        <h2>${inline(b.titel || fallbackTitle)}</h2>
        ${b.intro ? `<p class="lead">${esc(b.intro)}</p>` : ""}
      </div>
      ${extra}
    </div>`;
    const bgClass = b => ({ Beige: " band", Donker: " dark" }[b.achtergrond] || "");
    const button = (text, link, cls = "btn btn-gold") => text ? `<a class="${cls}" href="${esc(link || "contact.html")}">${esc(text)} ${ICON.arrow}</a>` : "";
    // Knop met standaardtekst: leeg gemaakt = geen knop
    const knop = (b, tekst, link, cls) => button(heeft(b, "knoptekst") ? b.knoptekst : tekst, b.knoplink || link, cls);

    /* ---------- De bloktypes ---------- */
    const R = {
      hero(b) {
        const l0 = D.nieuwsKaarten && D.nieuwsKaarten[0];
        const fotos = arr(b.fotos).length ? arr(b.fotos) : arr(b.foto);
        const k1 = heeft(b, "knop1tekst") ? b.knop1tekst : t("Ontmoet onze honden"), k1l = b.knop1link || "honden.html";
        const k2 = heeft(b, "knop2tekst") ? b.knop2tekst : (V.tonen && V.label ? V.label : t("Onze nesten")), k2l = b.knop2link || `nesten.html${V.tonen ? "#verwacht" : ""}`;
        return `<section class="hero${kopKlassen(b)}">
  <div class="hero-media">${beelden(fotos, { alt: "", sizes: "100vw", eager: true, pos: b.fotoFocus && b.fotoFocus !== "Midden" ? focus(b, "72% 40%") : "" }, b.wissel)}</div>
  <div class="wrap">
    <div class="hero-content">
      ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
      <h1>${inline(b.titel)}</h1>
      ${b.intro ? `<p class="lead">${esc(b.intro)}</p>` : ""}
      ${k1 || k2 ? `<div class="hero-actions">
        ${k1 ? `<a class="btn btn-gold" href="${esc(k1l)}">${esc(k1)} ${ICON.arrow}</a>` : ""}
        ${k2 ? `<a class="btn btn-ghost" href="${esc(k2l)}">${esc(k2)}</a>` : ""}
      </div>` : ""}
    </div>
  </div>
  ${b.nieuwsTonen !== false && l0 ? `<a class="hero-news" href="nieuws.html#${l0.id}">
    ${img(l0.foto, { alt: "", sizes: "58px" })}
    <div><small>${esc(t("Laatste nieuws"))}</small><span>${esc(l0.kop)}</span></div>
  </a>` : ""}
</section>`;
      },
      cijfers(b) {
        const lijst = arr(heeft(b, "cijfers") ? b.cijfers : vul(STANDAARD.cijfers)).filter(c => c.getal || c.tekst);
        if (!lijst.length) return "";
        return `<section class="stats" aria-label="${esc(t("Vai Avanti in cijfers"))}">
  <div class="wrap">
    <div class="stats-card reveal"${lijst.length !== 4 ? ` style="--n:${lijst.length}"` : ""}>
${lijst.map(c => `      <div class="stat"><strong>${esc(c.getal || "")}</strong><span>${esc(c.tekst || "")}</span></div>`).join("\n")}
    </div>
  </div>
</section>`;
      },
      honden(b) {
        return `<section id="honden">
  <div class="wrap">
    ${head(b, "Onze *honden*")}
    <div class="dogs-grid">
${(D.honden || []).map(dogCard).join("\n")}
    </div>
  </div>
</section>`;
      },
      hondenlijst(b) {
        return `<section class="section-tight">
  <div class="wrap">
    ${b.titel || b.bovenschrift ? head(b, "") : ""}
    <div class="dogs-grid">
${(D.honden || []).map(dogCard).join("\n")}
    </div>
  </div>
</section>`;
      },
      uitnesten(b) {
        const elsewhere = (D.nesten || []).flatMap(l => l.pups.filter(p => !p.dog).map(p => ({ ...p, litter: l })));
        if (!elsewhere.length) return "";
        return `<section class="band section-tight">
  <div class="wrap">
    ${head(b, "", b.linktekst ? `<a class="link-arrow" href="nesten.html">${esc(b.linktekst)} ${ICON.arrow}</a>` : "")}
    <div class="mini-grid">
${elsewhere.map(p => `      <a class="mini reveal" href="nesten.html#${pupAnchor(p)}">${img(p.photos[0], { alt: p.call, sizes: "200px" })}<b>${esc(p.call)}</b><small>${esc(p.name)}<br>${esc(t("{letter}-nest", { letter: p.litter.letter }))} · ${esc(t(p.sex))}${p.country ? " · " + esc(p.country) : ""}</small></a>`).join("\n")}
    </div>
  </div>
</section>`;
      },
      nestenlijst(b) {
        return `${b.verwachtTonen !== false && V.tonen ? `<section class="section-tight" style="padding-bottom:0">
  <div class="wrap">${expectedBand()}</div>
</section>
` : ""}${[...(D.nesten || [])].reverse().map(nestBlok).join("\n")}`;
      },
      verslagen() {
        return archief();
      },
      nieuws(b) {
        const k = D.nieuwsKaarten || [];
        const lees = heeft(b, "leestekst") ? b.leestekst : "Lees het verslag";
        const alle = heeft(b, "linktekst") ? b.linktekst : `Alle ${D.nieuwsAantal || ""} wedstrijdverslagen`;
        const card = (p, cls) => p ? `<a class="news-card ${cls} reveal" href="nieuws.html#${p.id}">
        <div class="media">${img(p.foto, { alt: p.titel, pos: "center 30%", sizes: cls === "featured" ? "(max-width: 980px) 100vw, 55vw" : "(max-width: 980px) 100vw, 20vw" })}</div>
        <div class="news-body">
          <span class="news-tag">${esc(p.titel)} · ${esc(p.datum)}</span>
          <h3>${esc(p.kop)}</h3>
          <p>${esc(p.tekst)}</p>
          ${lees ? `<span class="link-arrow">${esc(lees)} ${ICON.arrow}</span>` : ""}
        </div>
      </a>` : "";
        return `<section class="news" id="nieuws">
  <div class="wrap">
    ${head(b, "Laatste *nieuws*", alle ? `<a class="link-arrow" href="nieuws.html">${esc(alle)} ${ICON.arrow}</a>` : "")}
    <div class="news-grid">
      ${card(k[0], "featured")}
      ${card(k[1], "small")}
      ${card(k[2], "small")}
    </div>
  </div>
</section>`;
      },
      gezondheid(b) {
        return `<section class="dark health" id="gezondheid">
  <div class="wrap health-grid">
    <div class="reveal">
      ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
      <h2>${inline(b.titel || "Gezondheid")}</h2>
      ${b.intro ? `<p class="lead">${esc(b.intro)}</p>` : ""}
      ${knop(b, "Bekijk de resultaten per hond", "honden.html", "btn btn-gold")}
    </div>
    <div class="health-items">
${arr(heeft(b, "punten") ? b.punten : STANDAARD.punten).map(p => `      <div class="health-item reveal"><div class="icon">${ICON[ICONEN[p.icoon]] || ICON.check}</div><h3>${esc(p.titel || "")}</h3>${p.tekst ? `<p>${esc(p.tekst)}</p>` : ""}</div>`).join("\n")}
    </div>
  </div>
</section>`;
      },
      nesten(b) {
        const cards = (D.nesten || []).map(l => `<a class="litter reveal" href="nesten.html#${l.id}" style="text-decoration:none;color:inherit">
      <div class="litter-letter">${esc(l.letter)}</div>
      <h3>${esc(t("{letter}-nest", { letter: l.letter }))}</h3>
      <div class="litter-date">${l.born ? esc(t("Geboren {datum}", { datum: l.born })) : "&nbsp;"}</div>
      <p class="litter-parents">${esc(l.sire)} <span>×</span> ${esc(l.dam)}</p>
      <div class="chips">${(l.pups || []).map(p => `<span class="chip">${esc(String(p.name).replace(/^Vai Avanti /i, ""))} <small>· ${esc(p.call)}</small></span>`).join("")}</div>
    </a>`).join("\n");
        return `<section id="nesten">
  <div class="wrap">
    ${head(b, "Onze *nesten*", (heeft(b, "linktekst") ? b.linktekst : "Alle nesten en pups") ? `<a class="link-arrow" href="nesten.html">${esc(heeft(b, "linktekst") ? b.linktekst : "Alle nesten en pups")} ${ICON.arrow}</a>` : "")}
    <div class="litters">
${cards}
    </div>
    ${V.tonen ? `<div style="margin-top:20px">${expectedBand()}</div>` : ""}
  </div>
</section>`;
      },
      verwacht() {
        return V.tonen ? `<section class="section-tight"><div class="wrap">${expectedBand()}</div></section>` : "";
      },
      overons(b) {
        return `<section class="about" id="over-ons">
  <div class="wrap about-grid">
    <div class="about-media reveal">
      ${b.foto1 ? img(b.foto1, { alt: "", cls: "main", sizes: "(max-width: 980px) 86vw, 40vw" }) : ""}
      ${b.foto2 ? img(b.foto2, { alt: "", cls: "inset", sizes: "(max-width: 980px) 50vw, 25vw" }) : ""}
      ${(heeft(b, "jaartal") ? b.jaartal : "2018") ? `<div class="since"><strong>${esc(heeft(b, "jaartal") ? b.jaartal : "2018")}</strong><small>${esc(heeft(b, "jaartekst") ? b.jaartekst : "Lylo, onze eerste")}</small></div>` : ""}
    </div>
    <div class="about-text reveal">
      ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
      <h2>${inline(b.titel || "Over ons")}</h2>
      ${b.tekst ? `<p>${esc(b.tekst)}</p>` : ""}
      ${b.citaat ? `<blockquote>“${esc(b.citaat)}”<cite>${esc(b.citaatVan || "")}</cite></blockquote>` : ""}
      ${(heeft(b, "knoptekst") ? b.knoptekst : "Lees ons verhaal") ? `<p style="margin-top:28px">${knop(b, "Lees ons verhaal", "over-ons.html", "btn btn-dark")}</p>` : ""}
    </div>
  </div>
</section>`;
      },
      contact(b) {
        return `<section id="contact" class="section-tight">
  <div class="wrap">
    ${contactBlock(b)}
  </div>
</section>`;
      },
      paginakop(b) {
        return pageHero({
          eyebrow: esc(b.bovenschrift || ""), title: inline(b.titel || ""), lead: esc(b.intro || ""), fotos: arr(b.fotos).length ? arr(b.fotos) : arr(b.foto),
          pos: focus(b, "center 40%"), cls: kopKlassen(b), wissel: b.wissel,
          knop: b.knoptekst ? `<p class="kop-knop">${knop(b, "", "contact.html", "btn btn-gold")}</p>` : ""
        });
      },
      team(b) {
        const nameHtml = n => { const parts = String(n || "").split(" "); return parts.length > 1 ? `${esc(parts.slice(0, -1).join(" "))} <em>${esc(parts.slice(-1)[0])}</em>` : esc(n); };
        return `<section class="section-tight">
  <div class="wrap">
${(b.leden || []).map((t, i) => `    <div class="person${i % 2 ? " flip" : ""} reveal">
      <div class="person-photo">${img(t.foto, { alt: t.naam, sizes: "(max-width: 980px) 100vw, 40vw" })}</div>
      <div class="person-text">
        ${t.rol ? `<span class="eyebrow">${esc(t.rol)}</span>` : ""}
        <h2>${nameHtml(t.naam)}</h2>
        ${md(t.tekst)}
      </div>
    </div>`).join("\n")}
  </div>
</section>`;
      },
      tekst(b) {
        return `<section class="section-tight blok-tekst${bgClass(b)}">
  <div class="wrap reveal">
    ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
    ${b.titel ? `<h2>${inline(b.titel)}</h2>` : ""}
    <div class="prose">${md(b.tekst)}</div>
  </div>
</section>`;
      },
      tekstfoto(b) {
        return `<section class="section-tight blok-tekstfoto${bgClass(b)}">
  <div class="wrap tekstfoto${b.fotoRechts ? " rechts" : ""}">
    <div class="tf-foto reveal">${b.foto ? shot(b.foto, { caption: plain(b.titel || ""), sizes: "(max-width: 980px) 100vw, 50vw" }) : ""}</div>
    <div class="tf-tekst reveal">
      ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
      ${b.titel ? `<h2>${inline(b.titel)}</h2>` : ""}
      <div class="prose">${md(b.tekst)}</div>
      ${b.knoptekst ? `<p class="tf-knop">${button(b.knoptekst, b.knoplink, b.achtergrond === "Donker" ? "btn btn-gold" : "btn btn-dark")}</p>` : ""}
    </div>
  </div>
</section>`;
      },
      fotos(b) {
        const g = "blok-" + slug(b.titel || "fotos") + "-" + (b._i || 0);
        return `<section class="section-tight blok-fotos${bgClass(b)}">
  <div class="wrap">
    ${b.titel || b.bovenschrift ? head({ bovenschrift: b.bovenschrift, titel: b.titel }, "") : ""}
    <div class="gallery">
${(b.fotos || []).map(p => "      " + shot(p, { group: g, caption: plain(b.titel || ""), sizes: "(max-width: 640px) 50vw, 25vw" })).join("\n")}
    </div>
  </div>
</section>`;
      },
      citaat(b) {
        return `<section class="section-tight blok-citaat${bgClass(b)}">
  <div class="wrap reveal">
    <blockquote class="groot-citaat">“${esc(b.tekst || "")}”${b.van ? `<cite>${esc(b.van)}</cite>` : ""}</blockquote>
  </div>
</section>`;
      },
      aankondiging(b) {
        if (b.stijl === "Licht") return `<section class="band section-tight">
  <div class="wrap cta-band reveal">
    <div>${b.label ? `<span class="eyebrow">${esc(b.label)}</span>` : ""}<h2>${inline(b.titel || "")}</h2>${b.tekst ? `<p class="lead">${esc(b.tekst)}</p>` : ""}</div>
    ${button(b.knoptekst, b.knoplink, "btn btn-dark")}
  </div>
</section>`;
        return `<section class="section-tight">
  <div class="wrap">
    <div class="expected-band reveal">
      <div class="txt">
        ${b.label ? `<div class="litter-date">${esc(b.label)}</div>` : ""}
        <h2>${inline(b.titel || "")}</h2>
        ${b.tekst ? `<p>${esc(b.tekst)}</p>` : ""}
      </div>
      ${button(b.knoptekst, b.knoplink)}
    </div>
  </div>
</section>`;
      }
    };

    const renderBlock = (b, i) => {
      const fn = R[b && b.type];
      if (!fn) return "";
      const html = fn({ ...vul(b), _i: i });
      const stijl = blokStijl(b);
      return stijl ? html.replace(/^<section\b/, `<section style="${esc(stijl)}"`) : html;
    };
    // Begint de pagina niet met een grote foto, dan krijgt het menu bovenaan een donkere achtergrond
    const renderBlocks = (list, wrap) => {
      list = list || [];
      const spacer = !list.length || !["hero", "paginakop"].includes(list[0].type) ? '<div class="kop-ruimte"></div>\n' : "";
      return spacer + list.map((b, i) => {
        const html = renderBlock(b, i);
        return wrap ? `<div data-blok="${i}" data-label="${esc((BLOKKEN[b.type] || {}).label || b.type)}">${html}</div>` : html;
      }).join("\n\n");
    };

    /* ---------- Vaste pagina's: honden, hond, nesten, nieuws ---------- */
    const reportDate = D.reportDate || (p => String(p.year));
    const pupAnchor = p => "pup-" + slug(p.call);
    const heeftFoto = p => !!(p && imgUrl(p));

    const mention = p => `<a class="mention" href="nieuws.html#${p.id}">
  ${heeftFoto(p.photos[0]) ? img(p.photos[0], { alt: "", sizes: "96px" }) : '<span class="ph"></span>'}
  <span><small>${esc(reportDate(p))}${p.recap ? " · " + esc(t("Seizoensoverzicht")) : ""}</small><b>${esc(p.title)}</b></span>
  ${ICON.arrow}
</a>`;

    const hondBody = d => {
      const honden = D.honden || [], nesten = D.nesten || [];
      const i = Math.max(0, honden.findIndex(x => x.id === d.id));
      const posts = (D.nieuws || []).filter(p => p.dogs.includes(d.id));
      const litter = d.litter && nesten.find(l => l.id === d.litter);
      const asDam = nesten.filter(l => same(l.dam, d.name)), asSire = nesten.filter(l => same(l.sire, d.name));
      const prev = honden[(i - 1 + honden.length) % honden.length] || d, next = honden[(i + 1) % honden.length] || d;
      const gal = `dog-${d.id}`, isReu = d.sex === "Reu";
      const famRow = (label, value, href) => !value ? "" : href
        ? `<a href="${href}"><span><small>${label}</small><span>${esc(value)}</span></span>${ICON.arrow}</a>`
        : `<div class="fam"><span><small>${label}</small><span>${esc(value)}</span></span></div>`;
      const gallery = d.photos.filter(p => p !== d.cover);
      return `<section class="dog-hero">
  <div class="wrap dog-hero-grid">
    <div>
      <div class="crumbs"><a href="honden.html">${esc(t("Onze honden"))}</a><span>/</span><span>${esc(d.call)}</span></div>
      <span class="eyebrow">${esc(t(d.sex))}${d.status ? " · " + esc(d.status) : ""}</span>
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
        <h2 class="sub-label">${esc(t("Gegevens"))}</h2>
        <dl class="facts">
          <div><dt>${esc(t("Geboren"))}</dt><dd>${esc(d.born || "–")}</dd></div>
          <div><dt>${esc(t("Kleur"))}</dt><dd>${esc(d.color || "–")}</dd></div>
          <div><dt>${esc(t("Geslacht"))}</dt><dd>${esc(d.sex ? t(d.sex) : "–")}</dd></div>
          <div><dt>${esc(t("Stamboom"))}</dt><dd>${d.pedigree ? `<a href="${esc(d.pedigree)}" target="_blank" rel="noopener">Breed Archive</a>` : "–"}</dd></div>
        </dl>
      </div>
      ${d.health.length ? `<div class="reveal">
        <h2 class="sub-label">${esc(t("Gezondheid"))}</h2>
        ${healthChips(d.health)}
      </div>` : ""}
      <div class="reveal">
        <h2 class="sub-label">${esc(t("Familie"))}</h2>
        <div class="family">
          ${famRow(t("Vader"), d.sire, d.sireId ? `hond-${d.sireId}.html` : "")}
          ${famRow(t("Moeder"), d.dam, d.damId ? `hond-${d.damId}.html` : "")}
          ${litter ? famRow(t("Geboren in"), `${t("{letter}-nest", { letter: litter.letter })}${litter.born ? ` (${litter.born})` : ""}`, `nesten.html#${litter.id}`) : ""}
          ${asDam.map(l => famRow(t("Moeder van"), `${t("{letter}-nest", { letter: l.letter })}${l.born ? ` (${l.born})` : ""}`, `nesten.html#${l.id}`)).join("\n          ")}
          ${asSire.map(l => famRow(t("Vader van"), `${t("{letter}-nest", { letter: l.letter })}${l.born ? ` (${l.born})` : ""}`, `nesten.html#${l.id}`)).join("\n          ")}
        </div>
      </div>
    </div>
    <div>
      <div class="reveal">
        <h2 class="sub-label">${esc(d.titles.length ? t(d.titles.length === 1 ? "Palmares · {n} titel" : "Palmares · {n} titels", { n: d.titles.length }) : t("Palmares"))}</h2>
        ${d.titles.length
          ? `<ul class="palmares">${d.titles.map(([y, t, p]) => `<li><b>${esc(y)}</b><span>${esc(t)}${p ? ` <small>· ${esc(p)}</small>` : ""}</span></li>`).join("")}</ul>`
          : `<p class="note">${esc(asDam.length || asSire.length ? t("{naam} kreeg een ereplaats als ouder van onze nesten.", { naam: d.call }) : t(isReu ? "{naam} staat nog aan het begin van zijn carrière." : "{naam} staat nog aan het begin van haar carrière.", { naam: d.call }))}</p>`}
      </div>
    </div>
  </div>
</section>

${gallery.length ? `<section class="band section-tight">
  <div class="wrap">
    <div class="section-head reveal"><div><span class="eyebrow">${esc(t("Foto's"))}</span><h2>${inline(t("{naam} in *beeld*", { naam: d.call }))}</h2></div></div>
    <div class="gallery">
${gallery.map(p => "      " + shot(p, { group: gal, caption: `${d.call} (${d.name})`, sizes: "(max-width: 640px) 50vw, 25vw" })).join("\n")}
    </div>
  </div>
</section>` : ""}

${posts.length ? `<section class="section-tight">
  <div class="wrap">
    <div class="section-head reveal">
      <div><span class="eyebrow">${esc(t("In het nieuws"))}</span><h2>${inline(t(posts.length === 1 ? "{n} verslag met *{naam}*" : "{n} verslagen met *{naam}*", { n: posts.length, naam: d.call }))}</h2></div>
      <a class="link-arrow" href="nieuws.html#hond-${d.id}">${esc(t("Toon ze allemaal in het archief"))} ${ICON.arrow}</a>
    </div>
    <div class="mention-list">
${posts.slice(0, 8).map(mention).join("\n")}
    </div>
  </div>
</section>` : ""}

<section class="section-tight" style="padding-top:0">
  <div class="wrap dog-nav">
    <a class="link-arrow" href="hond-${prev.id}.html">${ICON.back} ${esc(prev.call)}</a>
    <a class="link-arrow" href="honden.html">${esc(t("Alle honden"))}</a>
    <a class="link-arrow" href="hond-${next.id}.html">${esc(next.call)} ${ICON.arrow}</a>
  </div>
</section>`;
    };

    const pupCard = p => {
      const d = p.dog && (D.honden || []).find(x => x.id === p.dog);
      const health = p.health.length ? p.health : (d ? d.health : []);
      const pedigree = p.pedigree || (d ? d.pedigree : "");
      const g = pupAnchor(p);
      return `<article class="pup reveal" id="${g}">
      ${shot(p.photos[0], { group: g, caption: `${p.call} (${p.name})`, sizes: "(max-width: 640px) 100vw, 33vw", extra: p.photos.length > 1 ? `<span class="count">${esc(t("{n} foto's", { n: p.photos.length }))}</span>` : "" })}
      ${p.photos.slice(1).map(ph => shot(ph, { group: g, caption: `${p.call} (${p.name})`, hidden: true })).join("")}
      <div class="pup-body">
        <h3>${esc(p.call)}</h3>
        <div class="dog-official">${esc(p.name)}</div>
        <div class="pup-meta">${[p.sex && t(p.sex), p.color].filter(Boolean).map(esc).join(" · ")}${p.country ? ` · ${esc(t("woont in {land}", { land: p.country }))}` : (d ? ` · ${esc(t("bij ons"))}` : "")}</div>
        ${health.length ? healthChips(health) : ""}
        ${p.results.length ? `<ul class="pup-results">${p.results.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
        <div class="pup-links">
          ${d ? `<a class="link-arrow" href="hond-${d.id}.html">${esc(t("Bekijk profiel"))} ${ICON.arrow}</a>` : ""}
          ${pedigree ? `<a class="link-arrow" href="${esc(pedigree)}" target="_blank" rel="noopener">${esc(t("Stamboom"))} ${ICON.arrow}</a>` : ""}
        </div>
      </div>
    </article>`;
    };
    const nestBlok = l => `<section class="litter-block" id="${l.id}">
  <div class="wrap">
    <div class="litter-head reveal">
      <div class="litter-letter">${esc(l.letter)}</div>
      <div>
        <h2>${esc(t("{letter}-nest", { letter: l.letter }))}</h2>
        <div class="meta">${l.born ? `${esc(t("Geboren {datum}", { datum: l.born }))} · ` : ""}${esc(t(l.pups.length === 1 ? "{n} pup op deze site" : "{n} pups op deze site", { n: l.pups.length }))}<br>
          ${esc(l.sire)} × ${l.damId ? `<a href="hond-${l.damId}.html">${esc(l.dam)}</a>` : esc(l.dam)}</div>
        ${l.introMd ? `<div class="litter-intro">${md(l.introMd)}</div>` : ""}
      </div>
      ${heeftFoto(l.photos[0]) ? shot(l.photos[0], { group: "nest-" + l.id, caption: t("{letter}-nest", { letter: l.letter }), sizes: "300px" }) : ""}
    </div>
    <div class="pups">
${l.pups.map(pupCard).join("\n")}
    </div>
  </div>
</section>`;
    // Pagina's die uit blokken bestaan (ook Onze honden, Nesten en Nieuws)
    const pagina = id => (D.paginas || []).find(p => p.id === id);
    const paginaBody = id => renderBlocks((pagina(id) || {}).blokken || []);
    const paginaKop = (id, standaard) => {
      const p = pagina(id), i = p ? p.blokken.findIndex(b => b.type === "paginakop") : -1;
      return i >= 0 ? renderBlock(p.blokken[i], i) : pageHero(standaard);
    };
    const nestenKop = () => paginaKop("nesten", { eyebrow: "Pups &amp; nesten", title: "Onze <em>nesten</em>" });
    const nestenBody = () => paginaBody("nesten");
    const hondenBody = () => paginaBody("honden");

    const verslag = (p, open) => {
      const text = plain(p.body);
      const long = !open && (text.length > 520 || text.split(/\n{2,}/).length > 4);
      const photos = p.photos.filter(heeftFoto);
      const extra = photos.length - 4;
      const info = D.DOG_INFO || {};
      return `<article class="report reveal${p.recap ? " recap" : ""}${photos.length ? "" : " no-photo"}" id="${esc(p.id)}" data-dogs="${p.dogs.join(" ")}">
      ${photos.length ? `<div class="report-media">
        ${shot(photos[0], { group: p.id, caption: p.title, sizes: "(max-width: 980px) 100vw, 340px" })}
        ${photos.length > 1 ? `<div class="thumbs">${photos.slice(1, 4).map((ph, i) => shot(ph, { group: p.id, caption: p.title, sizes: "110px", extra: i === 2 && extra > 0 ? `<span class="count">+${extra}</span>` : "" })).join("")}</div>` : ""}
        ${photos.slice(4).map(ph => shot(ph, { group: p.id, caption: p.title, hidden: true })).join("")}
      </div>` : ""}
      <div class="report-body">
        <span class="report-tag">${p.recap ? esc(t("Seizoensoverzicht")) + " · " : ""}${esc(reportDate(p))}${photos.length ? ` · ${esc(t(photos.length === 1 ? "{n} foto" : "{n} foto's", { n: photos.length }))}` : ""}</span>
        <h3>${esc(p.title)}</h3>
        ${p.dogs.some(k => info[k]) ? `<div class="chips">${p.dogs.filter(k => info[k]).map(k => `<a class="chip" href="${info[k].href}">${esc(info[k].call)}</a>`).join("")}</div>` : ""}
        ${text.trim() ? `<div class="report-text${long ? " clamped" : ""}">${md(p.body)}</div>
        ${long ? `<button class="more-btn" type="button" aria-expanded="false">${esc(t("Lees het volledige verslag"))} ${ICON.down}</button>` : ""}` : ""}
      </div>
    </article>`;
    };
    const nieuwsKop = () => paginaKop("nieuws", { eyebrow: "Nieuws", title: "Van de <em>renbaan</em>" });
    const nieuwsBody = () => paginaBody("nieuws");
    const archief = () => {
      const nieuws = D.nieuws || [], info = D.DOG_INFO || {};
      const years = [...new Set(nieuws.map(p => p.year))].sort((a, b) => b - a);
      const counts = {};
      for (const p of nieuws) for (const k of p.dogs) if (info[k]) counts[k] = (counts[k] || 0) + 1;
      const filterDogs = Object.keys(counts).filter(k => counts[k] >= 3).sort((a, b) => counts[b] - counts[a]);
      return `<div class="news-toolbar" id="archief">
  <div class="wrap">
    <div class="filter-chips" role="group" aria-label="${esc(t("Filter op hond"))}">
      <button type="button" data-filter="alle" aria-pressed="true">${esc(t("Alle"))} <small>${nieuws.length}</small></button>
${filterDogs.map(k => `      <button type="button" data-filter="${k}" aria-pressed="false">${esc(info[k].call)} <small>${counts[k]}</small></button>`).join("\n")}
    </div>
    <nav class="year-links" aria-label="${esc(t("Spring naar jaar"))}"><span>${esc(t("Jaar"))}</span>${years.map(y => `<a href="#jaar-${y}">${y}</a>`).join("")}</nav>
  </div>
</div>
<div class="wrap" id="archive" style="padding-bottom:100px">
${years.map(y => {
        const ps = nieuws.filter(p => p.year === y);
        return `<section class="year-block" id="jaar-${y}">
  <div class="year-head"><h2>${y}</h2><span>${esc(t(ps.length === 1 ? "{n} verslag" : "{n} verslagen", { n: ps.length }))}</span></div>
  <div class="reports">
${ps.map(p => verslag(p)).join("\n")}
  </div>
</section>`;
      }).join("\n")}
  <p class="empty-state" id="archive-empty" hidden>${esc(t("Geen verslagen gevonden voor deze hond."))}</p>
</div>`;
    };
    const nietGevondenBody = heroFoto => `${pageHero({ eyebrow: "404", title: inline(t("Deze pagina is *weggerend*")), lead: esc(t("De pagina die u zoekt bestaat niet (meer). Misschien vindt u het via een van deze pagina's.")), bg: heroFoto })}
<section class="section-tight"><div class="wrap cta-band">
  <a class="btn btn-dark" href="index.html">${esc(t("Naar de startpagina"))} ${ICON.arrow}</a>
  <a class="link-arrow" href="nieuws.html">${esc(t("Wedstrijdverslagen"))} ${ICON.arrow}</a>
</div></section>`;

    return { header, footer, pageHero, dogCard, healthChips, contactBlock, expectedBand, renderBlock, renderBlocks, mailParts,
      hondenBody, hondBody, nestenKop, nestBlok, nestenBody, nieuwsKop, verslag, nieuwsBody, nietGevondenBody, paginaBody, t, taal, blokNieuws: b => R.nieuws(b || {}) };
  }

  return { esc, slug, inline, md, plain, ICON, BLOKKEN, VELDEN, KLEUR_VELDEN, LETTERS, STANDAARD, TALEN, UI_EXTRA, vulIn, bouwModel, createSite, fmtDate, pageFile, arr, themaCss, fontsHref, isKleur };
});
