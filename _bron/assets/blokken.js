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
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.2 8.1 7.5 9 4.3-.9 7.5-4.6 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>'
  };

  /* ---------- Bloktypes: wat Shany kan toevoegen en welke velden ze heeft ----------
     Veldtypes: regel (één regel tekst), tekst (meerdere regels), opmaak (tekst met vet/kopjes/lijstjes),
     foto, fotos (meerdere), aanuit, keuze (opties), lijst (herhaalbare groep velden). */
  const F = {
    bovenschrift: { naam: "bovenschrift", label: "Klein opschrift", type: "regel" },
    titel: { naam: "titel", label: "Titel", type: "regel", hulp: "Zet *sterretjes* rond een woord om het goud en schuin te maken." },
    intro: { naam: "intro", label: "Introtekst", type: "tekst" },
    achtergrond: { naam: "achtergrond", label: "Achtergrond", type: "keuze", opties: ["Wit", "Beige", "Donker"] }
  };
  const BLOKKEN = {
    tekst: { label: "Tekst", omschrijving: "Een titel met een stuk tekst.", velden: [F.bovenschrift, F.titel, { naam: "tekst", label: "Tekst", type: "opmaak" }, F.achtergrond], nieuw: { titel: "Nieuwe titel", tekst: "Schrijf hier je tekst.", achtergrond: "Wit" } },
    tekstfoto: { label: "Tekst met foto", omschrijving: "Tekst naast een grote foto, eventueel met een knop.", velden: [F.bovenschrift, F.titel, { naam: "tekst", label: "Tekst", type: "opmaak" }, { naam: "foto", label: "Foto", type: "foto" }, { naam: "fotoRechts", label: "Foto rechts zetten", type: "aanuit" }, { naam: "knoptekst", label: "Tekst op de knop (mag leeg)", type: "regel" }, { naam: "knoplink", label: "Knop gaat naar", type: "link" }, F.achtergrond], nieuw: { titel: "Nieuwe titel", tekst: "Schrijf hier je tekst.", achtergrond: "Wit" } },
    fotos: { label: "Foto's", omschrijving: "Een fotogalerij. Bezoekers kunnen de foto's groot bekijken.", velden: [F.bovenschrift, F.titel, { naam: "fotos", label: "Foto's", type: "fotos" }, F.achtergrond], nieuw: { titel: "Foto's", fotos: [], achtergrond: "Beige" } },
    citaat: { label: "Citaat", omschrijving: "Een opvallende uitspraak in grote letters.", velden: [{ naam: "tekst", label: "Citaat", type: "tekst" }, { naam: "van", label: "Van wie", type: "regel" }, F.achtergrond], nieuw: { tekst: "Een mooie uitspraak.", van: "", achtergrond: "Beige" } },
    aankondiging: { label: "Aankondiging met knop", omschrijving: "Een opvallende balk met titel, tekst en knop.", velden: [{ naam: "label", label: "Klein opschrift", type: "regel" }, F.titel, { naam: "tekst", label: "Tekst", type: "tekst" }, { naam: "knoptekst", label: "Tekst op de knop", type: "regel" }, { naam: "knoplink", label: "Knop gaat naar", type: "link" }, { naam: "stijl", label: "Stijl", type: "keuze", opties: ["Donker", "Licht"] }], nieuw: { label: "Nieuw", titel: "Iets om aan te kondigen", tekst: "", knoptekst: "Neem contact op", knoplink: "contact.html", stijl: "Donker" } },
    paginakop: { label: "Paginakop met foto", omschrijving: "De donkere kop bovenaan een pagina.", velden: [F.bovenschrift, F.titel, F.intro, { naam: "foto", label: "Achtergrondfoto", type: "foto" }], nieuw: { bovenschrift: "Vai Avanti", titel: "Nieuwe *pagina*", intro: "" } },
    hero: { label: "Grote foto met titel", omschrijving: "Het grote openingsbeeld van de startpagina.", velden: [F.bovenschrift, { ...F.titel, label: "Grote titel" }, F.intro, { naam: "foto", label: "Grote foto", type: "foto" }, { naam: "nieuwsTonen", label: "Laatste nieuws tonen in de foto", type: "aanuit" }], nieuw: { bovenschrift: "Vai Avanti", titel: "Titel", intro: "", nieuwsTonen: true } },
    cijfers: { label: "Kerncijfers", omschrijving: "De vier cijfers (sinds 2020, aantal nesten, titels, MyDogDNA). Worden automatisch berekend.", velden: [], nieuw: {} },
    honden: { label: "Onze honden (overzicht)", omschrijving: "De kaartjes van alle honden. Honden zelf pas je aan in Pages CMS.", velden: [F.bovenschrift, F.titel, F.intro], nieuw: { bovenschrift: "Onze honden", titel: "Het team achter *de naam*", intro: "" } },
    nieuws: { label: "Laatste nieuws", omschrijving: "De drie nieuwste wedstrijdverslagen.", velden: [F.bovenschrift, F.titel], nieuw: { bovenschrift: "Van de renbaan", titel: "Laatste *nieuws*" } },
    gezondheid: { label: "Gezondheid", omschrijving: "Het donkere blok over de gezondheidstesten.", velden: [F.bovenschrift, F.titel, F.intro], nieuw: { bovenschrift: "Gezondheid voorop", titel: "Getest, gedocumenteerd en *transparant*", intro: "" } },
    nesten: { label: "Onze nesten (overzicht)", omschrijving: "De kaartjes van alle nesten, met de verwachte nesten eronder.", velden: [F.bovenschrift, F.titel, F.intro], nieuw: { bovenschrift: "Pups & nesten", titel: "Onze *nesten*", intro: "" } },
    verwacht: { label: "Verwachte nesten", omschrijving: "De aankondiging van de verwachte nesten. De tekst pas je aan bij Instellingen.", velden: [], nieuw: {} },
    overons: { label: "Over ons (kort)", omschrijving: "Twee foto's, een korte tekst en een citaat.", velden: [F.bovenschrift, F.titel, { naam: "tekst", label: "Tekst", type: "tekst" }, { naam: "foto1", label: "Grote foto", type: "foto" }, { naam: "foto2", label: "Kleine foto", type: "foto" }, { naam: "citaat", label: "Citaat", type: "tekst" }, { naam: "citaatVan", label: "Citaat van", type: "regel" }], nieuw: { bovenschrift: "Over ons", titel: "Over *ons*", tekst: "" } },
    team: { label: "Teamleden", omschrijving: "Foto en verhaal per persoon.", velden: [{ naam: "leden", label: "Teamleden", type: "lijst", velden: [{ naam: "naam", label: "Naam", type: "regel" }, { naam: "rol", label: "Rol", type: "regel" }, { naam: "foto", label: "Foto", type: "foto" }, { naam: "tekst", label: "Verhaal", type: "opmaak" }] }], nieuw: { leden: [{ naam: "Naam", rol: "", tekst: "" }] } },
    contact: { label: "Contactformulier", omschrijving: "Contactgegevens en het formulier. De gegevens pas je aan bij Instellingen.", velden: [], nieuw: {} }
  };

  /* ---------- Site-opbouw ---------- */
  function createSite(ctx) {
    const { img, shot, imgUrl } = ctx;
    const D = ctx.data;
    const site = D.site || {};
    const C = site.contact || {};
    const V = site.verwacht || {};
    const mailParts = String(C.email || "").split("@");
    const mailFallback = mailParts.length === 2 ? `${mailParts[0]} [at] ${mailParts[1]}` : "";
    const mailShown = ctx.showMail ? C.email : mailFallback;
    const telHref = "tel:" + String(C.telefoon || "").replace(/[^\d+]/g, "");
    const menu = D.menu || [];

    const header = active => `<header class="site-header">
  <nav class="wrap nav" aria-label="Hoofdmenu">
    <a class="brand" href="index.html" aria-label="Vai Avanti – startpagina"><span class="brand-logo" role="img" aria-label="Vai Avanti"></span></a>
    <ul class="nav-links">
${menu.map(m => `      <li><a href="${esc(m.href)}"${m.key === active ? ' class="active" aria-current="page"' : ""}>${esc(m.label)}</a></li>`).join("\n")}
    </ul>
    <a class="btn nav-cta" href="contact.html"${active === "contact" ? ' aria-current="page"' : ""}>Contact</a>
    <button class="menu-toggle" aria-label="Menu openen" aria-expanded="false">${ICON.menu}</button>
  </nav>
</header>`;

    const footer = () => `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <span class="brand-logo" role="img" aria-label="Vai Avanti"></span>
        <p>Whippetkennel uit ${esc(String(C.plaats || "").replace(/^\d+\s*/, "").replace(/,.*$/, ""))}, België. Gezonde racewhippets, gefokt met passie sinds 2020.</p>
        <div class="socials">
          ${C.instagram ? `<a href="${esc(C.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.insta}</a>` : ""}
          ${C.facebook ? `<a href="${esc(C.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>` : ""}
          <a href="contact.html" data-mail-link aria-label="E-mail">${ICON.mail}</a>
        </div>
      </div>
      <div>
        <h4>Ontdek</h4>
        <ul>
${menu.filter(m => m.fixed).map(m => `          <li><a href="${esc(m.href)}">${esc(m.label === "Nieuws" ? "Wedstrijdverslagen" : m.label)}</a></li>`).join("\n")}
          <li><a href="index.html#gezondheid">Gezondheid</a></li>
        </ul>
      </div>
      <div>
        <h4>Kennel</h4>
        <ul>
${menu.filter(m => !m.fixed).map(m => `          <li><a href="${esc(m.href)}">${esc(m.label)}</a></li>`).join("\n")}
          ${V.tonen ? `<li><a href="nesten.html#verwacht">${esc(V.label || "Verwachte nesten")}</a></li>` : ""}
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li>${esc(C.plaats)}</li>
          <li><a href="${telHref}">${esc(C.telefoon)}</a></li>
          <li><a href="contact.html" data-mail-link data-mail>${esc(mailShown)}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Vai Avanti · Kennelnaam erkend door de KMSH</span>
      <a href="#top" style="color:inherit;text-decoration:none">Terug naar boven ↑</a>
    </div>
  </div>
</footer>`;

    const pageHero = ({ eyebrow, title, lead = "", bg = "", pos = "", crumbs = "" }) => `<section class="page-hero">
  ${bg && imgUrl(bg) ? `<div class="bg">${img(bg, { pos, sizes: "100vw", eager: true })}</div>` : ""}
  <div class="wrap">
    ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ""}
    <span class="eyebrow">${eyebrow}</span>
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ""}
  </div>
