/* Beheer Vai Avanti
   Pagina's opbouwen uit blokken met een live voorbeeld, en alles in één keer opslaan naar GitHub.
   Daarna bouwt GitHub de site opnieuw (± 1 minuut). */
(() => {
  "use strict";

  const REPO = { owner: "vercauterenkeanu-create", repo: "website", branch: "main" };
  const API = "https://api.github.com";
  const SITE_ROOT = new URL("../", location.href).href;
  const SLEUTEL = "va-beheer-koppelcode";
  const { esc, slug, BLOKKEN, createSite } = window.VA;

  const VASTE_PAGINAS = ["start", "over-ons", "contact"];
  const GERESERVEERD = new Set(["index", "honden", "nesten", "nieuws", "404", "beheer", "start", "contact", "over-ons", "assets", "img", "media"]);
  const INHOUD_TYPES = ["tekst", "tekstfoto", "fotos", "citaat", "aankondiging", "paginakop"];
  const SITE_TYPES = ["hero", "cijfers", "honden", "nieuws", "gezondheid", "nesten", "verwacht", "overons", "team", "contact"];

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
    pagina: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'
  };

  /* ---------- Toestand ---------- */
  const S = {
    token: null, demo: false, data: null,
    site: null, siteSha: null,
    paginas: {},           // id -> { data, sha, isNew }
    verwijderd: new Set(),
    origineel: { site: "", paginas: {} },
    huidige: "start",
    view: { type: "lijst" },
    uploads: {},           // "/media/x.jpg" -> { blob, url, opgeslagen }
    geschiedenis: [],
    weergave: "computer",
    tab: "bewerken",
    status: { tekst: "Alles opgeslagen", soort: "" }
  };
  const opslag = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privévenster */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* privévenster */ } }
  };
  const kloon = o => JSON.parse(JSON.stringify(o));
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

  /* ---------- GitHub ---------- */
  async function gh(pad, opts = {}) {
    const url = `${API}/repos/${REPO.owner}/${REPO.repo}${pad ? "/" + pad : ""}`;
    const res = await fetch(url, {
      method: opts.method || "GET", cache: "no-store",
      headers: { Accept: "application/vnd.github+json", ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}), ...(opts.body ? { "Content-Type": "application/json" } : {}) },
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
  const b64NaarTekst = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), c => c.charCodeAt(0)));
  const tekstNaarB64 = t => bytesNaarB64(new TextEncoder().encode(t));

  // Alle wijzigingen samen in één opslag (commit)
  async function bewaarBestanden(bestanden, weg, bericht) {
    const ref = await gh(`git/ref/heads/${REPO.branch}`);
    const vorige = await gh(`git/commits/${ref.object.sha}`);
    const boom = [];
    for (const b of bestanden) {
      const content = b.blob ? bytesNaarB64(new Uint8Array(await b.blob.arrayBuffer())) : tekstNaarB64(b.tekst);
      const blob = await gh("git/blobs", { method: "POST", body: { content, encoding: "base64" } });
      b.sha = blob.sha;
      boom.push({ path: b.pad, mode: "100644", type: "blob", sha: blob.sha });
    }
    for (const p of weg) boom.push({ path: p, mode: "100644", type: "blob", sha: null });
    const nieuweBoom = await gh("git/trees", { method: "POST", body: { base_tree: vorige.tree.sha, tree: boom } });
    const commit = await gh("git/commits", { method: "POST", body: { message: bericht, tree: nieuweBoom.sha, parents: [ref.object.sha] } });
    await gh(`git/refs/heads/${REPO.branch}`, { method: "PATCH", body: { sha: commit.sha, force: false } });
    return commit.sha;
  }

  /* ---------- Inhoud laden ---------- */
  async function laad() {
    S.data = await (await fetch("data.json", { cache: "no-store" })).json();
    S.paginas = {};
    if (S.token && !S.demo) {
      const site = await gh(`contents/inhoud/site.json?ref=${REPO.branch}`);
      S.site = JSON.parse(b64NaarTekst(site.content));
      S.siteSha = site.sha;
      const lijst = await gh(`contents/inhoud/paginas?ref=${REPO.branch}`);
      await Promise.all(lijst.filter(f => f.name.endsWith(".json")).map(async f => {
        const c = await gh(`contents/${f.path}?ref=${REPO.branch}`);
        S.paginas[f.name.replace(/\.json$/, "")] = { data: JSON.parse(b64NaarTekst(c.content)), sha: c.sha };
      }));
    } else {
      S.site = kloon(S.data.inhoud.site);
      for (const [id, data] of Object.entries(S.data.inhoud.paginas)) S.paginas[id] = { data: kloon(data), sha: null };
    }
    for (const p of Object.values(S.paginas)) p.data.blokken = p.data.blokken || [];
    S.verwijderd = new Set();
    onthoudOrigineel();
    if (!S.paginas[S.huidige]) S.huidige = "start";
  }
  const paginaTekst = d => JSON.stringify(d, null, 2) + "\n";
  function onthoudOrigineel() {
    S.origineel = { site: paginaTekst(S.site), paginas: Object.fromEntries(Object.entries(S.paginas).map(([id, p]) => [id, paginaTekst(p.data)])) };
  }
  function wijzigingen() {
    const bestanden = [], weg = [];
    const siteT = paginaTekst(S.site);
    if (siteT !== S.origineel.site) bestanden.push({ pad: "inhoud/site.json", tekst: siteT, sha: S.siteSha });
    for (const [id, p] of Object.entries(S.paginas)) {
      if (S.verwijderd.has(id)) { if (!p.isNew) weg.push(`inhoud/paginas/${id}.json`); continue; }
      const t = paginaTekst(p.data);
      if (t !== S.origineel.paginas[id]) bestanden.push({ pad: `inhoud/paginas/${id}.json`, tekst: t, sha: p.sha, id });
    }
    const gebruikt = JSON.stringify([S.site, Object.entries(S.paginas).filter(([id]) => !S.verwijderd.has(id)).map(([, p]) => p.data)]);
    for (const [p, u] of Object.entries(S.uploads)) if (!u.opgeslagen && gebruikt.includes(`"${p}"`)) bestanden.push({ pad: p.slice(1), blob: u.blob, upload: p });
    return { bestanden, weg };
  }
  const isVuil = () => { const w = wijzigingen(); return w.bestanden.length + w.weg.length > 0; };

  /* ---------- Ongedaan maken ---------- */
  // Typen in hetzelfde veld telt als één stap; elke andere wijziging is een eigen stap.
  let laatsteMoment = 0, laatsteSleutel = null;
  function voorWijziging(sleutel) {
    const nu = Date.now();
    if (!sleutel || sleutel !== laatsteSleutel || nu - laatsteMoment > 1500) {
      S.geschiedenis.push(JSON.stringify({ site: S.site, paginas: Object.fromEntries(Object.entries(S.paginas).map(([id, p]) => [id, p.data])), verwijderd: [...S.verwijderd], huidige: S.huidige }));
      if (S.geschiedenis.length > 80) S.geschiedenis.shift();
    }
    laatsteMoment = nu;
    laatsteSleutel = sleutel || null;
  }
  function ongedaanMaken() {
    const vorige = S.geschiedenis.pop();
    if (!vorige) return melding("Er is niets meer om ongedaan te maken.");
    const v = JSON.parse(vorige);
    S.site = v.site;
    for (const [id, data] of Object.entries(v.paginas)) { if (S.paginas[id]) S.paginas[id].data = data; else S.paginas[id] = { data, sha: null, isNew: true }; }
    for (const id of Object.keys(S.paginas)) if (!(id in v.paginas)) delete S.paginas[id];
    S.verwijderd = new Set(v.verwijderd);
    S.huidige = S.paginas[v.huidige] ? v.huidige : "start";
    if (S.view.type === "blok" && !huidigePagina().blokken[S.view.i]) S.view = { type: "lijst" };
    laatsteMoment = 0; laatsteSleutel = null;
    tekenAlles(true);
  }
  function gewijzigd(volledig) {
    werkStatusBij();
    vernieuwVoorbeeld(volledig);
  }

  /* ---------- Hulpjes voor pagina's ---------- */
  const huidigePagina = () => S.paginas[S.huidige].data;
  const paginaNaam = id => (S.paginas[id] && S.paginas[id].data.titel) || id;
  const paginaBestand = id => id === "start" ? "index.html" : `${id}.html`;
  function menu() {
    const vast = S.data.vasteMenu || [];
    const eigen = Object.entries(S.paginas)
      .filter(([id, p]) => !S.verwijderd.has(id) && p.data.inMenu && id !== "start" && id !== "contact")
      .map(([id, p]) => ({ key: id, label: p.data.titel || id, href: paginaBestand(id), order: Number(p.data.menuVolgorde ?? 50) }));
    return [...vast, ...eigen].sort((a, b) => a.order - b.order);
  }
  function linkOpties() {
    const eigen = Object.keys(S.paginas).filter(id => !S.verwijderd.has(id) && !VASTE_PAGINAS.includes(id)).map(id => ({ label: paginaNaam(id), href: paginaBestand(id) }));
    return [
      { label: "Startpagina", href: "index.html" }, { label: "Onze honden", href: "honden.html" }, { label: "Nesten", href: "nesten.html" },
      { label: "Verwachte nesten", href: "nesten.html#verwacht" }, { label: "Nieuws", href: "nieuws.html" }, { label: "Over ons", href: "over-ons.html" },
      { label: "Contact", href: "contact.html" }, { label: "Contact, vraag over nesten", href: "contact.html#nesten" }, ...eigen
    ];
  }

  /* ---------- Foto's ---------- */
  function fotoUrl(p, groot) {
    if (!p) return "";
    if (S.uploads[p]) return S.uploads[p].url;
    const m = S.data.mediaInfo[p];
    if (m) return SITE_ROOT + (groot ? "img/" : "img/t/") + m.name + ".webp";
    return `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${REPO.branch}${p}`;
  }
  function vImg(p, { alt = "", cls = "", pos = "", sizes = "(max-width: 640px) 100vw, 50vw" } = {}) {
    if (!p) return `<span class="no-photo${cls ? " " + cls : ""}"></span>`;
    const m = S.data.mediaInfo[p];
    const srcset = m && !S.uploads[p] ? ` srcset="img/t/${m.name}.webp 640w, img/${m.name}.webp 1600w" sizes="${sizes}"` : "";
    return `<img src="${esc(fotoUrl(p))}"${srcset} alt="${esc(alt)}"${cls ? ` class="${cls}"` : ""}${pos ? ` style="object-position:${esc(pos)}"` : ""}>`;
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
  async function kiesBestanden(meerdere) {
    return new Promise(resolve => {
      const input = h("input", { type: "file", accept: "image/*", multiple: meerdere || null, style: "display:none" });
      input.addEventListener("change", async () => {
        const uit = [];
        const vorige = S.status;
        werkStatusBij(input.files.length > 1 ? "Foto's worden klaargemaakt…" : "Foto wordt klaargemaakt…", "bezig");
        for (const f of input.files) {
          try { uit.push(await verwerkFoto(f)); } catch (e) { melding(e.message); }
        }
        input.remove();
        werkStatusBij(vorige.soort === "bezig" ? "" : vorige.tekst, vorige.soort === "bezig" ? "" : vorige.soort);
        resolve(uit);
      });
      document.body.append(input);
      input.click();
    });
  }
  function kiesBestaandeFoto() {
    return new Promise(resolve => {
      const paden = [...Object.keys(S.uploads), ...Object.keys(S.data.mediaInfo)];
      const dlg = h("dialog", { class: "kiezer" });
      const sluit = v => { dlg.close(); dlg.remove(); resolve(v); };
      dlg.append(h("div", { class: "kiezer-in" },
        h("header", {}, h("h2", { style: "margin:0;font:600 26px/1.1 var(--serif)" }, "Kies een foto"), h("button", { class: "icoonknop", "aria-label": "Sluiten", html: I.weg, onclick: () => sluit(null) })),
        h("div", { class: "foto-kiezer-raster" }, paden.map(p => h("button", { type: "button", title: p.split("/").pop(), onclick: () => sluit(p) }, h("img", { src: fotoUrl(p), alt: "", loading: "lazy" }))))
      ));
      dlg.addEventListener("cancel", () => resolve(null));
      document.body.append(dlg);
      dlg.showModal();
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
    .leeg-pagina{padding:120px 24px;text-align:center;color:#6c6457;font:500 17px/1.6 Manrope,sans-serif}`;
  const VOORBEELD_JS = `
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a,button,label,input,select,textarea");
      if (a) e.preventDefault();
      var b = e.target.closest("[data-blok]");
      parent.postMessage({ vaBlok: b ? +b.dataset.blok : null, vaZone: e.target.closest(".site-header") ? "kop" : e.target.closest(".site-footer") ? "voet" : "" }, "*");
    }, true);
    document.addEventListener("submit", function (e) { e.preventDefault(); }, true);`;

  let voorbeeldDoc = null;
  function siteBouwer() {
    return createSite({ img: vImg, shot: vShot, imgUrl: p => p ? fotoUrl(p, true) : "", showMail: true, data: { ...S.data, site: S.site, menu: menu() } });
  }
  function hoofdHtml(bouwer) {
    const blokken = huidigePagina().blokken;
    return bouwer.renderBlocks(blokken, true) + (blokken.length ? "" : `<div class="leeg-pagina">Deze pagina is nog leeg. Voeg rechts een blok toe.</div>`);
  }
  function vernieuwVoorbeeld(volledig) {
    clearTimeout(vernieuwVoorbeeld.t);
    vernieuwVoorbeeld.t = setTimeout(() => {
      const frame = $("#voorbeeld-frame");
      if (!frame) return;
      const bouwer = siteBouwer();
      if (!volledig && voorbeeldDoc && voorbeeldDoc.querySelector("main")) {
        voorbeeldDoc.querySelector("main").innerHTML = hoofdHtml(bouwer);
        markeerGekozen();
        return;
      }
      const scroll = voorbeeldDoc ? voorbeeldDoc.scrollingElement.scrollTop : 0;
      const actief = S.huidige === "start" ? "" : S.huidige;
      frame.onload = () => {
        voorbeeldDoc = frame.contentDocument;
        voorbeeldDoc.scrollingElement.scrollTop = scroll;
        markeerGekozen();
      };
      frame.srcdoc = `<!doctype html><html lang="nl-BE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${SITE_ROOT}">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/logo.css"><style>${VOORBEELD_CSS}</style></head>
<body>${bouwer.header(actief)}<main>${hoofdHtml(bouwer)}</main>${bouwer.footer()}<script>${VOORBEELD_JS}<\/script></body></html>`;
    }, volledig ? 0 : 120);
  }
  function markeerGekozen(scroll) {
    if (!voorbeeldDoc) return;
    voorbeeldDoc.querySelectorAll("[data-blok].gekozen").forEach(e => e.classList.remove("gekozen"));
    if (S.view.type !== "blok") return;
    const el = voorbeeldDoc.querySelector(`[data-blok="${S.view.i}"]`);
    if (!el) return;
    el.classList.add("gekozen");
    if (scroll) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function schaalVoorbeeld() {
    const vak = $(".voorbeeld"), kader = $(".voorbeeld-kader");
    if (!vak || !kader) return;
    const w = vak.clientWidth, hgt = vak.clientHeight;
    vak.classList.toggle("gsm", S.weergave === "gsm");
    if (S.weergave === "gsm") {
      kader.style.width = "390px"; kader.style.height = Math.max(400, hgt - 32) + "px";
      const k = Math.min(1, (w - 32) / 390);
      kader.style.transform = `translateX(-50%) scale(${k})`;
    } else {
      const breed = Math.max(1280, w);
      const k = w / breed;
      kader.style.width = breed + "px"; kader.style.height = hgt / k + "px";
      kader.style.transform = `translateX(-50%) scale(${k})`;
    }
  }
  window.addEventListener("message", e => {
    if (!e.data || !("vaBlok" in e.data)) return;
    if (e.data.vaBlok !== null) { S.view = { type: "blok", i: e.data.vaBlok }; S.tab = "bewerken"; }
    else if (e.data.vaZone === "kop" || e.data.vaZone === "voet") { S.view = { type: "instellingen" }; S.tab = "bewerken"; }
    tekenPaneel();
    markeerGekozen();
    werkTabsBij();
  });

  /* ---------- Velden ---------- */
  function veld(def, obj, opNieuw) {
    const id = "v" + Math.random().toString(36).slice(2, 8);
    const zet = (waarde, volledig, groep) => { voorWijziging(groep ? id : null); obj[def.naam] = waarde; gewijzigd(volledig); if (opNieuw) opNieuw(); };
    const wrap = h("div", { class: "veld" });
    const label = h("label", { for: id }, def.label);
    const hulp = def.hulp ? h("div", { class: "hulp" }, def.hulp) : null;
    const v = obj[def.naam];

    if (def.type === "regel" || def.type === "tekst" || def.type === "opmaak") {
      const lang = def.type !== "regel";
      const input = lang ? h("textarea", { id, class: def.type === "opmaak" ? "lang" : "" }) : h("input", { id, type: "text" });
      input.value = v || "";
      input.addEventListener("input", () => zet(input.value, false, true));
      wrap.append(label);
      if (def.type === "opmaak") wrap.append(opmaakBalk(input), hulp || h("div", { class: "hulp" }, "Lege regel = nieuwe alinea. Een regel die met '- ' begint wordt een opsomming."));
      wrap.append(input);
      if (def.type !== "opmaak" && hulp) wrap.append(hulp);
      return wrap;
    }
    if (def.type === "aanuit") {
      const input = h("input", { id, type: "checkbox" });
      input.checked = !!v;
      input.addEventListener("change", () => zet(input.checked));
      wrap.append(h("label", { class: "schakel", for: id }, input, h("span", { class: "spoor" }), def.label));
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
          h("button", { type: "button", class: "icoonknop weg", "aria-label": "Foto weghalen", html: I.weg, onclick: () => { zet(lijst.filter((_, j) => j !== i), true); teken(); } })
        )));
      };
      teken();
      wrap.append(h("div", { class: "lbl" }, def.label), raster, h("div", { class: "foto-veld", style: "grid-template-columns:1fr" }, h("div", { class: "knoppen" },
        h("button", { type: "button", class: "b-btn klein", html: I.plus + " Foto's toevoegen", onclick: async () => { const nieuw = await kiesBestanden(true); if (nieuw.length) { zet([...(obj[def.naam] || []), ...nieuw], true); teken(); } } }),
        h("button", { type: "button", class: "b-btn klein", onclick: async () => { const p = await kiesBestaandeFoto(); if (p) { zet([...(obj[def.naam] || []), p], true); teken(); } } }, "Kies bestaande"))));
      return wrap;
    }
    if (def.type === "lijst") {
      const box = h("div", { style: "display:grid;gap:10px" });
      const teken = () => {
        box.innerHTML = "";
        const lijst = obj[def.naam] || [];
        lijst.forEach((item, i) => {
          const kaart = h("div", { class: "lijst-item" }, h("div", { class: "kop" }, h("span", {}, item.naam || `Item ${i + 1}`), h("span", {},
            h("button", { type: "button", class: "icoonknop", "aria-label": "Omhoog", disabled: i === 0 || null, html: I.op, onclick: () => { const l = [...lijst]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; zet(l, true); teken(); } }),
            h("button", { type: "button", class: "icoonknop", "aria-label": "Omlaag", disabled: i === lijst.length - 1 || null, html: I.neer, onclick: () => { const l = [...lijst]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; zet(l, true); teken(); } }),
            h("button", { type: "button", class: "icoonknop", "aria-label": "Verwijderen", html: I.weg, onclick: () => { zet(lijst.filter((_, j) => j !== i), true); teken(); } }))));
          for (const sub of def.velden) kaart.append(veld(sub, item));
          box.append(kaart);
        });
      };
      teken();
      wrap.append(h("div", { class: "lbl" }, def.label), box, h("button", { type: "button", class: "b-btn klein", html: I.plus + " Toevoegen", onclick: () => { zet([...(obj[def.naam] || []), {}], true); teken(); } }));
      return wrap;
    }
    return wrap;
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
      h("button", {
        type: "button", title: "Link", onclick: () => {
          const url = prompt("Naar welk adres moet de link gaan?", "https://");
          if (url) rond("[", `](${url})`);
        }
      }, "Link"));
  }

  /* ---------- Paneel ---------- */
  function samenvatting(b) {
    const t = b.titel || b.tekst || b.label || (b.leden && b.leden.map(l => l.naam).join(", ")) || "";
    return String(t).replace(/[*#_\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 70);
  }
  function verplaats(van, naar) {
    const lijst = huidigePagina().blokken;
    if (naar < 0 || naar >= lijst.length || van === naar) return;
    voorWijziging();
    const [b] = lijst.splice(van, 1);
    lijst.splice(naar, 0, b);
    if (S.view.type === "blok" && S.view.i === van) S.view.i = naar;
    gewijzigd();
    tekenPaneel();
  }
  function voegBlokToe(type, positie) {
    voorWijziging();
    const b = { type, ...kloon(BLOKKEN[type].nieuw || {}) };
    huidigePagina().blokken.splice(positie, 0, b);
    S.view = { type: "blok", i: positie };
    gewijzigd();
    tekenPaneel();
    setTimeout(() => markeerGekozen(true), 250);
  }
  function blokKiezer(positie) {
    const dlg = h("dialog", { class: "kiezer" });
    const sluit = () => { dlg.close(); dlg.remove(); };
    const kaart = t => h("button", { type: "button", class: "kiezer-kaart", onclick: () => { sluit(); voegBlokToe(t, positie); } }, h("b", {}, BLOKKEN[t].label), h("span", {}, BLOKKEN[t].omschrijving));
    dlg.append(h("div", { class: "kiezer-in" },
      h("header", {}, h("h2", { style: "margin:0;font:600 28px/1.1 var(--serif)" }, "Blok toevoegen"), h("button", { class: "icoonknop", "aria-label": "Sluiten", html: I.weg, onclick: sluit })),
      h("h3", { style: "margin:0;font:700 12px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--gold-3)" }, "Eigen inhoud"),
      h("div", { class: "kiezer-raster" }, INHOUD_TYPES.map(kaart)),
      h("h3", { style: "margin:6px 0 0;font:700 12px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--gold-3)" }, "Onderdelen van de site"),
      h("div", { class: "kiezer-raster" }, SITE_TYPES.map(kaart))));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  let sleepVan = null;
  function tekenLijst(paneel) {
    const p = huidigePagina();
    paneel.append(
      h("div", { style: "display:flex;justify-content:space-between;align-items:start;gap:12px" },
        h("div", {}, h("h3", {}, "Pagina"), h("h2", {}, paginaNaam(S.huidige))),
        h("button", { class: "b-btn klein", html: I.tandwiel + " Pagina-instellingen", onclick: () => { S.view = { type: "pagina" }; tekenPaneel(); } })),
      h("p", { class: "uitleg" }, "Klik op een blok om het aan te passen, of klik in het voorbeeld. Sleep blokken aan het handvat om de volgorde te veranderen."));
    const lijst = h("ul", { class: "blokken" });
    const tussen = i => h("li", { class: "tussen" }, h("button", { type: "button", onclick: () => blokKiezer(i) }, "+ Blok invoegen"));
    lijst.append(tussen(0));
    p.blokken.forEach((b, i) => {
      const rij = h("li", {
        class: "blok-rij" + (S.view.type === "blok" && S.view.i === i ? " gekozen" : ""), draggable: "true", tabindex: "0",
        onclick: e => { if (e.target.closest("button")) return; S.view = { type: "blok", i }; tekenPaneel(); markeerGekozen(true); },
        onkeydown: e => { if (e.key === "Enter") { S.view = { type: "blok", i }; tekenPaneel(); markeerGekozen(true); } },
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
          verplaats(sleepVan, naar);
          sleepVan = null;
        }
      },
        h("span", { class: "greep", html: I.greep, title: "Slepen om te verplaatsen" }),
        h("div", { style: "min-width:0" }, h("div", { class: "blok-naam" }, (BLOKKEN[b.type] || {}).label || b.type), h("div", { class: "blok-samenvatting" }, samenvatting(b))),
        h("div", { class: "blok-knoppen" },
          h("button", { type: "button", class: "icoonknop", "aria-label": "Omhoog", disabled: i === 0 || null, html: I.op, onclick: () => verplaats(i, i - 1) }),
          h("button", { type: "button", class: "icoonknop", "aria-label": "Omlaag", disabled: i === p.blokken.length - 1 || null, html: I.neer, onclick: () => verplaats(i, i + 1) })));
      lijst.append(rij, tussen(i + 1));
    });
    paneel.append(lijst, h("button", { type: "button", class: "toevoegen-groot", html: I.plus + " Blok toevoegen onderaan", onclick: () => blokKiezer(p.blokken.length) }));
  }

  function tekenBlok(paneel) {
    const lijst = huidigePagina().blokken;
    const i = S.view.i, b = lijst[i];
    if (!b) { S.view = { type: "lijst" }; return tekenLijst(paneel); }
    const def = BLOKKEN[b.type] || { label: b.type, velden: [] };
    paneel.append(
      h("button", { type: "button", class: "b-link terug", html: I.terug + " Alle blokken", onclick: () => { S.view = { type: "lijst" }; tekenPaneel(); markeerGekozen(); } }),
      h("div", {}, h("h3", {}, `Blok ${i + 1} van ${lijst.length}`), h("h2", {}, def.label)),
      def.omschrijving ? h("p", { class: "uitleg" }, def.omschrijving) : null);
    if (b.type === "verwacht" || b.type === "contact") paneel.append(h("button", { type: "button", class: "b-btn", html: I.tandwiel + " Naar de instellingen", onclick: () => { S.view = { type: "instellingen" }; tekenPaneel(); } }));
    if (!def.velden.length && b.type !== "verwacht" && b.type !== "contact") paneel.append(h("div", { class: "info" }, "Dit blok heeft geen eigen tekst om aan te passen. Je kunt het wel verplaatsen of weghalen."));
    for (const v of def.velden) paneel.append(veld(v, b, () => { }));
    const bevestig = h("div", { class: "bevestig", hidden: true }, "Dit blok verwijderen?",
      h("button", { type: "button", class: "b-btn klein gevaar", onclick: () => { voorWijziging(); lijst.splice(i, 1); S.view = { type: "lijst" }; gewijzigd(); tekenPaneel(); } }, "Ja, verwijderen"),
      h("button", { type: "button", class: "b-btn klein", onclick: () => { bevestig.hidden = true; } }, "Nee"));
    paneel.append(h("div", { class: "acties" },
      h("button", { type: "button", class: "b-btn klein", html: I.op + " Omhoog", disabled: i === 0 || null, onclick: () => { verplaats(i, i - 1); markeerGekozen(true); } }),
      h("button", { type: "button", class: "b-btn klein", html: I.neer + " Omlaag", disabled: i === lijst.length - 1 || null, onclick: () => { verplaats(i, i + 1); markeerGekozen(true); } }),
      h("button", { type: "button", class: "b-btn klein gevaar", style: "margin-left:auto", onclick: () => { bevestig.hidden = false; } }, "Blok verwijderen")), bevestig);
  }

  function tekenPaginaInstellingen(paneel) {
    const id = S.huidige, d = huidigePagina();
    const vast = VASTE_PAGINAS.includes(id);
    paneel.append(
      h("button", { type: "button", class: "b-link terug", html: I.terug + " Alle blokken", onclick: () => { S.view = { type: "lijst" }; tekenPaneel(); } }),
      h("div", {}, h("h3", {}, "Pagina-instellingen"), h("h2", {}, paginaNaam(id))),
      veld({ naam: "titel", label: "Naam van de pagina", type: "regel", hulp: "Staat in het menu en bovenaan het browservenster." }, d, () => vernieuwVoorbeeld(true)));
    if (id !== "start" && id !== "contact") {
      paneel.append(veld({ naam: "inMenu", label: "Toon in het menu", type: "aanuit" }, d, () => { vernieuwVoorbeeld(true); tekenPaneel(); }));
      if (d.inMenu) {
        const items = menu().filter(m => m.key !== id);
        const sel = h("select", { id: "menuplaats" });
        sel.append(h("option", { value: "-1" }, "Helemaal vooraan"));
        items.forEach((m, j) => sel.append(h("option", { value: String(j), selected: (Number(d.menuVolgorde ?? 50) > m.order && (!items[j + 1] || Number(d.menuVolgorde ?? 50) < items[j + 1].order)) || null }, `Na “${m.label}”`)));
        sel.addEventListener("change", () => {
          const j = Number(sel.value);
          const voor = j < 0 ? (items[0] ? items[0].order - 10 : 0) : items[j].order;
          const na = items[j + 1] ? items[j + 1].order : voor + 20;
          voorWijziging(); d.menuVolgorde = j < 0 ? voor : (voor + na) / 2; gewijzigd(true);
        });
        paneel.append(h("div", { class: "veld" }, h("label", { for: "menuplaats" }, "Plaats in het menu"), sel));
      }
    }
    paneel.append(veld({ naam: "omschrijving", label: "Korte omschrijving voor Google", type: "tekst", hulp: "Eén of twee zinnen. Bezoekers zien dit in zoekresultaten." }, d));
    paneel.append(h("div", { class: "info" }, "Adres: ", h("a", { href: SITE_ROOT + paginaBestand(id), target: "_blank", rel: "noopener" }, SITE_ROOT.replace(/^https?:\/\//, "") + paginaBestand(id))));
    if (!vast) {
      const bevestig = h("div", { class: "bevestig", hidden: true }, "Deze pagina verwijderen?",
        h("button", { type: "button", class: "b-btn klein gevaar", onclick: () => { voorWijziging(); S.verwijderd.add(id); S.huidige = "start"; S.view = { type: "lijst" }; tekenAlles(true); } }, "Ja, verwijderen"),
        h("button", { type: "button", class: "b-btn klein", onclick: () => { bevestig.hidden = true; } }, "Nee"));
      paneel.append(h("div", { class: "acties" }, h("button", { type: "button", class: "b-btn klein gevaar", onclick: () => { bevestig.hidden = false; } }, "Pagina verwijderen")), bevestig);
    }
  }

  function tekenSiteInstellingen(paneel) {
    const s = S.site;
    s.verwacht = s.verwacht || {}; s.contact = s.contact || {}; s.paginafotos = s.paginafotos || {};
    paneel.append(
      h("button", { type: "button", class: "b-link terug", html: I.terug + " Terug naar de pagina", onclick: () => { S.view = { type: "lijst" }; tekenPaneel(); } }),
      h("div", {}, h("h3", {}, "Hele site"), h("h2", {}, "Instellingen")),
      h("p", { class: "uitleg" }, "Deze gegevens staan op meerdere plaatsen op de site en gelden overal."),
      h("h3", { style: "margin-top:6px" }, "Verwachte nesten"),
      veld({ naam: "tonen", label: "Aankondiging tonen op de site", type: "aanuit" }, s.verwacht, () => vernieuwVoorbeeld(true)),
      veld({ naam: "label", label: "Klein opschrift (bv. Verwacht in 2027)", type: "regel" }, s.verwacht, () => vernieuwVoorbeeld(true)),
      veld({ naam: "titel", label: "Titel", type: "regel", hulp: "Zet *sterretjes* rond een woord om het goud en schuin te maken." }, s.verwacht),
      veld({ naam: "tekst", label: "Tekst", type: "tekst" }, s.verwacht),
      h("h3", { style: "margin-top:10px" }, "Contactgegevens"),
      veld({ naam: "telefoon", label: "Telefoon", type: "regel" }, s.contact, () => vernieuwVoorbeeld(true)),
      veld({ naam: "email", label: "E-mailadres", type: "regel" }, s.contact, () => vernieuwVoorbeeld(true)),
      veld({ naam: "plaats", label: "Postcode en gemeente", type: "regel" }, s.contact, () => vernieuwVoorbeeld(true)),
      veld({ naam: "instagram", label: "Link naar Instagram", type: "regel" }, s.contact, () => vernieuwVoorbeeld(true)),
      veld({ naam: "facebook", label: "Link naar Facebook", type: "regel" }, s.contact, () => vernieuwVoorbeeld(true)),
      h("h3", { style: "margin-top:10px" }, "Foto bovenaan de vaste pagina's"),
      veld({ naam: "honden", label: "Onze honden", type: "foto" }, s.paginafotos),
      veld({ naam: "nesten", label: "Nesten", type: "foto" }, s.paginafotos),
      veld({ naam: "nieuws", label: "Nieuws", type: "foto" }, s.paginafotos),
      h("div", { class: "info" }, "Wedstrijdverslagen, honden en nesten pas je aan in Pages CMS: ", h("a", { href: "https://app.pagescms.org", target: "_blank", rel: "noopener" }, "app.pagescms.org"), "."));
  }

  function tekenPaneel() {
    const paneel = $("#paneel-in");
    if (!paneel) return;
    const scroll = $("#paneel").scrollTop;
    paneel.innerHTML = "";
    if (S.view.type === "blok") tekenBlok(paneel);
    else if (S.view.type === "pagina") tekenPaginaInstellingen(paneel);
    else if (S.view.type === "instellingen") tekenSiteInstellingen(paneel);
    else tekenLijst(paneel);
    if (S.view.type === "lijst") $("#paneel").scrollTop = scroll;
    else $("#paneel").scrollTop = 0;
    $("#knop-instellingen") && $("#knop-instellingen").classList.toggle("actief", S.view.type === "instellingen");
  }

  /* ---------- Bovenbalk ---------- */
  function paginaKeuze() {
    const sel = h("select", { "aria-label": "Pagina kiezen" });
    const ids = Object.keys(S.paginas).filter(id => !S.verwijderd.has(id))
      .sort((a, b) => (VASTE_PAGINAS.indexOf(a) + 1 || 99) - (VASTE_PAGINAS.indexOf(b) + 1 || 99) || paginaNaam(a).localeCompare(paginaNaam(b)));
    for (const id of ids) sel.append(h("option", { value: id, selected: id === S.huidige || null }, paginaNaam(id)));
    sel.append(h("option", { value: "__nieuw" }, "+ Nieuwe pagina…"));
    sel.addEventListener("change", () => {
      if (sel.value === "__nieuw") { sel.value = S.huidige; return nieuwePagina(); }
      S.huidige = sel.value; S.view = { type: "lijst" };
      tekenPaneel(); vernieuwVoorbeeld(true);
    });
    return sel;
  }
  function nieuwePagina() {
    const dlg = h("dialog", { class: "kiezer" });
    const input = h("input", { type: "text", id: "nieuwe-naam", placeholder: "bijvoorbeeld Flyball" });
    const fout = h("div", { class: "fout-tekst", hidden: true });
    const sluit = () => { dlg.close(); dlg.remove(); };
    const maak = () => {
      const naam = input.value.trim();
      const id = slug(naam);
      if (!id) { fout.textContent = "Geef de pagina een naam."; fout.hidden = false; return; }
      if (GERESERVEERD.has(id) || id.startsWith("hond-") || (S.paginas[id] && !S.verwijderd.has(id))) { fout.textContent = "Die naam bestaat al. Kies een andere naam."; fout.hidden = false; return; }
      voorWijziging();
      const laatste = Math.max(40, ...menu().map(m => m.order));
      S.verwijderd.delete(id);
      S.paginas[id] = { isNew: true, sha: null, data: { titel: naam, inMenu: true, menuVolgorde: laatste + 10, omschrijving: "", blokken: [{ type: "paginakop", bovenschrift: "Vai Avanti", titel: naam, intro: "", foto: "" }, { type: "tekst", ...kloon(BLOKKEN.tekst.nieuw) }] } };
      S.huidige = id; S.view = { type: "lijst" };
      sluit();
      tekenAlles(true);
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") maak(); });
    dlg.append(h("div", { class: "kiezer-in" },
      h("header", {}, h("h2", { style: "margin:0;font:600 28px/1.1 var(--serif)" }, "Nieuwe pagina"), h("button", { class: "icoonknop", "aria-label": "Sluiten", html: I.weg, onclick: sluit })),
      h("div", { class: "veld" }, h("label", { for: "nieuwe-naam" }, "Naam van de pagina"), input, h("div", { class: "hulp" }, "De pagina komt in het menu. Je kunt dat later nog veranderen bij Pagina-instellingen."), fout),
      h("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, h("button", { class: "b-btn", onclick: sluit }, "Annuleren"), h("button", { class: "b-btn donker", onclick: maak }, "Pagina maken"))));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    input.focus();
  }
  // Soorten: "" opgeslagen · "bezig" (opslaan of foto klaarmaken, knop uit) · "publiceren" · "ok" · "fout"
  function werkStatusBij(tekst, soort) {
    if (tekst !== undefined) S.status = { tekst, soort: soort || "" };
    const vuil = isVuil();
    let toon = S.status;
    if (toon.soort !== "bezig" && vuil) toon = { tekst: "Niet opgeslagen wijzigingen", soort: "vuil" };
    const el = $("#status");
    if (el) { el.textContent = toon.tekst; el.className = "status " + toon.soort; }
    const knop = $("#knop-opslaan");
    if (knop) knop.disabled = toon.soort === "bezig" || !vuil;
  }
  function werkTabsBij() {
    const werk = $(".werk");
    if (werk) werk.dataset.tab = S.tab;
    document.querySelectorAll(".mobiel-tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === S.tab)));
    schaalVoorbeeld();
  }

  /* ---------- Opslaan ---------- */
  async function opslaan() {
    if (!S.token || S.demo) return melding("Opslaan kan pas met een koppelcode. Vraag die aan Keanu.");
    const { bestanden, weg } = wijzigingen();
    if (!bestanden.length && !weg.length) return melding("Er is niets gewijzigd.");
    werkStatusBij("Bezig met opslaan…", "bezig");
    try {
      // Heeft iemand anders deze bestanden intussen aangepast?
      for (const b of bestanden.filter(b => b.tekst && b.sha)) {
        const nu = await gh(`contents/${b.pad}?ref=${REPO.branch}`).catch(e => e.status === 404 ? null : Promise.reject(e));
        if (nu && nu.sha !== b.sha && !confirm(`Iemand anders heeft "${b.pad.split("/").pop()}" intussen aangepast. Toch opslaan? Hun wijziging gaat dan verloren.\n\nKies Annuleren om eerst opnieuw te laden.`)) {
          werkStatusBij("Niet opgeslagen", "fout");
          return;
        }
      }
      const namen = [...new Set(bestanden.filter(b => b.id).map(b => paginaNaam(b.id)))];
      const bericht = namen.length === 1 ? `Pagina "${namen[0]}" aangepast via beheer` : "Website aangepast via beheer";
      const sha = await bewaarBestanden(bestanden, weg, bericht);
      for (const b of bestanden) {
        if (b.upload) S.uploads[b.upload].opgeslagen = true;
        else if (b.id) { S.paginas[b.id].sha = b.sha; S.paginas[b.id].isNew = false; }
        else if (b.pad === "inhoud/site.json") S.siteSha = b.sha;
      }
      for (const p of weg) delete S.paginas[p.split("/").pop().replace(/\.json$/, "")];
      S.verwijderd = new Set();
      onthoudOrigineel();
      werkStatusBij("Opgeslagen · wordt gepubliceerd…", "publiceren");
      volgPublicatie(sha);
    } catch (e) {
      console.error(e);
      werkStatusBij("Opslaan mislukt", "fout");
      melding(e.status === 401 || e.status === 403 ? "De koppelcode werkt niet (meer). Vraag Keanu om een nieuwe." : `Opslaan mislukt: ${e.detail || e.message}. Probeer het opnieuw.`);
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
            melding(h("span", {}, "Je wijzigingen staan online. ", h("a", { href: SITE_ROOT + paginaBestand(S.huidige), target: "_blank", rel: "noopener" }, "Bekijk de pagina")));
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
  function tekenAlles(volledig) {
    const app = $("#app");
    app.innerHTML = "";
    const balk = h("header", { class: "balk" },
      h("span", { class: "brand-logo", role: "img", "aria-label": "Vai Avanti" }),
      h("span", { class: "titel" }, "Beheer"),
      paginaKeuze(),
      h("button", { class: "b-btn verberg-smal", id: "knop-instellingen", html: I.tandwiel + " Instellingen", onclick: () => { S.view = { type: "instellingen" }; S.tab = "bewerken"; tekenPaneel(); werkTabsBij(); } }),
      h("div", { class: "weergave", role: "group", "aria-label": "Voorbeeld als" },
        h("button", { "aria-pressed": String(S.weergave === "computer"), onclick: e => { S.weergave = "computer"; e.target.parentNode.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === e.target))); schaalVoorbeeld(); } }, "Computer"),
        h("button", { "aria-pressed": String(S.weergave === "gsm"), onclick: e => { S.weergave = "gsm"; e.target.parentNode.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === e.target))); schaalVoorbeeld(); } }, "Gsm")),
      h("span", { class: "ruimte" }),
      h("span", { class: "status", id: "status" }),
      h("button", { class: "b-btn", title: "Ongedaan maken (Ctrl+Z)", "aria-label": "Ongedaan maken", html: I.ongedaan, onclick: ongedaanMaken }),
      h("a", { class: "b-btn verberg-smal", href: SITE_ROOT + paginaBestand(S.huidige), target: "_blank", rel: "noopener", html: "Bekijk site " + I.extern }),
      h("button", { class: "b-btn goud", id: "knop-opslaan", onclick: opslaan }, S.demo ? "Opslaan (niet beschikbaar)" : "Opslaan"),
      h("div", { class: "mobiel-tabs" },
        h("button", { "data-tab": "bewerken", onclick: () => { S.tab = "bewerken"; werkTabsBij(); } }, "Bewerken"),
        h("button", { "data-tab": "voorbeeld", onclick: () => { S.tab = "voorbeeld"; werkTabsBij(); } }, "Voorbeeld"),
        h("button", { onclick: () => { S.view = { type: "instellingen" }; S.tab = "bewerken"; tekenPaneel(); werkTabsBij(); } }, "Instellingen")));
    const werk = h("div", { class: "werk", "data-tab": S.tab },
      h("section", { class: "voorbeeld", "aria-label": "Voorbeeld van de pagina" },
        h("div", { class: "voorbeeld-kader" }, h("iframe", { id: "voorbeeld-frame", title: "Voorbeeld" })),
        h("div", { class: "voorbeeld-tip" }, "Klik op een deel van de pagina om het aan te passen")),
      h("aside", { class: "paneel", id: "paneel" }, h("div", { class: "paneel-in", id: "paneel-in" })));
    app.append(balk, werk);
    document.documentElement.style.setProperty("--balk-h", balk.offsetHeight + "px");
    voorbeeldDoc = null;
    tekenPaneel();
    werkStatusBij();
    werkTabsBij();
    vernieuwVoorbeeld(true);
    setTimeout(() => { const tip = $(".voorbeeld-tip"); if (tip) tip.remove(); }, 6000);
  }

  function aanmelden(fout) {
    const app = $("#app");
    app.innerHTML = "";
    const input = h("input", { type: "password", id: "code", autocomplete: "off", placeholder: "github_pat_…" });
    const foutEl = h("div", { class: "fout-tekst", hidden: !fout || null }, fout || "");
    const knop = h("button", { class: "b-btn donker vol", type: "submit" }, "Koppelen");
    const form = h("form", { class: "aanmelden-kaart", onsubmit: async e => {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) return;
      knop.disabled = true; knop.textContent = "Even controleren…";
      S.token = code;
      try {
        const repo = await gh("");
        if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error("geen schrijfrechten"), { status: 403 });
        opslag.set(SLEUTEL, code);
        await start();
      } catch (err) {
        S.token = null;
        aanmelden(err.status === 401 ? "Deze koppelcode klopt niet. Kijk ze nog eens na." : err.status === 403 ? "Deze koppelcode mag niets opslaan. Vraag Keanu om een nieuwe." : "Er ging iets mis. Is er internet?");
      }
    } },
      h("div", { class: "logo-vlak" }, h("span", { class: "brand-logo", role: "img", "aria-label": "Vai Avanti" })),
      h("h1", {}, "Beheer"),
      h("p", {}, "Om wijzigingen op te slaan heb je een koppelcode nodig. Die krijg je van Keanu en geef je maar één keer in op dit toestel."),
      h("div", { class: "veld" }, h("label", { for: "code" }, "Koppelcode"), input),
      foutEl, knop,
      h("button", { type: "button", class: "b-link", style: "justify-self:center", onclick: () => { S.demo = true; start(); } }, "Eerst rondkijken zonder op te slaan"),
      h("details", {}, h("summary", {}, "Hoe maak ik een koppelcode? (voor Keanu)"), h("ol", {},
        h("li", {}, "GitHub → profielfoto → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token."),
        h("li", {}, `Naam: "Beheer Vai Avanti". Kies een vervaldatum (bijvoorbeeld 1 jaar).`),
        h("li", {}, `Repository access: Only select repositories → ${REPO.repo}.`),
        h("li", {}, "Permissions → Repository permissions: Contents op Read and write, en Actions op Read-only. (Metadata staat automatisch op Read.)"),
        h("li", {}, "Generate token, kopieer de code en geef ze hier in op Shany's toestel.")))
    );
    app.append(h("div", { class: "aanmelden" }, form));
    input.focus();
  }

  async function start() {
    $("#app").innerHTML = '<p style="padding:24px">Inhoud wordt geladen…</p>';
    try {
      await laad();
      tekenAlles(true);
      if (S.demo) melding("Je kijkt rond zonder koppelcode: alles werkt, behalve opslaan.");
    } catch (e) {
      console.error(e);
      if (e.status === 401) { opslag.del(SLEUTEL); S.token = null; return aanmelden("Deze koppelcode werkt niet meer. Vraag Keanu om een nieuwe."); }
      $("#app").innerHTML = "";
      $("#app").append(h("div", { class: "aanmelden" }, h("div", { class: "aanmelden-kaart" }, h("h1", {}, "Laden mislukt"), h("p", {}, "De inhoud kon niet geladen worden. Controleer de internetverbinding en probeer opnieuw."), h("button", { class: "b-btn donker", onclick: () => location.reload() }, "Opnieuw proberen"))));
    }
  }

  /* ---------- Toetsen en vertrekken ---------- */
  window.addEventListener("resize", () => { const b = $(".balk"); if (b) document.documentElement.style.setProperty("--balk-h", b.offsetHeight + "px"); schaalVoorbeeld(); });
  window.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); opslaan(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.target.closest("input,textarea")) { e.preventDefault(); ongedaanMaken(); }
  });
  window.addEventListener("beforeunload", e => { if (S.data && isVuil()) { e.preventDefault(); e.returnValue = ""; } });

  S.token = opslag.get(SLEUTEL);
  if (S.token) start(); else aanmelden();
})();
