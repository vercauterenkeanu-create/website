/* Vai Avanti – gedeelde scripts voor alle pagina's */
(function () {
  /* ---------- Instellingen ----------
     Gratis sleutel van https://web3forms.com: vul het e-mailadres in waarop berichten moeten
     toekomen, de sleutel komt per mail. Leeg = formulier opent het e-mailprogramma. */
  const WEB3FORMS_KEY = "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Talen ----------
     De bouwstap vult TEKSTEN met de vertalingen van de teksten hieronder, per taal. */
  const TEKSTEN = {};
  const TAAL = document.documentElement.lang.slice(0, 2) || "nl";
  // T("Deze website is ook in jouw taal beschikbaar.") wordt hieronder per taal opgezocht
  const T = (s, v) => String((TEKSTEN[TAAL] || {})[s] || s).replace(/\{([a-z]+)\}/g, (m, k) => v && k in v ? v[k] : m);

  /* ---------- Diavoorstelling in de koppen ---------- */
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) $$(".slides").forEach(box => {
    const beelden = $$("img", box);
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      beelden[i].classList.remove("on");
      i = (i + 1) % beelden.length;
      beelden[i].classList.add("on");
    }, (parseInt(box.dataset.wissel, 10) || 6) * 1000);
  });

  /* ---------- Taalkeuze ---------- */
  const keuze = $(".taalkeuze");
  if (keuze) {
    document.addEventListener("click", e => { if (keuze.open && !keuze.contains(e.target)) keuze.open = false; });
    keuze.addEventListener("click", e => {
      const a = e.target.closest("a[data-taal]");
      if (a) try { localStorage.setItem("va-taal", a.dataset.taal); } catch (x) { /* privévenster */ }
    });
    // Nog geen taal gekozen en de browser spreekt een andere taal van de site? Toon een kleine hint.
    let gekozen = null;
    try { gekozen = localStorage.getItem("va-taal"); } catch (x) { /* privévenster */ }
    const wens = (navigator.languages || [navigator.language || ""]).map(l => String(l).slice(0, 2).toLowerCase());
    const beschikbaar = $$("a[data-taal]", keuze);
    const doel = !gekozen && wens.map(w => beschikbaar.find(a => a.dataset.taal === w)).find(Boolean);
    if (doel && doel.dataset.taal !== TAAL) {
      const hint = document.createElement("div");
      hint.className = "taal-hint";
      hint.lang = doel.dataset.taal;
      hint.innerHTML = '<span></span><a></a><button type="button" aria-label="×">×</button>';
      const zin = "Deze website is ook in jouw taal beschikbaar.";
      hint.querySelector("span").textContent = (TEKSTEN[doel.dataset.taal] || {})[zin] || (doel.dataset.taal === "nl" ? zin : "");
      const link = hint.querySelector("a");
      link.href = doel.getAttribute("href");
      link.textContent = doel.textContent + " ›";
      link.addEventListener("click", () => { try { localStorage.setItem("va-taal", doel.dataset.taal); } catch (x) { /* privévenster */ } });
      hint.querySelector("button").addEventListener("click", () => { hint.remove(); try { localStorage.setItem("va-taal", TAAL); } catch (x) { /* privévenster */ } });
      document.body.append(hint);
    }
  }

  /* ---------- Header en menu ---------- */
  const header = $(".site-header");
  const toggle = $(".menu-toggle");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? T("Menu sluiten") : T("Menu openen"));
  });

  /* ---------- Zacht inschuiven ---------- */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 80 + "ms";
    revealObserver.observe(el);
  });

  /* ---------- Foto's groot bekijken ---------- */
  const ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
  };
  let lb, lbImg, lbCap, group = [], index = 0;
  function buildLightbox() {
    lb = document.createElement("dialog");
    lb.className = "lightbox";
    lb.setAttribute("aria-label", T("Foto"));
    lb.innerHTML = `<div class="lb-stage"><img alt=""></div>
      <button class="lb-btn lb-close" aria-label="${T("Sluiten")}">${ICON.x}</button>
      <button class="lb-btn lb-prev" aria-label="${T("Vorige foto")}">${ICON.prev}</button>
      <button class="lb-btn lb-next" aria-label="${T("Volgende foto")}">${ICON.next}</button>
      <div class="lb-caption" aria-live="polite"></div>`;
    document.body.appendChild(lb);
    lbImg = $(".lb-stage img", lb);
    lbCap = $(".lb-caption", lb);
    $(".lb-close", lb).onclick = () => lb.close();
    $(".lb-prev", lb).onclick = () => show(index - 1);
    $(".lb-next", lb).onclick = () => show(index + 1);
    lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-stage")) lb.close(); });
    lb.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }
  function show(i) {
    index = (i + group.length) % group.length;
    const el = group[index];
    lbImg.src = el.dataset.full;
    lbImg.alt = el.dataset.caption || "";
    lbCap.textContent = (el.dataset.caption || "") + (group.length > 1 ? `  ·  ${index + 1} / ${group.length}` : "");
    $(".lb-prev", lb).hidden = $(".lb-next", lb).hidden = group.length < 2;
  }
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-full]");
    if (!el) return;
    e.preventDefault();
    if (!lb) buildLightbox();
    group = el.dataset.group ? $$(`[data-full][data-group="${el.dataset.group}"]`) : [el];
    lb.showModal();
    show(group.indexOf(el));
  });

  /* ---------- Verslagen: filter, lees verder, directe links ---------- */
  const archive = $("#archive");
  if (archive) {
    const reports = $$(".report", archive);
    const chips = $$(".filter-chips button");
    const empty = $("#archive-empty");

    $$(".report-text").forEach(t => {
      const btn = t.nextElementSibling;
      if (!btn || !btn.classList.contains("more-btn")) return;
      if (t.scrollHeight <= t.clientHeight + 30) { t.classList.remove("clamped"); btn.remove(); return; }
      btn.addEventListener("click", () => {
        const open = t.classList.toggle("clamped") === false;
        btn.setAttribute("aria-expanded", open);
        btn.firstChild.textContent = (open ? T("Minder tonen") : T("Lees het volledige verslag")) + " ";
      });
    });

    function applyFilter(dog) {
      chips.forEach(c => c.setAttribute("aria-pressed", String(c.dataset.filter === dog)));
      let shown = 0;
      reports.forEach(r => {
        const ok = dog === "alle" || r.dataset.dogs.split(" ").includes(dog);
        r.hidden = !ok;
        if (ok) shown++;
      });
      $$(".year-block", archive).forEach(y => { y.hidden = !$$(".report", y).some(r => !r.hidden); });
      $$(".year-links a").forEach(a => { const y = $(a.getAttribute("href")); a.hidden = !y || y.hidden; });
      empty.hidden = shown > 0;
    }
    chips.forEach(c => c.addEventListener("click", () => {
      applyFilter(c.dataset.filter);
      try { history.replaceState(null, "", c.dataset.filter === "alle" ? "#archief" : "#hond-" + c.dataset.filter); } catch (e) { /* niet overal toegestaan */ }
    }));

    function fromHash() {
      const h = decodeURIComponent(location.hash.slice(1));
      if (h.startsWith("hond-") && chips.some(c => c.dataset.filter === h.slice(5))) { applyFilter(h.slice(5)); return; }
      const target = h && document.getElementById(h);
      if (target && target.classList.contains("report")) {
        applyFilter("alle");
        const t = $(".report-text.clamped", target);
        if (t) t.nextElementSibling?.click();
        setTimeout(() => target.scrollIntoView({ block: "start", behavior: "instant" }), 60);
      }
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
  }

  /* ---------- E-mailadres (niet leesbaar in de broncode, tegen spam) ---------- */
  const MAIL = ["vai-avanti", "hotmail.com"].join(String.fromCharCode(64));
  $$("[data-mail]").forEach(el => { el.textContent = MAIL; });
  $$("[data-mail-link]").forEach(a => { a.href = "mailto:" + MAIL; });

  /* ---------- Contactformulier met spambeveiliging ---------- */
  const form = $("#contact-form");
  if (form) {
    const status = $("#form-status");
    const submitBtn = $("#form-submit");
    const loadedAt = Date.now();
    const setStatus = (text, kind = "") => { status.textContent = text; status.className = kind; };

    const subjects = { nesten: 0, honden: 1 };
    const pick = location.hash.slice(1);
    const onderwerp = $("#onderwerp");
    if (onderwerp && pick in subjects && onderwerp.options.length > subjects[pick]) onderwerp.selectedIndex = subjects[pick];

    if (WEB3FORMS_KEY) {
      $("#captcha-slot").innerHTML = '<div class="h-captcha" data-captcha="true" data-lang="' + TAAL + '"></div>';
      const s = document.createElement("script");
      s.src = "https://web3forms.com/client/script.js";
      s.async = true;
      document.body.appendChild(s);
      setStatus(T("Beveiligd tegen spam."));
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const f = new FormData(form);
      // Bot herkend (lokveld ingevuld of te snel verstuurd): hetzelfde bedankje, niets versturen
      if (f.get("botcheck") || Date.now() - loadedAt < 3000) {
        form.reset();
        setStatus(T("Bedankt! Uw bericht is verstuurd."), "ok");
        return;
      }
      if (!WEB3FORMS_KEY) {
        setStatus(T("Het formulier is nog niet actief. Mail ons op {mail} of bel ons gerust.", { mail: MAIL }), "err");
        return;
      }
      if (!f.get("h-captcha-response")) {
        setStatus(T("Bevestig eerst dat u geen robot bent (het vakje boven de knop)."), "err");
        return;
      }
      f.delete("botcheck");
      f.append("access_key", WEB3FORMS_KEY);
      f.append("subject", "Website Vai Avanti" + (TAAL !== "nl" ? " (" + TAAL.toUpperCase() + ")" : "") + (f.get("onderwerp") ? ": " + f.get("onderwerp") : ""));
      f.append("from_name", "Website Vai Avanti");
      submitBtn.disabled = true;
      setStatus(T("Bericht wordt verstuurd…"));
      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.fromEntries(f))
        });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        window.hcaptcha?.reset();
        setStatus(T("Bedankt! Uw bericht is verstuurd. We antwoorden zo snel mogelijk."), "ok");
      } catch (err) {
        setStatus(T("Versturen lukte niet. Probeer het opnieuw of mail ons op {mail}.", { mail: MAIL }), "err");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