</section>`;

    const dogCard = d => `<a class="dog-card reveal" href="hond-${d.id}.html">
  <div class="dog-media">
    ${img(d.cover, { alt: `${d.call} (${d.name})`, pos: d.pos, sizes: "(max-width: 640px) 100vw, 33vw" })}
    <div class="badges">${d.sex ? `<span class="badge">${esc(d.sex)}</span>` : ""}${d.status ? `<span class="badge gold">${esc(d.status)}</span>` : ""}</div>
  </div>
  <div class="dog-body">
    <h3>${esc(d.call)}</h3>
    <div class="dog-official">${esc(d.name)}</div>
    <div class="dog-meta">${[d.born && "Geboren " + d.born, d.color].filter(Boolean).map(esc).join(" · ")}</div>
    ${d.highlight ? `<div class="dog-highlight">${ICON.trophy}<span>${esc(d.highlight)}</span></div>` : ""}
    <div class="dog-more"><span class="link-arrow">Bekijk profiel ${ICON.arrow}</span></div>
  </div>
</a>`;

    const healthChips = list => `<div class="chips">${list.map(h => `<span class="chip">${ICON.check}${esc(h)}</span>`).join("")}</div>`;

    const contactBlock = () => `<div class="contact-card reveal">
  <div class="contact-info dark">
    <span class="eyebrow">Contact</span>
    <h2>Kom <em>kennismaken</em></h2>
    <p class="lead">Vragen over onze honden of over onze nesten? Stuur ons een bericht of bel ons gerust.</p>
    <ul class="contact-list">
      <li><a href="${telHref}"><span class="icon">${ICON.phone}</span><div><small>Telefoon</small><span>${esc(C.telefoon)}</span></div></a></li>
      <li><a href="contact.html" data-mail-link><span class="icon">${ICON.mail}</span><div><small>E-mail</small><span data-mail>${esc(mailShown)}</span></div></a></li>
      ${C.instagram ? `<li><a href="${esc(C.instagram)}" target="_blank" rel="noopener"><span class="icon">${ICON.insta}</span><div><small>Instagram</small><span>@${esc(String(C.instagram).replace(/\/+$/, "").split("/").pop())}</span></div></a></li>` : ""}
      <li><div><span class="icon">${ICON.pin}</span><div><small>Locatie</small><span>${esc(C.plaats)}</span></div></div></li>
    </ul>
  </div>
  <form class="contact-form" id="contact-form">
    <h3>Stuur ons een bericht</h3>
    <p>We antwoorden zo snel mogelijk.</p>
    <div class="row">
      <label>Naam<input id="naam" name="naam" required autocomplete="name"></label>
      <label>E-mailadres<input id="email" name="email" type="email" required autocomplete="email"></label>
    </div>
    <label>Onderwerp
      <select name="onderwerp" id="onderwerp">
        <option>Informatie over onze nesten</option>
        <option>Vraag over onze honden</option>
        <option>Iets anders</option>
      </select>
    </label>
    <label>Bericht<textarea id="bericht" name="bericht" required></textarea></label>
    <div class="hp" aria-hidden="true"><label>Laat dit leeg<input type="checkbox" id="botcheck" name="botcheck" tabindex="-1" autocomplete="off"></label></div>
    <div id="captcha-slot"></div>
    <div class="form-foot">
      <small id="form-status" aria-live="polite"></small>
      <button class="btn btn-dark" type="submit" id="form-submit">Verstuur bericht ${ICON.arrow}</button>
    </div>
  </form>
