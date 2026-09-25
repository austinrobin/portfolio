/*
 * Responsive variants for the case-study stills.
 *
 * For every public/case/<slug>/<name>.webp it writes <name>.w{640,960,1280,1920}.webp
 * (only the widths below the source's own width), same encoder settings as the
 * source (WebP q90) — a downscale, never an upscale, so the browser always gets
 * a file at least as sharp as the pixels it will paint. Also turns video posters
 * (<name>.jpg) into <name>.poster.webp capped at 1920px.
 *
 * Output manifest: content/media-variants.json  { "/case/x/y.webp": [640, 960, ...] }
 * Run after adding assets:  node scripts/media-variants.mjs
 */
import sharp from "sharp";
import { readdirSync, statSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const CASE = join(PUB, "case");
const WIDTHS = [640, 960, 1280, 1920];
const manifest = {};
const posters = {};
const videos = {};
const sizes = {}; // every media file's bytes — the CDN (jsDelivr) refuses files over 20MB
function sizeOf(p) { sizes["/" + relative(PUB, p).split("/").join("/")] = statSync(p).size; }
let made = 0, kept = 0;

function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (e === ".DS_Store") continue;
    sizeOf(p);
    if (/\.w\d+\.webp$/.test(e) || /\.poster\.webp$/.test(e)) continue;
    if (e.endsWith(".webp")) queue.push(["still", p]);
    if (e.endsWith(".jpg")) queue.push(["poster", p]);
    if (e.endsWith(".mp4") && !/\.(p1080|p1440|av1|hevc)(\.|$)/.test(e.replace(/\.mp4$/, "") + ".")) queue.push(["video", p]);
  }
}
const queue = [];
walk(CASE);
walk(join(PUB, "deck"));
for (const d of ["footer", "gallery"]) if (existsSync(join(PUB, d))) for (const e of readdirSync(join(PUB, d))) { const q = join(PUB, d, e); if (statSync(q).isFile() && e !== ".DS_Store") sizeOf(q); }
for (const e of ["hero-art.webp", "hero-face.webp", "current-coin.webp"]) if (existsSync(join(PUB, e))) sizeOf(join(PUB, e));

for (const [kind, p] of queue) {
  const url = "/" + relative(PUB, p).split("/").join("/");
  if (kind === "video") {
    const stem = p.replace(/\.mp4$/, "");
    // a codec companion only earns its place when it is at least 10% lighter
    // than the file it would replace — otherwise the H.264 is the better bet
    // …and only when ffprobe can read it: a file an encoder is still writing has no index yet
    const playable = (file) => {
      try { execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", file], { stdio: ["ignore", "pipe", "ignore"] }); return true; } catch { return false; }
    };
    const lighter = (file, than) => existsSync(file) && statSync(file).size < statSync(than).size * 0.9 && playable(file);
    const v = {};
    if (lighter(`${stem}.av1.mp4`, p)) v.av1 = true;
    if (lighter(`${stem}.hevc.mp4`, p)) v.hevc = true;
    // the phone cut too: a 1276px clip re-cut to 1080 saves nothing worth a second file
    if (lighter(`${stem}.p1080.mp4`, p)) {
      const ph = `${stem}.p1080.mp4`;
      v.p1080 = { h264: true, ...(lighter(`${stem}.p1080.av1.mp4`, ph) ? { av1: true } : {}), ...(lighter(`${stem}.p1080.hevc.mp4`, ph) ? { hevc: true } : {}) };
    }
    videos[url] = v;
    continue;
  }
  const meta = await sharp(p).metadata();
  if (kind === "still") {
    const widths = [];
    for (const w of WIDTHS) {
      if (w >= meta.width) continue;
      const out = p.replace(/\.webp$/, `.w${w}.webp`);
      widths.push(w);
      if (existsSync(out) && statSync(out).mtimeMs >= statSync(p).mtimeMs) { kept++; continue; }
      await sharp(p).resize({ width: w, withoutEnlargement: true, kernel: "lanczos3" }).webp({ quality: 90, effort: 6 }).toFile(out);
      made++;
    }
    manifest[url] = { w: meta.width, widths };
  } else {
    const out = p.replace(/\.jpg$/, ".poster.webp");
    const purl = url.replace(/\.jpg$/, ".poster.webp");
    posters[url] = purl;
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(p).mtimeMs) { kept++; continue; }
    await sharp(p).resize({ width: 1920, withoutEnlargement: true, kernel: "lanczos3" }).webp({ quality: 90, effort: 6 }).toFile(out);
    made++;
  }
}
writeFileSync(join(ROOT, "content", "media-variants.json"), JSON.stringify({ stills: manifest, posters, videos, sizes }, null, 2) + "\n");
console.log(`variants: ${made} written, ${kept} up to date; ${Object.keys(manifest).length} stills, ${Object.keys(posters).length} posters, ${Object.keys(videos).length} videos`);
