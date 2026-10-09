/* Beheer Vai Avanti
   Alles van de site aanpassen met een live voorbeeld: pagina's (blokken), wedstrijdverslagen, honden,
   nesten en instellingen. Opslaan gaat in één keer naar GitHub; daarna bouwt GitHub de site (± 1 minuut).
   Aanmelden met een wachtwoord: de koppelcode (GitHub-token) staat versleuteld in sleutel.json. */
(() => {
  "use strict";

  const REPO = { owner: "vercauterenkeanu-create", repo: "website", branch: "main" };
  const API = "https://api.github.com";
  const SITE_ROOT = new URL("../", location.href).href;
  const CODE_OP_TOESTEL = "va-beheer-koppelcode";
  const SLEUTEL_PAD = "_bron/beheer/sleutel.json";
  const { esc, slug, BLOKKEN, VELDEN, KLEUR_VELDEN, LETTERS, TALEN: VA_TALEN, bouwModel, createSite, fmtDate, pageFile, themaCss, fontsHref, isKleur } = window.VA;
  const LIVE = REPO.branch, CONCEPT = "concept";

  const VASTE_PAGINAS = ["start", "honden", "nesten", "nieuws", "over-ons", "contact"];
  const GERESERVEERD = new Set(["index", "honden", "nesten", "nieuws", "404", "beheer", "start", "contact", "over-ons", "assets", "img", "media"]);
  const INHOUD_TYPES = ["tekst", "tekstfoto", "fotos", "citaat", "aankondiging", "paginakop"];
  const SITE_TYPES = ["hero", "cijfers", "honden", "hondenlijst", "uitnesten", "nieuws", "verslagen", "gezondheid", "nesten", "nestenlijst", "verwacht", "overons", "team", "contact"];
  // Kleur die het kleurvakje toont zolang er niets gekozen is
  const STANDAARD_KLEUR = { kleurAchtergrond: "#ffffff", kleurTekst: "#1d1a15", kleurAccent: "#c9a052", accent: "#c9a052", donker: "#0f0d0a", licht: "#fffcf6", beige: "#f6f1e7", tekst: "#1d1a15" };
  const SECTIES = [["paginas", "Pagina's"], ["nieuws", "Verslagen"], ["honden", "Honden"], ["nesten", "Nesten"], ["instellingen", "Instellingen"]];

  const I = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    greep: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    op: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    neer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    links: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    weg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    terug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    extern: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    ongedaan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    tandwiel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
    foto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/></svg>',
    zoek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  /* ---------- Toestand ---------- */
  const S = {
    token: null, demo: false, data: null,
    bestanden: {},          // "inhoud/..." -> { data, sha }
    origineel: {},          // "inhoud/..." -> JSON-tekst zoals geladen/opgeslagen
    nieuw: new Set(), verwijderd: new Set(),
    sectie: "paginas", pagina: "inhoud/paginas/start.json", blok: null, paginaInst: false,
    item: { nieuws: null, honden: null, nesten: null },
    zoek: "",
    uploads: {},            // "/media/x.jpg" -> { blob, url, opgeslagen }
    geschiedenis: [],
    weergave: "computer", tab: "bewerken",
    status: { tekst: "Alles staat online", soort: "" },
    bronTak: LIVE,          // waar de inhoud vandaan komt: main (= online) of het concept
    conceptVoor: false,     // staat er in het concept iets dat nog niet online is?
    open: new Set(),        // opengeklapte groepen in het paneel
    naarInstelling: ""      // na een klik op menu/voettekst in het voorbeeld
  };
  const opslag = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privévenster */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* privévenster */ } }
  };
  const kloon = o => JSON.parse(JSON.stringify(o));
  const normaalKleur = c => { c = String(c).trim().toLowerCase(); return c.length === 4 ? "#" + [...c.slice(1)].map(x => x + x).join("") : c; };
  const $ = (sel, root = document) => root.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v === null || v === undefined) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const vandaag = () => new Date().toISOString().slice(0, 10);

  /* ---------- GitHub ---------- */
  async function gh(pad, opts = {}) {
    const url = `${API}/repos/${REPO.owner}/${REPO.repo}${pad ? "/" + pad : ""}`;
    const token = opts.token || S.token;
    const res = await fetch(url, {
      method: opts.method || "GET", cache: "no-store",
      headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      const e = new Error(`GitHub antwoordde ${res.status}`);
      e.status = res.status;
      try { e.detail = (await res.json()).message; } catch (x) { /* geen json */ }
      throw e;
    }
    return res.status === 204 ? null : res.json();
  }
  const bytesNaarB64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const b64NaarBytes = b64 => Uint8Array.from(atob(b64.replace(/\s/g, "")), c => c.charCodeAt(0));
  const b64NaarTekst = b64 => new TextDecoder().decode(b64NaarBytes(b64));
  const tekstNaarB64 = t => bytesNaarB64(new TextEncoder().encode(t));

  async function bewaarBestanden(bestanden, weg, bericht, token, tak = LIVE) {
    const ref = await gh(`git/ref/heads/${tak}`, { token });
    const vorige = await gh(`git/commits/${ref.object.sha}`, { token });
    const boom = [];
    for (const b of bestanden) {
      const content = b.blob ? bytesNaarB64(new Uint8Array(await b.blob.arrayBuffer())) : tekstNaarB64(b.tekst);
      const blob = await gh("git/blobs", { method: "POST", body: { content, encoding: "base64" }, token });
      b.sha = blob.sha;
      boom.push({ path: b.pad, mode: "100644", type: "blob", sha: blob.sha });
    }
    for (const p of weg) boom.push({ path: p, mode: "100644", type: "blob", sha: null });
    const nieuweBoom = await gh("git/trees", { method: "POST", body: { base_tree: vorige.tree.sha, tree: boom }, token });
    const commit = await gh("git/commits", { method: "POST", body: { message: bericht, tree: nieuweBoom.sha, parents: [ref.object.sha] }, token });
    await gh(`git/refs/heads/${tak}`, { method: "PATCH", body: { sha: commit.sha, force: false }, token });
    return commit.sha;
  }

  /* ---------- Concept en publiceren ----------
     Opslaan bewaart in de tak "concept" (niet online). Publiceren zet het concept in "main";
     GitHub bouwt dan de site. Wijzigingen die intussen online kwamen (bv. via Pages CMS) gaan mee in het concept. */
  async function refVan(tak) {
    try { return await gh(`git/ref/heads/${tak}`); } catch (e) { if (e.status === 404) return null; throw e; }
  }
  const vergelijk = () => gh(`compare/${LIVE}...${CONCEPT}`);
  const haalLiveBinnen = () => gh("merges", { method: "POST", body: { base: CONCEPT, head: LIVE, commit_message: "Online versie meegenomen in het concept" } });
  async function maakConceptKlaar() {
    const live = await gh(`git/ref/heads/${LIVE}`);
    const concept = await refVan(CONCEPT);
    if (!concept) { await gh("git/refs", { method: "POST", body: { ref: `refs/heads/${CONCEPT}`, sha: live.object.sha } }); return; }
    if (concept.object.sha === live.object.sha) return;
    const v = await vergelijk();
    if (v.ahead_by === 0) await gh(`git/refs/heads/${CONCEPT}`, { method: "PATCH", body: { sha: live.object.sha, force: true } });
    else if (v.behind_by > 0) await haalLiveBinnen();
  }
  async function publiceerConcept() {
    const live = await gh(`git/ref/heads/${LIVE}`), concept = await refVan(CONCEPT);
    if (!concept || concept.object.sha === live.object.sha) return null;
    const v = await vergelijk();
    if (v.ahead_by === 0) return null;
    if (v.behind_by === 0) {
      await gh(`git/refs/heads/${LIVE}`, { method: "PATCH", body: { sha: concept.object.sha, force: false } });
      return concept.object.sha;
    }
    const m = await gh("merges", { method: "POST", body: { base: LIVE, head: CONCEPT, commit_message: "Gepubliceerd via beheer" } });
    await gh(`git/refs/heads/${CONCEPT}`, { method: "PATCH", body: { sha: m.sha, force: false } });
    return m.sha;
  }

  /* ---------- Wachtwoord <-> koppelcode ---------- */
  async function sleutelUit(wachtwoord, salt, iteraties) {
    const basis = await crypto.subtle.importKey("raw", new TextEncoder().encode(wachtwoord), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iteraties, hash: "SHA-256" }, basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function versleutel(code, wachtwoord) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iteraties = 600000;
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sleutelUit(wachtwoord, salt, iteraties), new TextEncoder().encode(code));
    return { versie: 1, iteraties, salt: bytesNaarB64(salt), iv: bytesNaarB64(iv), data: bytesNaarB64(new Uint8Array(data)) };
  }
  async function ontsleutel(s, wachtwoord) {
    const sleutel = await sleutelUit(wachtwoord, b64NaarBytes(s.salt), s.iteraties);
    const code = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64NaarBytes(s.iv) }, sleutel, b64NaarBytes(s.data));
    return new TextDecoder().decode(code);
  }
  async function controleerCode(code) {
    const repo = await gh("", { token: code });
    if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error("geen schrijfrechten"), { status: 403 });
  }

  /* ---------- Inhoud laden ---------- */
  async function laad() {
    S.data = await (await fetch("data.json", { cache: "no-store" })).json();
    S.bestanden = {};
    for (const [pad, b] of Object.entries(S.data.bestanden)) S.bestanden[pad] = { data: kloon(b.inhoud), sha: b.sha };
    S.bronTak = LIVE; S.conceptVoor = false;
    if (S.token && !S.demo) {
      // Staat er een concept klaar dat nog niet online is? Dan werken we daarop verder.
      const live = await gh(`git/ref/heads/${LIVE}`);
      let bron = live.object.sha;
      const concept = await refVan(CONCEPT);
      if (concept && concept.object.sha !== live.object.sha) {
        const v = await vergelijk();
        if (v.ahead_by > 0) {
          S.bronTak = CONCEPT; S.conceptVoor = true; bron = concept.object.sha;
          if (v.behind_by > 0) {
            try { const m = await haalLiveBinnen(); if (m && m.sha) bron = m.sha; }
            catch (e) { if (e.status !== 409) throw e; melding("Let op: het concept botst met een wijziging die intussen online kwam. Laat het aan Keanu weten."); }
          }
        }
      }
      // Is er sinds de laatste bouw iets veranderd? Haal dan enkel die bestanden opnieuw op.
      if (bron !== S.data.commit) {
        const boom = await gh(`git/trees/${bron}?recursive=1`);
        const nu = Object.fromEntries(boom.tree.filter(t => t.type === "blob" && /^inhoud\/.+\.json$/.test(t.path)).map(t => [t.path, t.sha]));
        for (const pad of Object.keys(S.bestanden)) if (!(pad in nu)) delete S.bestanden[pad];
        await Promise.all(Object.entries(nu).filter(([pad, sha]) => !S.bestanden[pad] || S.bestanden[pad].sha !== sha).map(async ([pad, sha]) => {
          const blob = await gh(`git/blobs/${sha}`);
          S.bestanden[pad] = { data: JSON.parse(b64NaarTekst(blob.content)), sha };
        }));
      }
    }
    S.nieuw = new Set(); S.verwijderd = new Set();
    onthoudOrigineel();
    if (!S.bestanden[S.pagina]) S.pagina = "inhoud/paginas/start.json";
  }
  const tekstVan = d => JSON.stringify(d, null, 2) + "\n";
  function onthoudOrigineel() { S.origineel = Object.fromEntries(Object.entries(S.bestanden).map(([p, b]) => [p, tekstVan(b.data)])); }
  const actief = pad => !!S.bestanden[pad] && !S.verwijderd.has(pad);
  const bestandenIn = map => Object.keys(S.bestanden).filter(p => p.startsWith(`inhoud/${map}/`) && actief(p));
  const idVan = pad => pad.split("/").pop().replace(/\.json$/, "");
  const raw = () => {
    const uit = { site: (S.bestanden["inhoud/site.json"] || { data: {} }).data, paginas: {}, honden: {}, nesten: {}, nieuws: {} };
    for (const map of ["paginas", "honden", "nesten", "nieuws"]) for (const p of bestandenIn(map)) uit[map][idVan(p)] = S.bestanden[p].data;
    return kloon(uit);
  };
  function wijzigingen() {
    const bestanden = [], weg = [];
    for (const [pad, b] of Object.entries(S.bestanden)) {
      if (S.verwijderd.has(pad)) { if (!S.nieuw.has(pad)) weg.push(pad); continue; }
      const t = tekstVan(b.data);
      if (t !== S.origineel[pad]) bestanden.push({ pad, tekst: t, oudeSha: S.nieuw.has(pad) ? null : b.sha });
    }
    const gebruikt = JSON.stringify(Object.entries(S.bestanden).filter(([p]) => !S.verwijderd.has(p)).map(([, b]) => b.data));
    for (const [p, u] of Object.entries(S.uploads)) if (!u.opgeslagen && gebruikt.includes(`"${p}"`)) bestanden.push({ pad: p.slice(1), blob: u.blob, upload: p });
    return { bestanden, weg };
  }
  const isVuil = () => { const w = wijzigingen(); return w.bestanden.length + w.weg.length > 0; };

  /* ---------- Ongedaan maken ---------- */
  // Typen in hetzelfde veld telt als één stap; elke andere wijziging is een eigen stap.
  let laatsteMoment = 0, laatsteSleutel = null;
  function voorWijziging(paden, sleutel) {
    const nu = Date.now();
    if (!sleutel || sleutel !== laatsteSleutel || nu - laatsteMoment > 1500) {
      S.geschiedenis.push({
        paden: Object.fromEntries(paden.map(p => [p, S.bestanden[p] ? tekstVan(S.bestanden[p].data) : null])),
        verwijderd: [...S.verwijderd], nieuw: [...S.nieuw], nav: { sectie: S.sectie, pagina: S.pagina, item: { ...S.item } }
      });
      if (S.geschiedenis.length > 80) S.geschiedenis.shift();
    }
    laatsteMoment = nu; laatsteSleutel = sleutel || null;
  }
  function ongedaanMaken() {
    const stap = S.geschiedenis.pop();
    if (!stap) return melding("Er is niets meer om ongedaan te maken.");
    for (const [p, t] of Object.entries(stap.paden)) {
      if (t === null) delete S.bestanden[p];
      else if (S.bestanden[p]) S.bestanden[p].data = JSON.parse(t);
      else S.bestanden[p] = { data: JSON.parse(t), sha: null };
    }
    S.verwijderd = new Set(stap.verwijderd); S.nieuw = new Set(stap.nieuw);
    S.sectie = stap.nav.sectie; S.pagina = actief(stap.nav.pagina) ? stap.nav.pagina : "inhoud/paginas/start.json";
    S.item = { ...stap.nav.item };
    for (const k of Object.keys(S.item)) if (S.item[k] && !actief(S.item[k])) S.item[k] = null;
    if (S.blok !== null && !(paginaData().blokken || [])[S.blok]) S.blok = null;
    laatsteMoment = 0; laatsteSleutel = null;
    tekenAlles();
  }
  function gewijzigd(volledig) { werkStatusBij(); vernieuwVoorbeeld(volledig); }

  /* ---------- Pagina's ---------- */
  const paginaData = () => S.bestanden[S.pagina].data;
  const paginaNaam = pad => (S.bestanden[pad] && S.bestanden[pad].data.titel) || idVan(pad);
  const paginaVolgorde = (a, b) => (VASTE_PAGINAS.indexOf(idVan(a)) + 1 || 99) - (VASTE_PAGINAS.indexOf(idVan(b)) + 1 || 99) || paginaNaam(a).localeCompare(paginaNaam(b));
  function linkOpties() {
    return [
      ...bestandenIn("paginas").sort(paginaVolgorde).map(p => ({ label: paginaNaam(p), href: pageFile(idVan(p)) })),
      { label: "Verwachte nesten (op Nesten)", href: "nesten.html#verwacht" }, { label: "Gezondheid (op de startpagina)", href: "index.html#gezondheid" },
      { label: "Contact, vraag over nesten", href: "contact.html#nesten" }, { label: "Contact, vraag over honden", href: "contact.html#honden" },
      ...bestandenIn("honden").map(p => ({ label: `Hond: ${S.bestanden[p].data.roepnaam || idVan(p)}`, href: `hond-${slug(idVan(p))}.html` }))
    ];
  }

  /* ---------- Foto's ---------- */
  function fotoUrl(p, groot) {
    if (!p) return "";
    if (S.uploads[p]) return S.uploads[p].url;
    const m = S.data.mediaInfo[p];
    if (m) return SITE_ROOT + (groot ? "img/" : "img/t/") + m.name + ".webp";
    return `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${S.bronTak}${p}`;
  }
  function vImg(p, { alt = "", cls = "", pos = "", sizes = "(max-width: 640px) 100vw, 50vw" } = {}) {
    if (!p) return `<span class="no-photo${cls ? " " + cls : ""}"></span>`;
    const m = S.data.mediaInfo[p];
    const srcset = m && !S.uploads[p] ? ` srcset="img/t/${m.name}.webp 640w, img/${m.name}.webp 1600w" sizes="${sizes}"` : "";
    return `<img src="${esc(fotoUrl(p))}"${srcset} alt="${esc(alt)}" loading="lazy"${cls ? ` class="${cls}"` : ""}${pos ? ` style="object-position:${esc(pos)}"` : ""}>`;
  }
  const vShot = (p, { cls = "shot", pos = "", extra = "", hidden = false, sizes } = {}) => hidden ? "" : `<div class="${cls}">${vImg(p, { pos, sizes })}${extra}</div>`;

  async function verwerkFoto(bestand) {
    let beeld;
    try { beeld = await createImageBitmap(bestand, { imageOrientation: "from-image" }); }
    catch (e) { throw new Error(`"${bestand.name}" kan niet gelezen worden. Kies een JPG- of PNG-foto.`); }
    const k = Math.min(1, 2000 / Math.max(beeld.width, beeld.height));
    const c = document.createElement("canvas");
    c.width = Math.round(beeld.width * k); c.height = Math.round(beeld.height * k);
    c.getContext("2d").drawImage(beeld, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.86));
    const basis = slug(bestand.name.replace(/\.[^.]+$/, "")).slice(0, 40) || "foto";
    const stempel = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    let p = `/media/${basis}-${stempel}.jpg`, n = 2;
    while (S.uploads[p] || S.data.mediaInfo[p]) p = `/media/${basis}-${stempel}-${n++}.jpg`;
    S.uploads[p] = { blob, url: URL.createObjectURL(blob) };
    return p;
  }
  function kiesBestanden(meerdere) {
    return new Promise(resolve => {
      const input = h("input", { type: "file", accept: "image/*", multiple: meerdere || null, style: "display:none" });
      input.addEventListener("change", async () => {
        const uit = [], vorige = S.status;
        werkStatusBij(input.files.length > 1 ? "Foto's worden klaargemaakt…" : "Foto wordt klaargemaakt…", "bezig");
        for (const f of input.files) { try { uit.push(await verwerkFoto(f)); } catch (e) { melding(e.message); } }
        input.remove();
        werkStatusBij(vorige.soort === "bezig" ? "" : vorige.tekst, vorige.soort === "bezig" ? "" : vorige.soort);
        resolve(uit);
      });
      document.body.append(input);
      input.click();
    });
  }
  // Waar staat elke foto? -> Map pad -> ["Flappie", "WM Revanche", ...], in de volgorde van de site (nieuwste verslagen eerst)
  function fotoGebruik() {
    const gebruik = new Map();
    const voeg = (p, naam) => { if (typeof p !== "string" || !p.startsWith("/media/")) return; if (!gebruik.has(p)) gebruik.set(p, []); if (naam && !gebruik.get(p).includes(naam)) gebruik.get(p).push(naam); };
    const zoekIn = (o, naam) => { if (typeof o === "string") voeg(o, naam); else if (Array.isArray(o)) o.forEach(x => zoekIn(x, naam)); else if (o && typeof o === "object") Object.values(o).forEach(x => zoekIn(x, naam)); };
    const data = map => bestandenIn(map).map(p => S.bestanden[p].data);
    data("nieuws").sort((a, b) => String(b.datum).localeCompare(String(a.datum))).forEach(d => zoekIn(d, d.titel));
    data("honden").forEach(d => zoekIn(d, d.roepnaam));
    data("nesten").forEach(d => { zoekIn(d.foto, `${d.letter}-nest`); (d.pups || []).forEach(p => zoekIn(p, p.roepnaam || p.naam)); });
    bestandenIn("paginas").forEach(p => zoekIn(S.bestanden[p].data, paginaNaam(p)));
    return gebruik;
  }
  function kiesBestaandeFoto() {
    return new Promise(resolve => {
      const gebruik = fotoGebruik();
      const paden = [...new Set([...Object.keys(S.uploads).reverse(), ...gebruik.keys(), ...Object.keys(S.data.mediaInfo)])];
      const dlg = h("dialog", { class: "kiezer foto-kiezer" });
      const sluit = v => { dlg.close(); dlg.remove(); resolve(v); };
      const zoek = h("input", { type: "search", class: "zoek", placeholder: "Zoek op hond, verslag of nest…", "aria-label": "Foto's zoeken" });
      const aantal = h("span", { class: "foto-aantal" });
      const raster = h("div", { class: "foto-kiezer-raster" });
      const vul = () => {
        const q = zoek.value.trim().toLowerCase();
        raster.innerHTML = "";
        let n = 0;
        for (const p of paden) {
          const namen = gebruik.get(p) || [];
          const label = S.uploads[p] && !S.uploads[p].opgeslagen ? "Nieuw" : namen.join(" · ") || "Niet gebruikt";
          if (q && !label.toLowerCase().includes(q) && !p.toLowerCase().includes(q)) continue;
          n++;
          raster.append(h("button", { type: "button", title: label, onclick: () => sluit(p) },
            h("img", { src: fotoUrl(p), alt: "", loading: "lazy" }), h("span", { class: "foto-label" }, label)));
        }
        aantal.textContent = `${n} ${n === 1 ? "foto" : "foto's"}`;
      };
      zoek.addEventListener("input", vul);
      vul();
      dlg.append(h("div", { class: "kiezer-in" },
        h("header", {}, h("h2", { class: "dlg-titel" }, "Kies een foto"), h("button", { class: "icoonknop", "aria-label": "Sluiten", html: I.weg, onclick: () => sluit(null) })),
        h("div", { class: "foto-kiezer-zoek" }, h("div", { class: "zoek-wrap", html: I.zoek }, zoek), aantal),
        raster));
      dlg.addEventListener("cancel", () => resolve(null));
      document.body.append(dlg);
      dlg.showModal();
      zoek.focus();
    });
  }

  /* ---------- Voorbeeld ---------- */
  const VOORBEELD_CSS = `
    .site-header{position:absolute!important}
    [data-blok]{position:relative;cursor:pointer}
    [data-blok]:hover{box-shadow:inset 0 0 0 3px rgba(201,160,82,.55)}
    [data-blok].gekozen{box-shadow:inset 0 0 0 4px #c9a052}
    [data-blok]::before{content:attr(data-label);position:absolute;z-index:40;top:10px;right:10px;padding:5px 10px;border-radius:999px;background:#c9a052;color:#1a1408;font:700 12px/1 Manrope,sans-serif;display:none}
    [data-blok]:hover::before,[data-blok].gekozen::before{display:block}
    .report-text.clamped{max-height:none}.report-text.clamped::after{display:none}.more-btn{display:none}
    .leeg-pagina{padding:120px 24px;text-align:center;color:#6c6457;font:500 17px/1.6 Manrope,sans-serif}`;
  const VOORBEELD_JS = `
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a,button,label,input,select,textarea");
      if (a) e.preventDefault();
      var b = e.target.closest("[data-blok]");
      parent.postMessage({ vaBlok: b ? +b.dataset.blok : null, vaZone: e.target.closest(".site-header") ? "kop" : e.target.closest(".site-footer") ? "voet" : "" }, "*");
    }, true);
    document.addEventListener("submit", function (e) { e.preventDefault(); }, true);
    setInterval(function () {
      document.querySelectorAll(".slides").forEach(function (box) {
        box.t = (box.t || 0) + 1;
        if (box.t < (parseInt(box.dataset.wissel, 10) || 6)) return;
        box.t = 0;
        var im = box.querySelectorAll("img"), i = 0;
        im.forEach(function (x, j) { if (x.classList.contains("on")) i = j; });
        im[i].classList.remove("on"); im[(i + 1) % im.length].classList.add("on");
      });
    }, 1000);`;

  let voorbeeldDoc = null, voorbeeldSleutel = "";
  const huidigItem = sectie => { const pad = S.item[sectie]; return pad && actief(pad) ? pad : null; };
  // Wat toont het voorbeeld voor de huidige sectie? -> { actief, main, sleutel }
  function voorbeeldInhoud(B, M) {
    if (S.sectie === "paginas") {
      const blokken = paginaData().blokken || [];
      const id = idVan(S.pagina);
      return { actief: id === "start" ? "" : id, sleutel: S.pagina, main: B.renderBlocks(blokken, true) + (blokken.length ? "" : `<div class="leeg-pagina">Deze pagina is nog leeg. Voeg rechts een blok toe.</div>`) };
    }
    if (S.sectie === "nieuws") {
      const pad = huidigItem("nieuws");
      if (!pad) return { actief: "nieuws", sleutel: "nieuws", main: B.paginaBody("nieuws") };
      const p = M.nieuws.find(x => x.id === idVan(pad));
      return { actief: "nieuws", sleutel: pad, main: `${B.nieuwsKop()}<div class="wrap" style="padding:56px 0 40px"><div class="reports">${p ? B.verslag(p, true) : ""}</div></div>${B.blokNieuws({ bovenschrift: "Zo staat het op de startpagina", titel: "Laatste *nieuws*" })}` };
    }
    if (S.sectie === "honden") {
      const pad = huidigItem("honden");
      const d = pad && M.honden.find(x => x.id === slug(idVan(pad)));
      return { actief: "honden", sleutel: pad || "honden", main: d ? B.hondBody(d) : B.paginaBody("honden") };
    }
    if (S.sectie === "nesten") {
      const pad = huidigItem("nesten");
      const ruw = pad && S.bestanden[pad].data;
      const l = ruw && M.nesten.find(x => x.id === slug(ruw.letter || idVan(pad)));
      return { actief: "nesten", sleutel: pad || "nesten", main: l ? B.nestenKop() + B.nestBlok(l) : B.paginaBody("nesten") };
    }
    const start = (S.bestanden["inhoud/paginas/start.json"] || { data: { blokken: [] } }).data;
    return { actief: "", sleutel: "instellingen", main: B.renderBlocks(start.blokken) };
  }
  function vernieuwVoorbeeld(volledig) {
    clearTimeout(vernieuwVoorbeeld.t);
    vernieuwVoorbeeld.t = setTimeout(() => {
      const frame = $("#voorbeeld-frame");
      if (!frame) return;
      const M = bouwModel(raw());
      const B = createSite({ img: vImg, shot: vShot, imgUrl: p => p ? fotoUrl(p, true) : "", showMail: true, model: M });
      const v = voorbeeldInhoud(B, M);
      const thema = M.site.thema || {};
      if (!volledig && voorbeeldDoc && voorbeeldDoc.querySelector("main") && v.sleutel === voorbeeldSleutel) {
        voorbeeldDoc.querySelector("main").innerHTML = v.main;
        // Menu, voettekst, kleuren en lettertypes kunnen ook veranderd zijn
        const kop = voorbeeldDoc.querySelector(".site-header"), voet = voorbeeldDoc.querySelector(".site-footer");
        if (kop) kop.outerHTML = B.header(v.actief);
        if (voet) voet.outerHTML = B.footer();
        voorbeeldDoc.getElementById("va-thema").textContent = themaCss(thema);
        const fonts = voorbeeldDoc.getElementById("va-fonts");
        if (fonts.getAttribute("href") !== fontsHref(thema)) fonts.setAttribute("href", fontsHref(thema));
        markeerGekozen();
        return;
      }
      const scroll = voorbeeldDoc && v.sleutel === voorbeeldSleutel ? voorbeeldDoc.scrollingElement.scrollTop : 0;
      voorbeeldSleutel = v.sleutel;
      frame.onload = () => { voorbeeldDoc = frame.contentDocument; voorbeeldDoc.scrollingElement.scrollTop = scroll; markeerGekozen(); };
      frame.srcdoc = `<!doctype html><html lang="nl-BE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${SITE_ROOT}">
<link id="va-fonts" href="${esc(fontsHref(thema))}" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/logo.css"><style id="va-thema">${themaCss(thema)}</style><style>${VOORBEELD_CSS}</style></head>
<body>${B.header(v.actief)}<main>${v.main}</main>${B.footer()}<script>${VOORBEELD_JS}<\/script></body></html>`;
    }, volledig ? 0 : 140);
  }
  function markeerGekozen(scroll) {
    if (!voorbeeldDoc) return;
    voorbeeldDoc.querySelectorAll("[data-blok].gekozen").forEach(e => e.classList.remove("gekozen"));
    if (S.sectie !== "paginas" || S.blok === null) return;
    const el = voorbeeldDoc.querySelector(`[data-blok="${S.blok}"]`);
    if (!el) return;
    el.classList.add("gekozen");
    if (scroll) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function schaalVoorbeeld() {
    const vak = $(".voorbeeld"), kader = $(".voorbeeld-kader");
    if (!vak || !kader) return;
    const w = vak.clientWidth, hgt = vak.clientHeight;
    const gsm = S.weergave === "gsm" || matchMedia("(max-width: 900px)").matches;
    vak.classList.toggle("gsm", gsm);
    if (gsm) {
      kader.style.width = "390px"; kader.style.height = Math.max(400, hgt - 32) + "px";
      kader.style.transform = `translateX(-50%) scale(${Math.min(1, (w - 32) / 390)})`;
    } else {
      const breed = Math.max(1280, w), k = w / breed;
      kader.style.width = breed + "px"; kader.style.height = hgt / k + "px";
      kader.style.transform = `translateX(-50%) scale(${k})`;
    }
  }
  window.addEventListener("message", e => {
    if (!e.data || !("vaBlok" in e.data)) return;
    if (S.sectie === "paginas" && e.data.vaBlok !== null) { S.blok = e.data.vaBlok; S.paginaInst = false; S.tab = "bewerken"; }
    else if (e.data.vaZone === "kop" || e.data.vaZone === "voet") {
      S.sectie = "instellingen"; S.tab = "bewerken"; S.naarInstelling = e.data.vaZone === "kop" ? "inst-menu" : "inst-voettekst";
      S.open.add(e.data.vaZone === "kop" ? "Menu bovenaan" : "Voettekst");
      tekenAlles(); return;
    }
    else return;
    tekenPaneel(); markeerGekozen(); werkTabsBij();
  });

  /* ---------- Velden ---------- */
  // obj = het object met de waarde, pad = het bestand dat verandert (voor ongedaan maken)
  function veld(def, obj, pad, opNieuw) {
    const id = "v" + Math.random().toString(36).slice(2, 8);
    const zet = (waarde, volledig, groep) => {
      voorWijziging(Array.isArray(pad) ? pad : [pad], groep ? id : null);
      if (waarde === undefined) delete obj[def.naam]; else obj[def.naam] = waarde;
      gewijzigd(volledig); if (opNieuw) opNieuw();
    };
    const wrap = h("div", { class: "veld" });
    const label = h("label", { for: id }, def.label);
    const hulp = def.hulp ? h("div", { class: "hulp" }, def.hulp) : "";
    const v = obj[def.naam];

    if (def.type === "regel" || def.type === "tekst" || def.type === "opmaak") {
      const input = def.type === "regel" ? h("input", { id, type: "text" }) : h("textarea", { id, class: def.type === "opmaak" ? "lang" : "" });
      input.value = v || "";
      input.addEventListener("input", () => zet(input.value, false, true));
      wrap.append(label);
      if (def.type === "opmaak") wrap.append(opmaakBalk(input), hulp || h("div", { class: "hulp" }, "Lege regel = nieuwe alinea. Een regel die met '- ' begint wordt een opsomming."));
      wrap.append(input);
      if (def.type !== "opmaak" && hulp) wrap.append(hulp);
      return wrap;
    }
    if (def.type === "datum") {
      const input = h("input", { id, type: "date" });
      input.value = v ? String(v).slice(0, 10) : "";
      input.addEventListener("change", () => zet(input.value, true));
      wrap.append(label, input);
      if (hulp) wrap.append(hulp);
      return wrap;
    }
    if (def.type === "aanuit") {
      const input = h("input", { id, type: "checkbox" });
      input.checked = !!v;
      input.addEventListener("change", () => zet(input.checked));
      wrap.append(h("label", { class: "schakel", for: id }, input, h("span", { class: "spoor" }), def.label));
      return wrap;
    }
    if (def.type === "kleur") {
      const toon = () => isKleur(obj[def.naam]) ? normaalKleur(obj[def.naam]) : (STANDAARD_KLEUR[def.naam] || "#c9a052");
      const kiezer = h("input", { id, type: "color" });
      const code = h("input", { type: "text", class: "kleur-code", maxlength: "7", placeholder: "standaard", "aria-label": def.label + " (kleurcode)" });
      const terug = h("button", { type: "button", class: "b-btn klein", title: "Terug naar de kleur van de site" }, "Standaard");
      const bij = () => { kiezer.value = toon(); code.value = obj[def.naam] || ""; wrap.classList.toggle("standaard", !obj[def.naam]); terug.hidden = !obj[def.naam]; };
      kiezer.addEventListener("input", () => { zet(kiezer.value, false, true); code.value = kiezer.value; wrap.classList.remove("standaard"); terug.hidden = false; });
      code.addEventListener("change", () => {
        const c = code.value.trim();
        if (!c) zet(undefined);
        else if (isKleur(c.startsWith("#") ? c : "#" + c)) zet((c.startsWith("#") ? c : "#" + c).toLowerCase());
        else melding("Gebruik een kleurcode zoals #c9a052, of kies met het vakje.");
        bij();
      });
      terug.addEventListener("click", () => { zet(undefined); bij(); });
      bij();
      wrap.append(label, h("div", { class: "kleur-veld" }, kiezer, code, terug));
      if (hulp) wrap.append(hulp);
      return wrap;
    }
    if (def.type === "keuze" && def.opties.length > 4) {
      const sel = h("select", { id });
      const huidig = v || def.opties[0];
      for (const o of def.opties) sel.append(h("option", { value: o, selected: o === huidig || null }, o));
      sel.addEventListener("change", () => zet(sel.value, true));
      wrap.append(label, sel);
      if (hulp) wrap.append(hulp);
      return wrap;
    }
    if (def.type === "keuze") {
      const groep = h("div", { class: "keuzes", role: "group", "aria-label": def.label });
      const huidig = v || def.opties[0];
      for (const o of def.opties) groep.append(h("button", { type: "button", "aria-pressed": String(o === huidig), onclick: () => { zet(o); groep.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.textContent === o))); } }, o));
      wrap.append(h("div", { class: "lbl" }, def.label), groep);
      return wrap;
    }
    if (def.type === "link") {
      const opties = linkOpties();
      const sel = h("select", { id });
      const bekend = opties.some(o => o.href === v);
      for (const o of opties) sel.append(h("option", { value: o.href, selected: o.href === v || null }, o.label));
      sel.append(h("option", { value: "__ander", selected: (v && !bekend) || null }, "Ander adres…"));
      const ander = h("input", { type: "text", placeholder: "https://…", hidden: !(v && !bekend) || null });
      ander.value = v && !bekend ? v : "";
      sel.addEventListener("change", () => { if (sel.value === "__ander") { ander.hidden = false; ander.focus(); } else { ander.hidden = true; zet(sel.value); } });
      ander.addEventListener("input", () => zet(ander.value.trim(), false, true));
      if (!v) sel.selectedIndex = opties.findIndex(o => o.href === "contact.html");
      wrap.append(label, sel, ander);
      return wrap;
    }
    if (def.type === "woorden") {
      const box = h("div", { class: "woorden" });
      const teken = () => {
        box.innerHTML = "";
        (obj[def.naam] || []).forEach((w, i, lijst) => {
          const input = h("input", { type: "text", "aria-label": `${def.label} ${i + 1}` });
          input.value = w;
          input.addEventListener("input", () => { const l = [...(obj[def.naam] || [])]; l[i] = input.value; zet(l, false, true); });
          box.append(h("div", { class: "woord" }, input, h("button", { type: "button", class: "icoonknop", "aria-label": "Weghalen", html: I.weg, onclick: () => { zet(lijst.filter((_, j) => j !== i), true); teken(); } })));
        });
      };
      teken();
      wrap.append(h("div", { class: "lbl" }, def.label), hulp, box, h("button", { type: "button", class: "b-btn klein", html: I.plus + " Regel toevoegen", onclick: () => { zet([...(obj[def.naam] || []), ""], true); teken(); setTimeout(() => { const ins = box.querySelectorAll("input"); if (ins.length) ins[ins.length - 1].focus(); }, 0); } }));
      return wrap;
    }
    if (def.type === "foto") {
      const duim = h("img", { class: "duim", alt: "", src: v ? fotoUrl(v) : "" });
      if (!v) duim.style.visibility = "hidden";
      const opnieuw = () => { const nv = obj[def.naam]; duim.src = nv ? fotoUrl(nv) : ""; duim.style.visibility = nv ? "" : "hidden"; weg.hidden = !nv; };
      const weg = h("button", { type: "button", class: "b-btn klein gevaar", hidden: !v || null, onclick: () => { zet("", true); opnieuw(); } }, "Weghalen");
      wrap.append(h("div", { class: "lbl" }, def.label), h("div", { class: "foto-veld" }, duim, h("div", { class: "knoppen" },
        h("button", { type: "button", class: "b-btn klein", html: I.foto + " Nieuwe foto", onclick: async () => { const [p] = await kiesBestanden(false); if (p) { zet(p, true); opnieuw(); } } }),
        h("button", { type: "button", class: "b-btn klein", onclick: async () => { const p = await kiesBestaandeFoto(); if (p) { zet(p, true); opnieuw(); } } }, "Kies bestaande"),
        weg)));
      if (hulp) wrap.append(hulp);
      return wrap;
    }
    if (def.type === "fotos") {
      const raster = h("div", { class: "fotos-raster" });
      const teken = () => {
        raster.innerHTML = "";
        (obj[def.naam] || []).forEach((p, i, lijst) => raster.append(h("div", { class: "item" },
          h("img", { class: "duim", src: fotoUrl(p), alt: "" }),
          i > 0 ? h("button", { type: "button", class: "icoonknop links", "aria-label": "Naar voren", html: I.links, onclick: () => { const l = [...lijst]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; zet(l, true); teken(); } }) : null,
          h("button", { type: "button", class: "icoonknop weg", "aria-label": "Foto weghalen", html: I.weg, onclick: () => { zet(lijst.filter((_, j) => j !== i), true); teken(); } }))));
      };
      teken();
      wrap.append(h("div", { class: "lbl" }, def.label), hulp, raster, h("div", { class: "knoppen-rij" },
        h("button", { type: "button", class: "b-btn klein", html: I.plus + " Foto's toevoegen", onclick: async () => { const nieuw = await kiesBestanden(true); if (nieuw.length) { zet([...(obj[def.naam] || []), ...nieuw], true); teken(); } } }),
        h("button", { type: "button", class: "b-btn klein", onclick: async () => { const p = await kiesBestaandeFoto(); if (p) { zet([...(obj[def.naam] || []), p], true); teken(); } } }, "Kies bestaande")));
      return wrap;
    }
    if (def.type === "lijst") {
      const box = h("div", { style: "display:grid;gap:10px" });
      const teken = (openIndex) => {
        box.innerHTML = "";
        const lijst = obj[def.naam] || [];
        lijst.forEach((item, i) => {
          const titel = item.roepnaam || item.naam || item.titel || item.label || [item.getal, item.tekst].filter(Boolean).join(" ") || `${i + 1}`;
          const kaart = h("details", { class: "lijst-item", open: lijst.length <= 2 || i === openIndex || null },
            h("summary", { class: "kop" }, h("span", {}, titel, item.jaar ? ` · ${item.jaar}` : ""), h("span", { class: "kop-knoppen" },
              h("button", { type: "button", class: "icoonknop", "aria-label": "Omhoog", disabled: i === 0 || null, html: I.op, onclick: e => { e.preventDefault(); const l = [...lijst]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; zet(l, true); teken(i - 1); } }),
              h("button", { type: "button", class: "icoonknop", "aria-label": "Omlaag", disabled: i === lijst.length - 1 || null, html: I.neer, onclick: e => { e.preventDefault(); const l = [...lijst]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; zet(l, true); teken(i + 1); } }),
              h("button", { type: "button", class: "icoonknop", "aria-label": "Verwijderen", html: I.weg, onclick: e => { e.preventDefault(); if (confirm(`"${titel}" verwijderen?`)) { zet(lijst.filter((_, j) => j !== i), true); teken(); } } }))));
          kaart.append(h("div", { class: "lijst-velden" }, def.velden.map(sub => veld(sub, item, pad))));
          box.append(kaart);
        });
      };
      teken();
      wrap.append(h("div", { class: "lbl" }, def.label), hulp, box, h("button", { type: "button", class: "b-btn klein", html: I.plus + " Toevoegen", onclick: () => { const l = [...(obj[def.naam] || []), {}]; zet(l, true); teken(l.length - 1); } }));
      return wrap;
    }
    return wrap;
  }
  // Velden onder elkaar; velden met een "groep" komen samen in een uitklapbaar vak
  function velden(paneel, defs, obj, pad, opNieuw) {
    const groepen = {};
    for (const def of defs) {
      if (!def.groep) { paneel.append(veld(def, obj, pad, opNieuw)); continue; }
      if (!groepen[def.groep]) {
        const naam = def.groep;
        const inhoud = h("div", { class: "groep-in" });
        const vak = h("details", { class: "groep", open: S.open.has(naam) || null, id: def.groepId || null }, h("summary", {}, naam), inhoud);
        vak.addEventListener("toggle", () => { if (vak.open) S.open.add(naam); else S.open.delete(naam); });
        paneel.append(vak);
        groepen[naam] = inhoud;
      }
      groepen[def.groep].append(veld(def, obj, pad, opNieuw));
    }
  }
  function groep(paneel, naam, id, ...inhoud) {
    const vak = h("details", { class: "groep", id, open: S.open.has(naam) || null }, h("summary", {}, naam), h("div", { class: "groep-in" }, ...inhoud));
    vak.addEventListener("toggle", () => { if (vak.open) S.open.add(naam); else S.open.delete(naam); });
    paneel.append(vak);
    return vak;
  }
  function opmaakBalk(ta) {
    const rond = (voor, na = voor) => {
      const { selectionStart: a, selectionEnd: b, value } = ta;
      const deel = value.slice(a, b) || "tekst";
      ta.value = value.slice(0, a) + voor + deel + na + value.slice(b);
      ta.setSelectionRange(a + voor.length, a + voor.length + deel.length);
      ta.focus(); ta.dispatchEvent(new Event("input"));
    };
    const regel = prefix => {
      const { selectionStart: a, value } = ta;
      const begin = value.lastIndexOf("\n", a - 1) + 1;
      ta.value = value.slice(0, begin) + prefix + value.slice(begin);
      ta.setSelectionRange(a + prefix.length, a + prefix.length);
      ta.focus(); ta.dispatchEvent(new Event("input"));
    };
    return h("div", { class: "werkbalk" },
      h("button", { type: "button", title: "Vet", onclick: () => rond("**") }, h("b", {}, "B")),
      h("button", { type: "button", title: "Schuin", onclick: () => rond("*") }, h("i", {}, "I")),
      h("button", { type: "button", title: "Tussenkopje", onclick: () => regel("#### ") }, "Kopje"),
      h("button", { type: "button", title: "Opsomming", onclick: () => regel("- ") }, "• Lijst"),
      h("button", { type: "button", title: "Link", onclick: () => { const url = prompt("Naar welk adres moet de link gaan?", "https://"); if (url) rond("[", `](${url})`); } }, "Link"));
  }
  const bevestigKnop = (tekst, vraag, actie) => {
    const bevestig = h("div", { class: "bevestig", hidden: true }, vraag,
      h("button", { type: "button", class: "b-btn klein gevaar", onclick: actie }, "Ja, verwijderen"),
      h("button", { type: "button", class: "b-btn klein", onclick: () => { bevestig.hidden = true; } }, "Nee"));
    return [h("button", { type: "button", class: "b-btn klein gevaar", style: "margin-left:auto", onclick: () => { bevestig.hidden = false; } }, tekst), bevestig];
  };

  /* ---------- Paneel: pagina's ---------- */
  const samenvatting = b => String(b.titel || b.tekst || b.label || (b.leden && b.leden.map(l => l.naam).join(", ")) || "").replace(/[*#_\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 70);
  function verplaatsBlok(van, naar) {
    const lijst = paginaData().blokken;
    if (naar < 0 || naar >= lijst.length || van === naar) return;
    voorWijziging([S.pagina]);
    const [b] = lijst.splice(van, 1);
    lijst.splice(naar, 0, b);
    if (S.blok === van) S.blok = naar;
    gewijzigd(); tekenPaneel();
  }
  function voegBlokToe(type, positie) {
    voorWijziging([S.pagina]);
    paginaData().blokken.splice(positie, 0, { type, ...kloon(BLOKKEN[type].nieuw || {}) });
    S.blok = positie; S.paginaInst = false;
    gewijzigd(); tekenPaneel();
    setTimeout(() => markeerGekozen(true), 300);
  }
  function blokKiezer(positie) {
    const dlg = h("dialog", { class: "kiezer" });
    const sluit = () => { dlg.close(); dlg.remove(); };
    const kaart = t => h("button", { type: "button", class: "kiezer-kaart", onclick: () => { sluit(); voegBlokToe(t, positie); } }, h("b", {}, BLOKKEN[t].label), h("span", {}, BLOKKEN[t].omschrijving));
    dlg.append(h("div", { class: "kiezer-in" },
      h("header", {}, h("h2", { class: "dlg-titel" }, "Blok toevoegen"), h("button", { class: "icoonknop", "aria-label": "Sluiten", html: I.weg, onclick: sluit })),
      h("h3", { class: "dlg-sub" }, "Eigen inhoud"), h("div", { class: "kiezer-raster" }, INHOUD_TYPES.map(kaart)),
      h("h3", { class: "dlg-sub" }, "Onderdelen van de site"), h("div", { class: "kiezer-raster" }, SITE_TYPES.map(kaart))));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }
  function paginaKeuze() {
    const sel = h("select", { "aria-label": "Pagina kiezen", class: "volle-select" });
    const paden = bestandenIn("paginas").sort((a, b) => (VASTE_PAGINAS.indexOf(idVan(a)) + 1 || 99) - (VASTE_PAGINAS.indexOf(idVan(b)) + 1 || 99) || paginaNaam(a).localeCompare(paginaNaam(b)));
    for (const p of paden) sel.append(h("option", { value: p, selected: p === S.pagina || null }, paginaNaam(p)));
    sel.append(h("option", { value: "__nieuw" }, "+ Nieuwe pagina…"));
    sel.addEventListener("change", () => {
      if (sel.value === "__nieuw") { sel.value = S.pagina; return nieuwePagina(); }
      S.pagina = sel.value; S.blok = null; S.paginaInst = false;
      tekenPaneel(); vernieuwVoorbeeld(true);
    });
    return sel;
  }
  let sleepVan = null;
  function tekenBlokkenLijst(paneel) {
    const p = paginaData();
    paneel.append(
      h("div", { class: "kop-rij" }, paginaKeuze(), h("button", { class: "b-btn klein", title: "Pagina-instellingen", html: I.tandwiel, "aria-label": "Pagina-instellingen", onclick: () => { S.paginaInst = true; tekenPaneel(); } })),
      h("p", { class: "uitleg" }, "Klik op een blok om het aan te passen, of klik in het voorbeeld. Sleep blokken aan het handvat om de volgorde te veranderen."));
    const lijst = h("ul", { class: "blokken" });
    const tussen = i => h("li", { class: "tussen" }, h("button", { type: "button", onclick: () => blokKiezer(i) }, "+ Blok invoegen"));
    lijst.append(tussen(0));
    (p.blokken || []).forEach((b, i) => {
      const kies = () => { S.blok = i; tekenPaneel(); markeerGekozen(true); };
      const rij = h("li", {
        class: "blok-rij" + (S.blok === i ? " gekozen" : ""), draggable: "true", tabindex: "0",
        onclick: e => { if (!e.target.closest("button")) kies(); }, onkeydown: e => { if (e.key === "Enter") kies(); },
        ondragstart: e => { sleepVan = i; rij.classList.add("sleept"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); },
        ondragend: () => { rij.classList.remove("sleept"); lijst.querySelectorAll(".doel-boven,.doel-onder").forEach(x => x.classList.remove("doel-boven", "doel-onder")); },
        ondragover: e => { e.preventDefault(); const r = rij.getBoundingClientRect(); const boven = e.clientY < r.top + r.height / 2; rij.classList.toggle("doel-boven", boven); rij.classList.toggle("doel-onder", !boven); },
        ondragleave: () => rij.classList.remove("doel-boven", "doel-onder"),
        ondrop: e => {
          e.preventDefault();
          const boven = rij.classList.contains("doel-boven");
          rij.classList.remove("doel-boven", "doel-onder");
          if (sleepVan === null) return;
          let naar = boven ? i : i + 1;
          if (sleepVan < naar) naar--;
          verplaatsBlok(sleepVan, naar);
          sleepVan = null;
        }
      },
        h("span", { class: "greep", html: I.greep, title: "Slepen om te verplaatsen" }),
        h("div", { style: "min-width:0" }, h("div", { class: "blok-naam" }, (BLOKKEN[b.type] || {}).label || b.type), h("div", { class: "blok-samenvatting" }, samenvatting(b))),
        h("div", { class: "blok-knoppen" },
          h("button", { type: "button", class: "icoonknop", "aria-label": "Omhoog", disabled: i === 0 || null, html: I.op, onclick: () => verplaatsBlok(i, i - 1) }),
          h("button", { type: "button", class: "icoonknop", "aria-label": "Omlaag", disabled: i === p.blokken.length - 1 || null, html: I.neer, onclick: () => verplaatsBlok(i, i + 1) })));
      lijst.append(rij, tussen(i + 1));
    });
    paneel.append(lijst, h("button", { type: "button", class: "toevoegen-groot", html: I.plus + " Blok toevoegen onderaan", onclick: () => blokKiezer((p.blokken || []).length) }));
  }
  function tekenBlok(paneel) {
    const lijst = paginaData().blokken, i = S.blok, b = lijst[i];
    if (!b) { S.blok = null; return tekenBlokkenLijst(paneel); }
    const def = BLOKKEN[b.type] || { label: b.type, velden: [] };
    paneel.append(
      h("button", { type: "button", class: "b-link terug", html: I.terug + " Alle blokken van " + esc(paginaNaam(S.pagina)), onclick: () => { S.blok = null; tekenPaneel(); markeerGekozen(); } }),
      h("div", {}, h("h3", {}, `Blok ${i + 1} van ${lijst.length}`), h("h2", {}, def.label)),
      def.omschrijving ? h("p", { class: "uitleg" }, def.omschrijving) : "");
    if (b.type === "verwacht" || b.type === "contact") paneel.append(h("button", { type: "button", class: "b-btn", style: "justify-self:start", html: I.tandwiel + " Naar de instellingen", onclick: () => { S.sectie = "instellingen"; S.naarInstelling = b.type === "verwacht" ? "inst-verwacht" : "inst-contact"; S.open.add(b.type === "verwacht" ? "Verwachte nesten" : "Contactgegevens"); tekenAlles(); } }));
    else if (!def.velden.length) paneel.append(h("div", { class: "info" }, "Dit blok heeft geen eigen tekst om aan te passen. Je kunt het wel verplaatsen, weghalen of een eigen kleur geven."));
    velden(paneel, [...def.velden, ...KLEUR_VELDEN], b, S.pagina);
    paneel.append(h("div", { class: "acties" },
      h("button", { type: "button", class: "b-btn klein", html: I.op + " Omhoog", disabled: i === 0 || null, onclick: () => { verplaatsBlok(i, i - 1); markeerGekozen(true); } }),
      h("button", { type: "button", class: "b-btn klein", html: I.neer + " Omlaag", disabled: i === lijst.length - 1 || null, onclick: () => { verplaatsBlok(i, i + 1); markeerGekozen(true); } }),
      ...bevestigKnop("Blok verwijderen", "Dit blok verwijderen?", () => { voorWijziging([S.pagina]); lijst.splice(i, 1); S.blok = null; gewijzigd(); tekenPaneel(); })));
  }
  const menuNu = () => bouwModel(raw()).menu;
  function tekenPaginaInstellingen(paneel) {
    const pad = S.pagina, id = idVan(pad), d = paginaData();
    paneel.append(
      h("button", { type: "button", class: "b-link terug", html: I.terug + " Alle blokken", onclick: () => { S.paginaInst = false; tekenPaneel(); } }),
      h("div", {}, h("h3", {}, "Pagina-instellingen"), h("h2", {}, paginaNaam(pad))),
      veld({ naam: "titel", label: "Naam van de pagina", type: "regel", hulp: "Staat bovenaan het browservenster en in het menu." }, d, pad, () => vernieuwVoorbeeld(true)));
    if (id !== "start") {
      paneel.append(veld({ naam: "inMenu", label: "Toon in het menu", type: "aanuit" }, d, pad, () => { vernieuwVoorbeeld(true); tekenPaneel(); }));
      if (d.inMenu) {
        paneel.append(veld({ naam: "menuNaam", label: "Naam in het menu (leeg = de naam van de pagina)", type: "regel" }, d, pad));
        const items = menuNu().filter(m => m.key !== id);
        const huidig = Number(d.menuVolgorde ?? 50);
        const sel = h("select", { id: "menuplaats" });
        sel.append(h("option", { value: "-1" }, "Helemaal vooraan"));
        items.forEach((m, j) => sel.append(h("option", { value: String(j), selected: (huidig > m.order && (!items[j + 1] || huidig < items[j + 1].order)) || null }, `Na “${m.label}”`)));
        sel.addEventListener("change", () => {
          const j = Number(sel.value);
          const voor = j < 0 ? (items[0] ? items[0].order - 10 : 0) : items[j].order;
          const na = items[j + 1] ? items[j + 1].order : voor + 20;
          voorWijziging([pad]); d.menuVolgorde = j < 0 ? voor : (voor + na) / 2; gewijzigd(true);
        });
        paneel.append(h("div", { class: "veld" }, h("label", { for: "menuplaats" }, "Plaats in het menu"), sel));
      }
    }
    paneel.append(veld({ naam: "omschrijving", label: "Korte omschrijving voor Google", type: "tekst", hulp: "Eén of twee zinnen. Bezoekers zien dit in zoekresultaten." }, d, pad));
    paneel.append(h("div", { class: "info" }, "Adres: ", h("a", { href: SITE_ROOT + pageFile(id), target: "_blank", rel: "noopener" }, SITE_ROOT.replace(/^https?:\/\//, "") + pageFile(id))));
    if (!VASTE_PAGINAS.includes(id)) paneel.append(h("div", { class: "acties" }, ...bevestigKnop("Pagina verwijderen", "Deze pagina verwijderen?", () => {
      voorWijziging([pad]); S.verwijderd.add(pad); S.pagina = "inhoud/paginas/start.json"; S.paginaInst = false; S.blok = null; tekenAlles();
    })));
  }
  function nieuwePagina() {
    const dlg = h("dialog", { class: "kiezer" });
    const input = h("input", { type: "text", id: "nieuwe-naam", placeholder: "bijvoorbeeld Flyball" });
    const fout = h("div", { class: "fout-tekst", hidden: true });
    const sluit = () => { dlg.close(); dlg.remove(); };
    const maak = () => {
      const naam = input.value.trim(), id = slug(naam), pad = `inhoud/paginas/${id}.json`;
      if (!id) { fout.textContent = "Geef de pagina een naam."; fout.hidden = false; return; }
      if (GERESERVEERD.has(id) || id.startsWith("hond-") || actief(pad)) { fout.textContent = "Die naam bestaat al. Kies een andere naam."; fout.hidden = false; return; }
      voorWijziging([pad]);
      const laatste = Math.max(40, ...menuNu().map(m => m.order));
      S.verwijderd.delete(pad);
      S.bestanden[pad] = { sha: null, data: { titel: naam, inMenu: true, menuVolgorde: laatste + 10, omschrijving: "", blokken: [{ type: "paginakop", bovenschrift: "Vai Avanti", titel: naam, intro: "", fotos: [] }, { type: "tekst", ...kloon(BLOKKEN.tekst.nieuw) }] } };
      S.nieuw.add(pad);
      S.pagina = pad; S.blok = null; S.paginaInst = false;
      sluit(); tekenAlles();
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") maak(); });
    dlg.append(h("div", { class: "kiezer-in" },
      h("header", {}, h("h2", { class: "dlg-titel" }, "Nieuwe pagina"), h("button", { class: "icoonknop", "aria-label": "Sluiten", html: I.weg, onclick: sluit })),
      h("div", { class: "veld" }, h("label", { for: "nieuwe-naam" }, "Naam van de pagina"), input, h("div", { class: "hulp" }, "De pagina komt in het menu. Je kunt dat later nog veranderen bij Pagina-instellingen."), fout),
      h("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, h("button", { class: "b-btn", onclick: sluit }, "Annuleren"), h("button", { class: "b-btn donker", onclick: maak }, "Pagina maken"))));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    input.focus();
  }

  /* ---------- Paneel: verslagen, honden, nesten ---------- */
  const SOORT = {
    nieuws: {
      titel: "Wedstrijdverslagen", meervoud: "verslagen", nieuwKnop: "Nieuw verslag", enkelvoud: "verslag",
      nieuwPad: () => `inhoud/nieuws/${vandaag()}-nieuw-verslag.json`,
      nieuweData: () => ({ titel: "", datum: vandaag(), fotos: [], tekst: "", overzicht: false, datumOnbekend: false }),
      eindPad: d => `inhoud/nieuws/${String(d.datum || vandaag()).slice(0, 10)}-${slug(d.titel) || "verslag"}.json`,
      naam: d => d.titel || "Nieuw verslag"
    },
    honden: {
      titel: "Onze honden", meervoud: "honden", nieuwKnop: "Nieuwe hond", enkelvoud: "hond",
      nieuwPad: () => "inhoud/honden/nieuwe-hond.json",
      nieuweData: () => ({ roepnaam: "", naam: "", geslacht: "Teef", status: "", geboren: "", kleur: "", vader: "", moeder: "", hoogtepunt: "", omslagfoto: "", fotos: [], gezondheid: [], palmares: [], stamboom: "", andereNamen: [], volgorde: 1 + Math.max(0, ...bestandenIn("honden").map(p => Number(S.bestanden[p].data.volgorde) || 0)), tekst: "" }),
      eindPad: d => `inhoud/honden/${slug(d.roepnaam) || "hond"}.json`,
      naam: d => d.roepnaam || "Nieuwe hond"
    },
    nesten: {
      titel: "Nesten", meervoud: "nesten", nieuwKnop: "Nieuw nest", enkelvoud: "nest",
      nieuwPad: () => "inhoud/nesten/nieuw-nest.json",
      nieuweData: () => ({ letter: "", geboren: "", vader: "", moeder: "", foto: "", tekst: "", pups: [] }),
      eindPad: d => `inhoud/nesten/${slug(d.letter) || "nest"}-nest.json`,
      naam: d => d.letter ? `${String(d.letter).toUpperCase()}-nest` : "Nieuw nest"
    }
  };
  function nieuwItem(sectie) {
    const s = SOORT[sectie];
    let pad = s.nieuwPad(), n = 2;
    while (S.bestanden[pad]) pad = s.nieuwPad().replace(/\.json$/, `-${n++}.json`);
    voorWijziging([pad]);
    S.bestanden[pad] = { sha: null, data: s.nieuweData() };
    S.nieuw.add(pad);
    S.item[sectie] = pad;
    gewijzigd(true); tekenPaneel();
    setTimeout(() => { const eerste = $("#paneel-in input[type=text]"); if (eerste) eerste.focus(); }, 50);
  }
  function lijstRij({ duim, titel, sub, onclick, extra }) {
    return h("li", { class: "item-rij", tabindex: "0", onclick: e => { if (!e.target.closest("button")) onclick(); }, onkeydown: e => { if (e.key === "Enter") onclick(); } },
      duim ? h("img", { class: "item-duim", src: fotoUrl(duim), alt: "", loading: "lazy" }) : h("span", { class: "item-duim leeg" }),
      h("div", { style: "min-width:0" }, h("div", { class: "blok-naam" }, titel), sub ? h("div", { class: "blok-samenvatting" }, sub) : null),
      extra || h("span"));
  }
  const open = (sectie, pad) => { S.item[sectie] = pad; tekenPaneel(); vernieuwVoorbeeld(true); };
  function tekenVerzameling(paneel, sectie) {
    const s = SOORT[sectie];
    const pad = huidigItem(sectie);
    if (pad) return tekenItem(paneel, sectie, pad);
    const paden = bestandenIn(sectie);
    paneel.append(
      h("div", { class: "kop-rij" }, h("div", {}, h("h3", {}, `${paden.length} ${paden.length === 1 ? s.enkelvoud : s.meervoud}`), h("h2", {}, s.titel)),
        h("button", { class: "b-btn goud", html: I.plus + " " + s.nieuwKnop, onclick: () => nieuwItem(sectie) })));
    const lijst = h("ul", { class: "items" });
    if (sectie === "nieuws") {
      const zoek = h("input", { type: "search", class: "zoek", placeholder: "Zoek een verslag…", "aria-label": "Zoek een verslag" });
      zoek.value = S.zoek;
      const vul = () => {
        lijst.innerHTML = "";
        const q = S.zoek.trim().toLowerCase();
        const items = paden.map(p => ({ p, d: S.bestanden[p].data }))
          .filter(x => !q || String(x.d.titel || "").toLowerCase().includes(q) || String(x.d.tekst || "").toLowerCase().includes(q))
          .sort((a, b) => String(b.d.datum).localeCompare(String(a.d.datum)) || (b.d.volgorde || 0) - (a.d.volgorde || 0));
        let jaar = null;
        for (const { p, d } of items) {
          const j = String(d.datum || "").slice(0, 4);
          if (j !== jaar) { jaar = j; lijst.append(h("li", { class: "jaar-kop" }, j || "Zonder datum")); }
          lijst.append(lijstRij({ duim: (d.fotos || [])[0], titel: d.titel || "Nieuw verslag", sub: d.datumOnbekend ? j : fmtDate(d.datum), onclick: () => open("nieuws", p) }));
        }
        if (!items.length) lijst.append(h("li", { class: "info" }, "Geen verslagen gevonden."));
      };
      zoek.addEventListener("input", () => { S.zoek = zoek.value; vul(); });
      paneel.append(h("div", { class: "zoek-wrap", html: I.zoek }, zoek));
      vul();
    } else if (sectie === "honden") {
      const items = paden.map(p => ({ p, d: S.bestanden[p].data })).sort((a, b) => (Number(a.d.volgorde) || 999) - (Number(b.d.volgorde) || 999));
      const verplaats = (i, j) => {
        if (j < 0 || j >= items.length) return;
        voorWijziging(items.map(x => x.p));
        const volg = [...items]; [volg[i], volg[j]] = [volg[j], volg[i]];
        volg.forEach((x, k) => { x.d.volgorde = k + 1; });
        gewijzigd(); tekenPaneel();
      };
      paneel.append(h("p", { class: "uitleg" }, "Zo staan de honden ook op de site. Met de pijltjes verander je de volgorde."));
      items.forEach(({ p, d }, i) => lijst.append(lijstRij({
        duim: d.omslagfoto || (d.fotos || [])[0], titel: d.roepnaam || "Nieuwe hond", sub: [d.naam, d.status].filter(Boolean).join(" · "),
        onclick: () => open("honden", p),
        extra: h("span", { class: "blok-knoppen" },
          h("button", { type: "button", class: "icoonknop", "aria-label": "Omhoog", disabled: i === 0 || null, html: I.op, onclick: () => verplaats(i, i - 1) }),
          h("button", { type: "button", class: "icoonknop", "aria-label": "Omlaag", disabled: i === items.length - 1 || null, html: I.neer, onclick: () => verplaats(i, i + 1) }))
      })));
    } else {
      const items = paden.map(p => ({ p, d: S.bestanden[p].data })).sort((a, b) => String(b.d.geboren || "9").localeCompare(String(a.d.geboren || "9")));
      for (const { p, d } of items) lijst.append(lijstRij({
        duim: d.foto || ((d.pups || [])[0] && (d.pups[0].fotos || [])[0]), titel: SOORT.nesten.naam(d),
        sub: [d.geboren ? "Geboren " + fmtDate(d.geboren) : "", `${(d.pups || []).length} ${(d.pups || []).length === 1 ? "pup" : "pups"}`].filter(Boolean).join(" · "),
        onclick: () => open("nesten", p)
      }));
    }
    paneel.append(lijst);
  }
  function herkendeHonden(pad) {
    const M = bouwModel(raw());
    const p = M.nieuws.find(x => x.id === idVan(pad));
    return p ? p.dogs.filter(k => M.DOG_INFO[k]).map(k => M.DOG_INFO[k].call) : [];
  }
  function tekenItem(paneel, sectie, pad) {
    const s = SOORT[sectie], d = S.bestanden[pad].data;
    paneel.append(
      h("button", { type: "button", class: "b-link terug", html: I.terug + " Alle " + s.meervoud, onclick: () => { S.item[sectie] = null; tekenPaneel(); vernieuwVoorbeeld(true); } }),
      h("div", {}, h("h3", {}, S.nieuw.has(pad) ? `Nieuw ${s.enkelvoud}` : s.titel), h("h2", { id: "item-titel" }, s.naam(d))));
    const titelBij = () => { const t = $("#item-titel"); if (t) t.textContent = s.naam(d); };
    for (const def of VELDEN[sectie]) {
      paneel.append(veld(def, d, pad, titelBij));
      if (sectie === "nieuws" && def.naam === "datum" && d.datumOnbekend) paneel.append(veld({ naam: "datumOnbekend", label: "Dag onbekend: toon enkel het jaar", type: "aanuit" }, d, pad));
      if (sectie === "nieuws" && def.naam === "tekst") {
        const herkend = h("div", { class: "info" });
        const vulHerkend = () => { const namen = herkendeHonden(pad); herkend.textContent = namen.length ? `Herkende honden: ${namen.join(", ")}` : "Nog geen honden herkend in dit verslag."; };
        vulHerkend();
        paneel.querySelectorAll("textarea, input[type=text]").forEach(t => t.addEventListener("input", () => { clearTimeout(vulHerkend.t); vulHerkend.t = setTimeout(vulHerkend, 400); }));
        paneel.append(herkend);
      }
    }
    if (sectie === "honden" && !S.nieuw.has(pad)) paneel.append(h("div", { class: "info" }, "Pagina: ", h("a", { href: `${SITE_ROOT}hond-${slug(idVan(pad))}.html`, target: "_blank", rel: "noopener" }, `hond-${slug(idVan(pad))}.html`)));
    paneel.append(h("div", { class: "acties" }, ...bevestigKnop(`${s.enkelvoud[0].toUpperCase() + s.enkelvoud.slice(1)} verwijderen`, `Dit ${s.enkelvoud} verwijderen?`, () => {
      voorWijziging([pad]); S.verwijderd.add(pad); S.item[sectie] = null; gewijzigd(true); tekenPaneel();
    })));
  }

  /* ---------- Paneel: instellingen ---------- */
  function tekenInstellingen(paneel) {
    const pad = "inhoud/site.json", s = S.bestanden[pad].data;
    for (const k of ["verwacht", "contact", "thema", "menu", "voettekst"]) s[k] = s[k] || {};
    const vol = () => vernieuwVoorbeeld(true);
    paneel.append(
      h("div", {}, h("h3", {}, "Hele site"), h("h2", {}, "Instellingen")),
      h("p", { class: "uitleg" }, "Deze instellingen gelden op alle pagina's. Klik op een onderdeel om het open te klappen."));

    if (S.conceptVoor) paneel.append(h("div", { class: "info concept-info" },
      h("b", {}, "Er is een concept dat nog niet online staat. "), "Klik op Publiceren om het online te zetten, of gooi het weg om terug te gaan naar wat nu online staat.",
      h("div", { style: "margin-top:10px" }, h("button", { type: "button", class: "b-btn klein gevaar", onclick: conceptWeggooien }, "Concept weggooien"))));

    const T = LETTERS ? [{ naam: "titelLetter", label: "Lettertype van de titels", type: "keuze", opties: Object.keys(LETTERS.titel) }, { naam: "tekstLetter", label: "Lettertype van de tekst", type: "keuze", opties: Object.keys(LETTERS.tekst) }] : [];
    const themaVak = h("div", { class: "groep-velden" });
    velden(themaVak, [
      { naam: "accent", label: "Accentkleur (nu goud)", type: "kleur", hulp: "Titels in schuinschrift, knoppen, lijntjes en opschriften." },
      { naam: "donker", label: "Donkere kleur", type: "kleur", hulp: "Het menu, de donkere blokken, de koppen en de voettekst." },
      { naam: "licht", label: "Achtergrond", type: "kleur" },
      { naam: "beige", label: "Tweede achtergrond (de beige vlakken)", type: "kleur" },
      { naam: "tekst", label: "Tekstkleur", type: "kleur" },
      ...T
    ], s.thema, pad);
    groep(paneel, "Kleuren en lettertypes", "inst-thema", themaVak,
      h("button", { type: "button", class: "b-btn klein", style: "justify-self:start", onclick: () => { voorWijziging([pad]); s.thema = {}; gewijzigd(true); tekenPaneel(); } }, "Alles terug naar de standaard"));

    groep(paneel, "Menu bovenaan", "inst-menu",
      h("p", { class: "uitleg", style: "margin:0" }, "Vink aan welke pagina's in het menu staan. Met de pijltjes verander je de volgorde. Een naam invullen kan, anders staat de naam van de pagina er."),
      menuEditor(),
      veld({ naam: "knoptekst", label: "Knop rechts in het menu: tekst (leeg = geen knop)", type: "regel" }, s.menu, pad),
      veld({ naam: "knoplink", label: "Die knop gaat naar", type: "link" }, s.menu, pad));

    const voetVak = h("div", { class: "groep-velden" });
    velden(voetVak, [
      { naam: "tekst", label: "Tekst onder het logo", type: "tekst", hulp: "{plaats} = de gemeente uit de contactgegevens." },
      { naam: "kolommen", label: "Kolommen met links", type: "lijst", velden: [{ naam: "titel", label: "Titel van de kolom", type: "regel" }, { naam: "links", label: "Links", type: "lijst", velden: [{ naam: "label", label: "Tekst", type: "regel" }, { naam: "link", label: "Gaat naar", type: "link" }] }] },
      { naam: "contactTitel", label: "Titel van de kolom met contactgegevens", type: "regel" },
      { naam: "onderschrift", label: "Helemaal onderaan, na © Vai Avanti", type: "regel" }
    ], s.voettekst, pad);
    groep(paneel, "Voettekst", "inst-voettekst", voetVak);

    // Talen: elke aangevinkte taal krijgt een eigen versie van de site, automatisch vertaald bij het publiceren
    const ALLE_TALEN = ["en", "de", "it", "fi", "da"];
    const talenVak = h("div", { class: "groep-velden" });
    for (const code of ALLE_TALEN) {
      const vink = h("input", { type: "checkbox", id: "taal-" + code });
      vink.checked = (s.talen || ALLE_TALEN).includes(code);
      vink.addEventListener("change", () => {
        voorWijziging([pad]);
        const nu = new Set(s.talen || ALLE_TALEN);
        if (vink.checked) nu.add(code); else nu.delete(code);
        s.talen = ALLE_TALEN.filter(c => nu.has(c));
        gewijzigd();
      });
      const online = (S.data.talen || []).includes(code);
      talenVak.append(h("div", { class: "taal-rij" }, h("label", { class: "schakel", for: "taal-" + code }, vink, h("span", { class: "spoor" }), VA_TALEN[code].naam),
        online ? h("a", { href: `${SITE_ROOT}${code}/`, target: "_blank", rel: "noopener", class: "taal-bekijk" }, "Bekijk") : null));
    }
    groep(paneel, "Talen", "inst-talen",
      h("p", { class: "uitleg", style: "margin:0" }, "Je schrijft alles in het Nederlands. Bij Publiceren worden nieuwe of gewijzigde teksten automatisch vertaald naar de aangevinkte talen. Bezoekers kiezen hun taal rechtsboven in het menu."),
      talenVak);

    groep(paneel, "Verwachte nesten", "inst-verwacht",
      veld({ naam: "tonen", label: "Aankondiging tonen op de site", type: "aanuit" }, s.verwacht, pad, vol),
      veld({ naam: "label", label: "Klein opschrift (bv. Verwacht in 2027)", type: "regel" }, s.verwacht, pad, vol),
      veld({ naam: "titel", label: "Titel", type: "regel", hulp: "Zet *sterretjes* rond een woord om het goud en schuin te maken." }, s.verwacht, pad),
      veld({ naam: "tekst", label: "Tekst", type: "tekst" }, s.verwacht, pad),
      veld({ naam: "knoptekst", label: "Tekst op de knop (leeg = geen knop)", type: "regel" }, s.verwacht, pad),
      veld({ naam: "knoplink", label: "Knop gaat naar", type: "link" }, s.verwacht, pad));

    groep(paneel, "Contactgegevens", "inst-contact",
      ...["telefoon:Telefoon", "email:E-mailadres", "plaats:Postcode en gemeente", "instagram:Link naar Instagram", "facebook:Link naar Facebook"]
        .map(x => { const [naam, label] = x.split(":"); return veld({ naam, label, type: "regel" }, s.contact, pad, vol); }));

    paneel.append(h("h3", { style: "margin-top:10px" }, "Dit toestel"),
      h("div", { class: "acties", style: "border-top:0;padding-top:0" }, h("button", { class: "b-btn klein", onclick: afmelden }, S.demo ? "Aanmelden met wachtwoord" : "Afmelden op dit toestel")));
  }
  // Welke pagina's staan in het menu, in welke volgorde en met welke naam
  function menuEditor() {
    const box = h("div", { class: "menu-lijst" });
    const teken = () => {
      box.innerHTML = "";
      const paden = bestandenIn("paginas").filter(p => idVan(p) !== "start");
      const orde = p => Number(S.bestanden[p].data.menuVolgorde ?? 50);
      const inMenu = paden.filter(p => S.bestanden[p].data.inMenu).sort((a, b) => orde(a) - orde(b));
      const rest = paden.filter(p => !S.bestanden[p].data.inMenu).sort(paginaVolgorde);
      const herschik = lijst => lijst.forEach((p, k) => { S.bestanden[p].data.menuVolgorde = (k + 1) * 10; });
      for (const p of [...inMenu, ...rest]) {
        const d = S.bestanden[p].data, aan = !!d.inMenu, j = inMenu.indexOf(p);
        const vink = h("input", { type: "checkbox", "aria-label": `${paginaNaam(p)} in het menu` });
        vink.checked = aan;
        vink.addEventListener("change", () => {
          voorWijziging(paden);
          d.inMenu = vink.checked;
          herschik(vink.checked ? [...inMenu, p] : inMenu.filter(x => x !== p));
          gewijzigd(); teken();
        });
        const naam = h("input", { type: "text", placeholder: d.titel || idVan(p), "aria-label": `Naam van ${paginaNaam(p)} in het menu`, disabled: !aan || null });
        naam.value = d.menuNaam || "";
        naam.addEventListener("input", () => { voorWijziging([p], "menunaam-" + p); if (naam.value.trim()) d.menuNaam = naam.value; else delete d.menuNaam; gewijzigd(); });
        const schuif = r => { voorWijziging(inMenu); const l = [...inMenu]; [l[j], l[j + r]] = [l[j + r], l[j]]; herschik(l); gewijzigd(); teken(); };
        box.append(h("div", { class: "menu-rij" + (aan ? "" : " uit") },
          h("label", { class: "menu-vink", title: "In het menu" }, vink),
          naam,
          h("button", { type: "button", class: "icoonknop", "aria-label": "Naar voren", disabled: !aan || j === 0 || null, html: I.op, onclick: () => schuif(-1) }),
          h("button", { type: "button", class: "icoonknop", "aria-label": "Naar achteren", disabled: !aan || j === inMenu.length - 1 || null, html: I.neer, onclick: () => schuif(1) })));
      }
    };
    teken();
    return box;
  }
  async function conceptWeggooien() {
    if (isVuil() && !confirm("Je hebt ook nog niet-opgeslagen wijzigingen. Die gaan dan ook verloren. Doorgaan?")) return;
    if (!confirm("Alles wat opgeslagen is maar nog niet gepubliceerd, wordt weggegooid. Doorgaan?")) return;
    try {
      const live = await gh(`git/ref/heads/${LIVE}`);
      await gh(`git/refs/heads/${CONCEPT}`, { method: "PATCH", body: { sha: live.object.sha, force: true } });
      S.uploads = {}; S.geschiedenis = [];
      await start();
      melding("Het concept is weggegooid. Je ziet weer wat online staat.");
    } catch (e) { melding(`Weggooien mislukt: ${e.detail || e.message}`); }
  }

  function tekenPaneel() {
    const paneel = $("#paneel-in");
    if (!paneel) return;
    const lijstWeergave = (S.sectie === "paginas" && S.blok === null && !S.paginaInst) || (["nieuws", "honden", "nesten"].includes(S.sectie) && !huidigItem(S.sectie));
    const scroll = $("#paneel").scrollTop;
    paneel.innerHTML = "";
    if (S.sectie === "paginas") {
      if (S.paginaInst) tekenPaginaInstellingen(paneel);
      else if (S.blok !== null) tekenBlok(paneel);
      else tekenBlokkenLijst(paneel);
    } else if (S.sectie === "instellingen") tekenInstellingen(paneel);
    else tekenVerzameling(paneel, S.sectie);
    $("#paneel").scrollTop = lijstWeergave ? scroll : 0;
    if (S.naarInstelling) {
      const doel = document.getElementById(S.naarInstelling);
      if (doel) { doel.open = true; doel.scrollIntoView({ block: "start" }); }
      S.naarInstelling = "";
    }
    werkStatusBij();
  }

  /* ---------- Status ---------- */
  // Soorten: "" alles online · "vuil" niet opgeslagen · "concept" opgeslagen maar niet online
  //          "bezig" (opslaan, publiceren of foto klaarmaken: knoppen uit) · "publiceren" · "ok" · "fout"
  function werkStatusBij(tekst, soort) {
    if (tekst !== undefined) S.status = { tekst, soort: soort || "" };
    const vuil = S.data ? isVuil() : false;
    let toon = S.status;
    if (toon.soort !== "bezig" && vuil) toon = { tekst: "Niet opgeslagen wijzigingen", soort: "vuil" };
    else if (toon.soort !== "bezig" && toon.soort !== "fout" && S.conceptVoor) toon = { tekst: "Opgeslagen, nog niet online", soort: "concept" };
    const el = $("#status");
    if (el) { el.textContent = toon.tekst; el.title = toon.tekst; el.className = "status " + toon.soort; }
    const bezig = toon.soort === "bezig";
    const knop = $("#knop-opslaan"), pub = $("#knop-publiceren");
    if (knop) knop.disabled = bezig || !vuil;
    if (pub) pub.disabled = bezig || (!vuil && !S.conceptVoor);
  }
  function werkTabsBij() {
    const werk = $(".werk");
    if (werk) werk.dataset.tab = S.tab;
    document.querySelectorAll(".mobiel-tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === S.tab)));
    schaalVoorbeeld();
  }

  /* ---------- Opslaan en publiceren ---------- */
  function definitievePaden() {
    // Nieuwe verslagen, honden en nesten krijgen pas bij het opslaan hun bestandsnaam (uit titel/naam)
    for (const pad of [...S.nieuw]) {
      const map = pad.split("/")[1];
      if (!SOORT[map] || S.verwijderd.has(pad)) continue;
      let doel = SOORT[map].eindPad(S.bestanden[pad].data), n = 2;
      if (doel === pad) continue;
      const basis = doel;
      while (S.bestanden[doel] && doel !== pad) doel = basis.replace(/\.json$/, `-${n++}.json`);
      if (doel === pad) continue;
      S.bestanden[doel] = S.bestanden[pad]; delete S.bestanden[pad];
      S.nieuw.delete(pad); S.nieuw.add(doel);
      for (const k of Object.keys(S.item)) if (S.item[k] === pad) S.item[k] = doel;
    }
  }
  // Wijzigingen bewaren in het concept. Geeft false terug als het niet doorging.
  async function bewaarConcept() {
    definitievePaden();
    const { bestanden, weg } = wijzigingen();
    if (!bestanden.length && !weg.length) return true;
    await maakConceptKlaar();
    // Heeft iemand anders deze bestanden intussen aangepast?
    const boom = await gh(`git/trees/${CONCEPT}?recursive=1`);
    const nu = Object.fromEntries(boom.tree.map(t => [t.path, t.sha]));
    const botsing = [...bestanden.filter(b => b.oudeSha && nu[b.pad] && nu[b.pad] !== b.oudeSha).map(b => b.pad), ...weg.filter(p => nu[p] && S.bestanden[p] && nu[p] !== S.bestanden[p].sha)];
    if (botsing.length && !confirm(`Iemand anders heeft intussen ook iets aangepast aan:\n${botsing.map(p => "• " + p.split("/").slice(1).join("/")).join("\n")}\n\nToch opslaan? Hun wijziging aan die bestanden gaat dan verloren.`)) return false;
    const soorten = new Set([...bestanden.map(b => b.pad), ...weg].filter(p => p.startsWith("inhoud/")).map(p => p.split("/")[1]));
    const bericht = soorten.size === 1 && soorten.has("nieuws") ? "Wedstrijdverslag aangepast via beheer"
      : soorten.size === 1 && soorten.has("honden") ? "Honden aangepast via beheer"
      : soorten.size === 1 && soorten.has("nesten") ? "Nesten aangepast via beheer"
      : soorten.size === 1 && soorten.has("paginas") ? "Pagina's aangepast via beheer"
      : "Website aangepast via beheer";
    await bewaarBestanden(bestanden, weg, bericht, undefined, CONCEPT);
    for (const b of bestanden) { if (b.upload) S.uploads[b.upload].opgeslagen = true; else if (S.bestanden[b.pad]) S.bestanden[b.pad].sha = b.sha; }
    for (const p of weg) delete S.bestanden[p];
    S.nieuw = new Set(); S.verwijderd = new Set();
    S.conceptVoor = true; S.bronTak = CONCEPT;
    onthoudOrigineel();
    return true;
  }
  async function opslaan(publiceren) {
    if (!S.token || S.demo) return melding("Opslaan en publiceren kan pas na aanmelden met het wachtwoord.");
    const vuil = isVuil();
    if (!vuil && !publiceren) return melding(S.conceptVoor ? "Alles is al opgeslagen. Klik op Publiceren om het online te zetten." : "Er is niets gewijzigd.");
    if (!vuil && publiceren && !S.conceptVoor) return melding("Alles staat al online.");
    werkStatusBij(publiceren ? "Bezig met publiceren…" : "Bezig met opslaan…", "bezig");
    try {
      if (!(await bewaarConcept())) { werkStatusBij(publiceren ? "Niet gepubliceerd" : "Niet opgeslagen", "fout"); return; }
      if (!publiceren) {
        werkStatusBij("Opgeslagen, nog niet online", "concept");
        melding("Opgeslagen. Bezoekers zien het pas na Publiceren.");
        tekenPaneel();
        return;
      }
      const sha = await publiceerConcept();
      S.conceptVoor = false;
      werkStatusBij("Wordt gepubliceerd…", "publiceren");
      tekenPaneel();
      if (sha) volgPublicatie(sha); else werkStatusBij("Alles staat online", "ok");
    } catch (e) {
      console.error(e);
      werkStatusBij(publiceren ? "Publiceren mislukt" : "Opslaan mislukt", "fout");
      melding(e.status === 401 || e.status === 403 ? "Aanmelden is verlopen. Meld je opnieuw aan met het wachtwoord."
        : e.status === 409 ? "Het concept botst met een wijziging die intussen online kwam. Laat het aan Keanu weten."
        : `${publiceren ? "Publiceren" : "Opslaan"} mislukt: ${e.detail || e.message}. Probeer het opnieuw.`);
    }
  }
  async function volgPublicatie(sha) {
    const start = Date.now();
    while (Date.now() - start < 8 * 60 * 1000) {
      await new Promise(r => setTimeout(r, 8000));
      try {
        const r = await gh(`actions/runs?head_sha=${sha}&per_page=1`);
        const run = r.workflow_runs && r.workflow_runs[0];
        if (run && run.status === "completed") {
          if (run.conclusion === "success") {
            werkStatusBij("Staat online", "ok");
            melding(h("span", {}, "Je wijzigingen staan online. ", h("a", { href: SITE_ROOT, target: "_blank", rel: "noopener" }, "Bekijk de site")));
            try { const nieuw = await (await fetch("data.json", { cache: "no-store" })).json(); S.data.mediaInfo = nieuw.mediaInfo; } catch (e) { /* oude gegevens blijven */ }
          } else if (run.conclusion !== "cancelled") {
            werkStatusBij("Publiceren mislukt", "fout");
            melding("Het publiceren is mislukt. Laat het aan Keanu weten.");
          }
          return;
        }
      } catch (e) { /* even later opnieuw */ }
    }
  }

  /* ---------- Melding ---------- */
  function melding(inhoud) {
    document.querySelectorAll(".melding").forEach(m => m.remove());
    const el = h("div", { class: "melding", role: "status" }, inhoud, h("button", { class: "icoonknop", style: "color:#fff", "aria-label": "Sluiten", html: I.weg, onclick: () => el.remove() }));
    document.body.append(el);
    clearTimeout(melding.t);
    melding.t = setTimeout(() => el.remove(), 9000);
  }

  /* ---------- Schermen ---------- */
  function tekenAlles() {
    const app = $("#app");
    app.innerHTML = "";
    const tabs = h("nav", { class: "secties", "aria-label": "Onderdelen" }, SECTIES.map(([k, label]) => h("button", {
      type: "button", "aria-pressed": String(S.sectie === k),
      onclick: () => { S.sectie = k; S.tab = "bewerken"; if (k === "paginas") { S.blok = null; S.paginaInst = false; } tekenAlles(); }
    }, label)));
    const balk = h("header", { class: "balk" },
      h("span", { class: "brand-logo", role: "img", "aria-label": "Vai Avanti" }),
      h("span", { class: "titel" }, "Beheer"),
      tabs,
      h("span", { class: "ruimte" }),
      h("div", { class: "weergave", role: "group", "aria-label": "Voorbeeld als" },
        ["computer:Computer", "gsm:Gsm"].map(x => { const [k, l] = x.split(":"); return h("button", { "aria-pressed": String(S.weergave === k), onclick: e => { S.weergave = k; e.target.parentNode.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === e.target))); schaalVoorbeeld(); } }, l); })),
      h("span", { class: "status", id: "status" }),
      h("button", { class: "b-btn", title: "Ongedaan maken (Ctrl+Z)", "aria-label": "Ongedaan maken", html: I.ongedaan, onclick: ongedaanMaken }),
      h("a", { class: "b-btn verberg-smal", href: SITE_ROOT, target: "_blank", rel: "noopener", html: "Bekijk site " + I.extern }),
      h("button", { class: "b-btn opslaan-knop", id: "knop-opslaan", title: "Bewaart je werk. Bezoekers zien het nog niet. (Ctrl+S)", onclick: () => opslaan(false) }, "Opslaan"),
      h("button", { class: "b-btn goud", id: "knop-publiceren", title: "Bewaart en zet alles online", onclick: () => opslaan(true) }, "Publiceren"),
      h("div", { class: "mobiel-tabs" },
        h("button", { "data-tab": "bewerken", onclick: () => { S.tab = "bewerken"; werkTabsBij(); } }, "Bewerken"),
        h("button", { "data-tab": "voorbeeld", onclick: () => { S.tab = "voorbeeld"; werkTabsBij(); } }, "Voorbeeld")));
    const werk = h("div", { class: "werk", "data-tab": S.tab },
      h("section", { class: "voorbeeld", "aria-label": "Voorbeeld" },
        h("div", { class: "voorbeeld-kader" }, h("iframe", { id: "voorbeeld-frame", title: "Voorbeeld" }))),
      h("aside", { class: "paneel", id: "paneel" }, h("div", { class: "paneel-in", id: "paneel-in" })));
    app.append(balk, werk);
    document.documentElement.style.setProperty("--balk-h", balk.offsetHeight + "px");
    voorbeeldDoc = null; voorbeeldSleutel = "";
    tekenPaneel(); werkStatusBij(); werkTabsBij();
    vernieuwVoorbeeld(true);
  }

  async function aanmelden(fout) {
    const app = $("#app");
    app.innerHTML = "";
    let sleutel = null;
    try { const r = await fetch("sleutel.json", { cache: "no-store" }); if (r.ok) sleutel = await r.json(); } catch (e) { /* nog geen wachtwoord */ }
    const ww = h("input", { type: "password", id: "ww", autocomplete: "current-password" });
    const onthoud = h("input", { type: "checkbox", id: "onthoud", checked: true });
    const foutEl = h("div", { class: "fout-tekst", hidden: !fout || null }, fout || "");
    const knop = h("button", { class: "b-btn donker vol", type: "submit" }, "Aanmelden");
    const form = h("form", { class: "aanmelden-blok", onsubmit: async e => {
      e.preventDefault();
      if (!sleutel) return;
      knop.disabled = true; knop.textContent = "Even controleren…"; foutEl.hidden = true;
      let code;
      try { code = await ontsleutel(sleutel, ww.value); }
      catch (x) { knop.disabled = false; knop.textContent = "Aanmelden"; foutEl.textContent = "Dit wachtwoord klopt niet."; foutEl.hidden = false; return; }
      try {
        await controleerCode(code);
        S.token = code; S.demo = false;
        if (onthoud.checked) opslag.set(CODE_OP_TOESTEL, code);
        await start();
      } catch (x) {
        knop.disabled = false; knop.textContent = "Aanmelden";
        foutEl.textContent = x.status === 401 ? "De koppelcode achter dit wachtwoord is verlopen. Vraag Keanu om een nieuw wachtwoord in te stellen." : "Er ging iets mis. Is er internet?";
        foutEl.hidden = false;
      }
    } },
      h("div", { class: "veld" }, h("label", { for: "ww" }, "Wachtwoord"), ww),
      h("label", { class: "schakel", for: "onthoud" }, onthoud, h("span", { class: "spoor" }), "Onthoud mij op dit toestel"),
      foutEl, knop);

    // Instellen door Keanu: koppelcode + wachtwoord -> versleuteld bewaren in de site
    const code = h("input", { type: "password", id: "nieuw-code", autocomplete: "off", placeholder: "github_pat_…" });
    const ww1 = h("input", { type: "password", id: "nieuw-ww1", autocomplete: "new-password" });
    const ww2 = h("input", { type: "password", id: "nieuw-ww2", autocomplete: "new-password" });
    const instelFout = h("div", { class: "fout-tekst", hidden: true });
    const instelKnop = h("button", { class: "b-btn donker", type: "submit" }, "Wachtwoord instellen");
    const instel = h("form", { class: "instellen", onsubmit: async e => {
      e.preventDefault();
      const toonFout = t => { instelFout.textContent = t; instelFout.hidden = false; instelKnop.disabled = false; instelKnop.textContent = "Wachtwoord instellen"; };
      if (ww1.value.length < 12) return toonFout("Kies een wachtwoord van minstens 12 tekens, bijvoorbeeld drie woorden met streepjes.");
      if (ww1.value !== ww2.value) return toonFout("De twee wachtwoorden zijn niet gelijk.");
      instelKnop.disabled = true; instelKnop.textContent = "Bezig…"; instelFout.hidden = true;
      const c = code.value.trim();
      try {
        await controleerCode(c);
        const versleuteld = await versleutel(c, ww1.value);
        await bewaarBestanden([{ pad: SLEUTEL_PAD, tekst: JSON.stringify(versleuteld, null, 2) + "\n" }], [], "Wachtwoord voor beheer ingesteld", c);
        S.token = c; S.demo = false;
        opslag.set(CODE_OP_TOESTEL, c);
        await start();
        melding("Wachtwoord ingesteld. Over ongeveer een minuut werkt het ook op andere toestellen.");
      } catch (x) {
        toonFout(x.status === 401 ? "Deze koppelcode klopt niet." : x.status === 403 ? "Deze koppelcode mag niets opslaan. Zet Contents op Read and write." : `Er ging iets mis (${x.detail || x.message}).`);
      }
    } },
      h("p", {}, "Maak in GitHub een koppelcode (fine-grained token) en kies een wachtwoord voor Shany. De koppelcode wordt met het wachtwoord versleuteld en op de site bewaard."),
      h("ol", {},
        h("li", {}, "GitHub → profielfoto → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token."),
        h("li", {}, `Repository access: Only select repositories → ${REPO.repo}.`),
        h("li", {}, "Add permissions: Contents (Read and write) en Actions (Read-only)."),
        h("li", {}, "Generate token, kopieer de code en plak ze hieronder.")),
      h("div", { class: "veld" }, h("label", { for: "nieuw-code" }, "Koppelcode"), code),
      h("div", { class: "veld" }, h("label", { for: "nieuw-ww1" }, "Nieuw wachtwoord"), ww1, h("div", { class: "hulp" }, "Minstens 12 tekens. Lang en makkelijk te onthouden, bijvoorbeeld flappie-renbaan-goud.")),
      h("div", { class: "veld" }, h("label", { for: "nieuw-ww2" }, "Wachtwoord herhalen"), ww2),
      instelFout, instelKnop);

    app.append(h("div", { class: "aanmelden" }, h("div", { class: "aanmelden-kaart" },
      h("div", { class: "logo-vlak" }, h("span", { class: "brand-logo", role: "img", "aria-label": "Vai Avanti" })),
      h("h1", {}, "Beheer"),
      sleutel ? h("p", {}, "Meld je aan met het wachtwoord van de website.") : h("div", { class: "waarschuwing" }, "Er is nog geen wachtwoord ingesteld. Keanu kan dat hieronder doen."),
      sleutel ? form : null,
      h("button", { type: "button", class: "b-link", style: "justify-self:center", onclick: () => { S.demo = true; S.token = null; start(); } }, "Eerst rondkijken zonder op te slaan"),
      h("details", { open: !sleutel || null }, h("summary", {}, sleutel ? "Nieuw wachtwoord instellen (voor Keanu)" : "Wachtwoord instellen (voor Keanu)"), instel))));
    (sleutel ? ww : code).focus();
  }
  function afmelden() {
    if (S.data && isVuil() && !confirm("Er zijn niet-opgeslagen wijzigingen. Toch afmelden?")) return;
    opslag.del(CODE_OP_TOESTEL);
    S.token = null; S.demo = false; S.data = null;
    aanmelden();
  }

  async function start() {
    $("#app").innerHTML = '<p style="padding:24px">Inhoud wordt geladen…</p>';
    try {
      await laad();
      S.status = { tekst: "Alles staat online", soort: "" };
      tekenAlles();
      if (S.demo) melding("Je kijkt rond zonder aan te melden: alles werkt, behalve opslaan.");
    } catch (e) {
      console.error(e);
      if (e.status === 401) { opslag.del(CODE_OP_TOESTEL); S.token = null; return aanmelden("Aanmelden is verlopen. Meld je opnieuw aan."); }
      $("#app").innerHTML = "";
      $("#app").append(h("div", { class: "aanmelden" }, h("div", { class: "aanmelden-kaart" }, h("h1", {}, "Laden mislukt"), h("p", {}, "De inhoud kon niet geladen worden. Controleer de internetverbinding en probeer opnieuw."), h("button", { class: "b-btn donker", onclick: () => location.reload() }, "Opnieuw proberen"))));
    }
  }

  /* ---------- Toetsen en vertrekken ---------- */
  window.addEventListener("resize", () => { const b = $(".balk"); if (b) document.documentElement.style.setProperty("--balk-h", b.offsetHeight + "px"); schaalVoorbeeld(); });
  window.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); opslaan(false); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.target.closest("input,textarea")) { e.preventDefault(); ongedaanMaken(); }
  });
  window.addEventListener("beforeunload", e => { if (S.data && isVuil()) { e.preventDefault(); e.returnValue = ""; } });

  S.token = opslag.get(CODE_OP_TOESTEL);
  if (S.token) start(); else aanmelden();
})();