</div>`;

    const expectedBand = () => V.tonen ? `<div class="expected-band reveal" id="verwacht">
  <div class="litter-letter">${esc((String(V.label || "").match(/\d{4}/) || ["Nieuw"])[0])}</div>
  <div class="txt">
    <div class="litter-date">${esc(V.label || "")}</div>
    <h2>${inline(V.titel || "")}</h2>
    <p>${esc(V.tekst || "")}</p>
  </div>
  <a class="btn btn-gold" href="contact.html#nesten">Informeer naar de nesten ${ICON.arrow}</a>
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

    /* ---------- De bloktypes ---------- */
    const R = {
      hero(b) {
        const l0 = D.nieuwsKaarten && D.nieuwsKaarten[0];
        return `<section class="hero">
  <div class="hero-media">${img(b.foto, { alt: "", sizes: "100vw", eager: true })}</div>
  <div class="wrap">
    <div class="hero-content">
      ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
      <h1>${inline(b.titel)}</h1>
      ${b.intro ? `<p class="lead">${esc(b.intro)}</p>` : ""}
      <div class="hero-actions">
        <a class="btn btn-gold" href="honden.html">Ontmoet onze honden ${ICON.arrow}</a>
        <a class="btn btn-ghost" href="nesten.html${V.tonen ? "#verwacht" : ""}">${esc(V.tonen && V.label ? V.label : "Onze nesten")}</a>
      </div>
    </div>
  </div>
  ${b.nieuwsTonen !== false && l0 ? `<a class="hero-news" href="nieuws.html#${l0.id}">
    ${img(l0.foto, { alt: "", sizes: "58px" })}
    <div><small>Laatste nieuws</small><span>${esc(l0.kop)}</span></div>
  </a>` : ""}
</section>`;
      },
      cijfers() {
        const letters = (D.nesten || []).map(l => l.letter);
        const nestList = letters.length > 1 ? letters.slice(0, -1).join("-, ") + "- en " + letters.slice(-1) : letters.join("");
        return `<section class="stats" aria-label="Vai Avanti in cijfers">
  <div class="wrap">
    <div class="stats-card reveal">
      <div class="stat"><strong>2020</strong><span>Kennelnaam erkend door de KMSH</span></div>
      <div class="stat"><strong>${letters.length}</strong><span>Nesten gefokt: het ${esc(nestList)}-nest</span></div>
      <div class="stat"><strong>${D.titleCount || 0}</strong><span>Titels en ereplaatsen van onze honden</span></div>
      <div class="stat"><strong>272</strong><span>MyDogDNA-checkpoints, allemaal clear</span></div>
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
      nieuws(b) {
        const k = D.nieuwsKaarten || [];
        const card = (p, cls) => p ? `<a class="news-card ${cls} reveal" href="nieuws.html#${p.id}">
        <div class="media">${img(p.foto, { alt: p.titel, pos: "center 30%", sizes: cls === "featured" ? "(max-width: 980px) 100vw, 55vw" : "(max-width: 980px) 100vw, 20vw" })}</div>
        <div class="news-body">
          <span class="news-tag">${esc(p.titel)} · ${esc(p.datum)}</span>
          <h3>${esc(p.kop)}</h3>
          <p>${esc(p.tekst)}</p>
          <span class="link-arrow">Lees het verslag ${ICON.arrow}</span>
        </div>
      </a>` : "";
        return `<section class="news" id="nieuws">
  <div class="wrap">
    ${head(b, "Laatste *nieuws*", `<a class="link-arrow" href="nieuws.html">Alle ${D.nieuwsAantal || ""} wedstrijdverslagen ${ICON.arrow}</a>`)}
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
      <a class="btn btn-gold" href="honden.html">Bekijk de resultaten per hond ${ICON.arrow}</a>
    </div>
    <div class="health-items">
      <div class="health-item reveal"><div class="icon">${ICON.dna}</div><h3>DNA-testen</h3><p>Myostatin deficiency en Factor VII deficiency: N/N (normal).</p></div>
      <div class="health-item reveal"><div class="icon">${ICON.heart}</div><h3>Hart &amp; rug</h3><p>Hartonderzoek en rugscreening (LTV en SP) bij onze fokdieren.</p></div>
      <div class="health-item reveal"><div class="icon">${ICON.clip}</div><h3>Heupen &amp; ellebogen</h3><p>Officieel gescreend, met resultaten tot Excellent / A1.</p></div>
      <div class="health-item reveal"><div class="icon">${ICON.shield}</div><h3>MyDogDNA</h3><p>Volledige DNA-screening: clear op alle 272 checkpoints.</p></div>
    </div>
  </div>
</section>`;
      },
      nesten(b) {
        const cards = (D.nesten || []).map(l => `<a class="litter reveal" href="nesten.html#${l.id}" style="text-decoration:none;color:inherit">
      <div class="litter-letter">${esc(l.letter)}</div>
      <h3>${esc(l.letter)}-nest</h3>
      <div class="litter-date">${l.born ? "Geboren " + esc(l.born) : "&nbsp;"}</div>
      <p class="litter-parents">${esc(l.sire)} <span>×</span> ${esc(l.dam)}</p>
      <div class="chips">${(l.pups || []).map(p => `<span class="chip">${esc(String(p.name).replace(/^Vai Avanti /i, ""))} <small>· ${esc(p.call)}</small></span>`).join("")}</div>
    </a>`).join("\n");
        return `<section id="nesten">
  <div class="wrap">
    ${head(b, "Onze *nesten*", `<a class="link-arrow" href="nesten.html">Alle nesten en pups ${ICON.arrow}</a>`)}
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
      <div class="since"><strong>2018</strong><small>Lylo, onze eerste</small></div>
    </div>
    <div class="about-text reveal">
      ${b.bovenschrift ? `<span class="eyebrow">${esc(b.bovenschrift)}</span>` : ""}
      <h2>${inline(b.titel || "Over ons")}</h2>
      ${b.tekst ? `<p>${esc(b.tekst)}</p>` : ""}
      ${b.citaat ? `<blockquote>“${esc(b.citaat)}”<cite>${esc(b.citaatVan || "")}</cite></blockquote>` : ""}
      <p style="margin-top:28px"><a class="btn btn-dark" href="over-ons.html">Lees ons verhaal ${ICON.arrow}</a></p>
    </div>
  </div>
</section>`;
      },
      contact() {
        return `<section id="contact" class="section-tight">
  <div class="wrap">
    ${contactBlock()}
  </div>
</section>`;
      },
      paginakop(b) {
        return pageHero({ eyebrow: esc(b.bovenschrift || ""), title: inline(b.titel || ""), lead: esc(b.intro || ""), bg: b.foto, pos: "center 40%" });
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
      return fn({ ...b, _i: i });
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

    return { header, footer, pageHero, dogCard, healthChips, contactBlock, expectedBand, renderBlock, renderBlocks, mailParts };
  }

  return { esc, slug, inline, md, plain, ICON, BLOKKEN, createSite };
});
