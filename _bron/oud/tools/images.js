// Downloadt alle foto's uit ../data/fotos.json en maakt per foto twee webp-versies:
//   ../../site/img/<id>.webp    (max 1600 px, voor grote weergave)
//   ../../site/img/t/<id>.webp  (max 640 px, voor kaarten en overzichten)
// Bestaande bestanden worden overgeslagen. Gebruik: node images.js
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "raw-img");
const OUT = path.join(ROOT, "..", "site", "img");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PARALLEL = 6;

const fotos = require(path.join(ROOT, "data", "fotos.json"));
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(path.join(OUT, "t"), { recursive: true });

const run = (args) => new Promise((res, rej) =>
  execFile(CHROME, args, { maxBuffer: 1 << 27 }, (err, out) => err ? rej(err) : res(out)));

async function convert(id, rawFile, slot) {
  const page = path.join(RAW, `_c${slot}.html`);
  fs.writeFileSync(page, `<!doctype html><body><script>
const im = new Image();
im.onload = () => {
  const enc = max => { const s = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", max > 1000 ? 0.8 : 0.76).split(",")[1]; };
  document.body.textContent = "B6" + "4:" + enc(1600) + "|" + enc(640) + "|" + im.width + "x" + im.height + ":E" + "ND";
};
im.onerror = () => { document.body.textContent = "ERR" + "OR"; };
im.src = ${JSON.stringify(path.basename(rawFile))};
</script></body>`);
  const dom = await run(["--headless=new", "--disable-gpu", "--allow-file-access-from-files",
    "--user-data-dir=" + path.join(RAW, "_chrome" + slot), "--virtual-time-budget=10000", "--dump-dom",
    "file:///" + page.replace(/\\/g, "/")]);
  const a = dom.indexOf("B64:"), b = dom.indexOf(":END");
  if (a < 0 || b < 0) throw new Error("omzetten mislukt voor " + id);
  const [full, thumb, size] = dom.slice(a + 4, b).split("|");
  fs.writeFileSync(path.join(OUT, id + ".webp"), Buffer.from(full, "base64"));
  fs.writeFileSync(path.join(OUT, "t", id + ".webp"), Buffer.from(thumb, "base64"));
  return size;
}

async function main() {
  const ids = Object.keys(fotos).filter(id => !fs.existsSync(path.join(OUT, id + ".webp")));
  console.log(ids.length + " foto's te verwerken");
  const sizes = {};
  let next = 0, done = 0;
  const worker = async slot => {
    while (next < ids.length) {
      const id = ids[next++];
      const url = fotos[id].startsWith("http") ? fotos[id] : "https:" + fotos[id];
      const ext = (url.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i) || [".jpg"])[0].toLowerCase();
      const rawFile = path.join(RAW, id + ext);
      if (!fs.existsSync(rawFile)) {
        const res = await fetch(url);
        if (!res.ok) { console.log("download mislukt", id, res.status); continue; }
        fs.writeFileSync(rawFile, Buffer.from(await res.arrayBuffer()));
      }
      try { sizes[id] = await convert(id, rawFile, slot); } catch (e) { console.log(e.message); }
      if (++done % 20 === 0) console.log(done + "/" + ids.length);
    }
  };
  await Promise.all([...Array(PARALLEL).keys()].map(worker));
  // Afmetingen bijhouden (handig voor beeldverhoudingen)
  const sizeFile = path.join(ROOT, "data", "fotomaten.json");
  const all = fs.existsSync(sizeFile) ? JSON.parse(fs.readFileSync(sizeFile, "utf8")) : {};
  Object.assign(all, sizes);
  fs.writeFileSync(sizeFile, JSON.stringify(all, null, 1));
  const total = fs.readdirSync(OUT).filter(f => f.endsWith(".webp"))
    .reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
  console.log("klaar:", Object.keys(all).length, "foto's, groot formaat samen", Math.round(total / 1048576), "MB");
}
main().catch(e => { console.error(e); process.exit(1); });
