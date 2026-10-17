// Bezoekersteller voor www.vai-avanti.be (Cloudflare Worker + D1, gratis abonnement).
// Telt zonder cookies en bewaart niets per bezoeker: enkel totalen per dag.
//
// POST /tel      vanuit site.js (navigator.sendBeacon), tekst met JSON:
//                { p: pad, r: host van de verwijzende site, b: bron uit de link (utm_source, fbclid...),
//                  t: taal van de pagina, g: "gsm" | "tablet" | "computer", n: 1 bij het begin van een bezoek }
// GET  /cijfers  vanuit de beheer (?van=JJJJ-MM-DD&tot=JJJJ-MM-DD), met de GitHub-koppelcode van de beheer:
//                wie mag opslaan in de website-repo, mag de cijfers zien.
//
// Tabel tellingen(dag, soort, sleutel, aantal); soorten: weergaven, pagina, bezoeken, land, bron, taal, toestel.

const SITES = ["https://www.vai-avanti.be", "https://vai-avanti.be"];
const REPO = "vercauterenkeanu-create/website";
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|curl|wget|python|node-fetch|go-http/i;
const TALEN = ["nl", "en", "de", "it", "fi", "da"];
const TOESTELLEN = ["gsm", "tablet", "computer"];

// Verwijzende site -> leesbare bron
const BRONNEN = [
  [/(^|\.)google\.[a-z.]+$/, "Google"], [/(^|\.)bing\.com$/, "Bing"], [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.[a-z.]+$/, "Yahoo"], [/(^|\.)ecosia\.org$/, "Ecosia"], [/(^|\.)qwant\.com$/, "Qwant"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "Facebook"], [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"], [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"], [/(^|\.)pinterest\.[a-z.]+$/, "Pinterest"], [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)whatsapp\.com$/, "WhatsApp"], [/(^|\.)reddit\.com$/, "Reddit"], [/(^|\.)breedarchive\.com$/, "Breed Archive"],
  [/(^|\.)webnode\.[a-z.]+$/, "Oude website"]
];
const BRON_CODES = { fb: "Facebook", facebook: "Facebook", fbclid: "Facebook", ig: "Instagram", instagram: "Instagram", igshid: "Instagram", gclid: "Google Ads", google: "Google", whatsapp: "WhatsApp", wa: "WhatsApp", nieuwsbrief: "Nieuwsbrief", newsletter: "Nieuwsbrief", mail: "E-mail", email: "E-mail" };

function bronVan(r, b) {
  if (b) return BRON_CODES[b.toLowerCase()] || b.slice(0, 40);
  if (!r) return "Rechtstreeks";
  const host = r.toLowerCase().replace(/^www\./, "");
  for (const [re, naam] of BRONNEN) if (re.test(host)) return naam;
  return host.slice(0, 60);
}
const vandaag = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const tekst = (v, max) => String(v || "").slice(0, max);

function toegestaan(origin, env) {
  const extra = String(env.TEST_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return [...SITES, ...extra].includes(origin);
}
function cors(origin, env) {
  return toegestaan(origin, env) ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" } : {};
}
const json = (data, status, kop) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...kop } });

async function tel(request, env) {
  const origin = request.headers.get("Origin") || "";
  let van = origin;
  if (!van) { try { van = new URL(request.headers.get("Referer") || "").origin; } catch (e) { van = ""; } }
  if (!toegestaan(van, env) || BOT.test(request.headers.get("User-Agent") || "")) return new Response(null, { status: 204 });
  const ruw = await request.text();
  if (ruw.length > 1000) return new Response(null, { status: 204 });
  let d;
  try { d = JSON.parse(ruw); } catch (e) { return new Response(null, { status: 204 }); }
  const pad = tekst(d.p, 100).toLowerCase().replace(/[^a-z0-9/._-]/g, "") || "/";
  const dag = vandaag();
  const stap = env.DB.prepare("INSERT INTO tellingen (dag, soort, sleutel, aantal) VALUES (?1, ?2, ?3, 1) ON CONFLICT (dag, soort, sleutel) DO UPDATE SET aantal = aantal + 1");
  const rijen = [stap.bind(dag, "weergaven", ""), stap.bind(dag, "pagina", pad)];
  if (d.n) {
    const land = String((request.cf && request.cf.country) || "XX").toUpperCase().slice(0, 2);
    rijen.push(
      stap.bind(dag, "bezoeken", ""),
      stap.bind(dag, "land", land),
      stap.bind(dag, "bron", bronVan(tekst(d.r, 120), tekst(d.b, 40))),
      stap.bind(dag, "taal", TALEN.includes(d.t) ? d.t : "nl"),
      stap.bind(dag, "toestel", TOESTELLEN.includes(d.g) ? d.g : "computer"));
  }
  await env.DB.batch(rijen);
  return new Response(null, { status: 204 });
}

// Wie de koppelcode van de beheer heeft (schrijfrechten op de repo), mag de cijfers zien. 10 minuten onthouden.
const goedgekeurd = new Map();
async function magKijken(request, env) {
  const code = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!code) return false;
  if (env.TEST_CODE && code === env.TEST_CODE) return true; // enkel lokaal (.dev.vars)
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)))].map(b => b.toString(16).padStart(2, "0")).join("");
  if ((goedgekeurd.get(hash) || 0) > Date.now()) return true;
  const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Authorization: `Bearer ${code}`, Accept: "application/vnd.github+json", "User-Agent": "vai-avanti-teller" } });
  if (!res.ok) return false;
  const repo = await res.json();
  if (!repo.permissions || !repo.permissions.push) return false;
  goedgekeurd.set(hash, Date.now() + 10 * 60 * 1000);
  return true;
}

async function cijfers(request, env, kop) {
  if (!(await magKijken(request, env))) return json({ fout: "Geen toegang" }, 401, kop);
  const url = new URL(request.url);
  const datum = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s : null;
  const tot = datum(url.searchParams.get("tot")) || vandaag();
  const van = datum(url.searchParams.get("van")) || "2000-01-01";
  const [rijen, eerste] = await Promise.all([
    env.DB.prepare("SELECT dag, soort, sleutel, aantal FROM tellingen WHERE dag BETWEEN ?1 AND ?2").bind(van, tot).all(),
    env.DB.prepare("SELECT MIN(dag) AS sinds FROM tellingen").first()
  ]);
  return json({ van, tot, vandaag: vandaag(), sinds: eerste && eerste.sinds, rijen: rijen.results.map(r => [r.dag, r.soort, r.sleutel, r.aantal]) }, 200, kop);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kop = cors(request.headers.get("Origin") || "", env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: kop });
    try {
      if (url.pathname === "/tel" && request.method === "POST") return await tel(request, env);
      if (url.pathname === "/cijfers" && request.method === "GET") return await cijfers(request, env, kop);
      return json({ fout: "Niet gevonden" }, 404, kop);
    } catch (e) {
      return json({ fout: "Er ging iets mis" }, 500, kop);
    }
  }
};
