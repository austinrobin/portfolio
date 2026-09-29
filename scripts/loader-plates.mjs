// Build the loader's plate sprites from the six engravings in the handover folder.
//   node scripts/loader-plates.mjs
// The plates are cream lines on transparency, tinted by CSS. Each sprite stacks the six
// frames vertically (background-position steps through them):
//   plates.webp     1672px frames — 1x screens (the sources' native size)
//   plates-2x.webp  3344px frames — retina desktops: an offline lanczos upscale with a
//                   touch of sharpening reads far cleaner than the browser scaling a mask
//   plates-m.webp   the central 40% of each frame at 2x — phones only ever show the middle
// Alpha is a soft ramp on the source greys (90→190), quantised to four levels so the
// lossless WebP stays small; at 2x the steps sit at device pixels and vanish.
// If the sources are ever re-made at ≥3000px, the 2x sprite uses them as they are.
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
const SRC = "/Users/admin/Documents/Claude/Porftfolio/Loader";
const OUT = new URL("../public/loader/", import.meta.url).pathname;
const files = readdirSync(SRC).filter((f) => f.endsWith(".png")).sort();
const LO = 90, HI = 190, LEVELS = 4, CREAM = [249, 246, 241];
async function frame(file, W, H, { sharpen = false, crop = null } = {}) {
  const meta = await sharp(join(SRC, file)).metadata();
  let p = sharp(join(SRC, file));
  if (crop) { const cw = Math.round(meta.width * crop); p = p.extract({ left: Math.round((meta.width - cw) / 2), top: 0, width: cw, height: meta.height }); }
  p = p.resize(W, H, { fit: "cover", kernel: "lanczos3" }).greyscale();
  if (sharpen && W > meta.width * (crop ?? 1)) p = p.sharpen({ sigma: 1.0, m1: 0.8, m2: 0.4 });
  const g = await p.raw().toBuffer();
  const o = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const t = Math.max(0, Math.min(1, (g[i] - LO) / (HI - LO)));
    o[i * 4] = CREAM[0]; o[i * 4 + 1] = CREAM[1]; o[i * 4 + 2] = CREAM[2];
    o[i * 4 + 3] = Math.round((Math.round(t * (LEVELS - 1)) / (LEVELS - 1)) * 255);
  }
  return o;
}
async function sprite(name, W, H, opts) {
  const frames = [];
  for (const f of files) frames.push(await frame(f, W, H, opts));
  const buf = await sharp(Buffer.concat(frames), { raw: { width: W, height: H * files.length, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
  writeFileSync(join(OUT, name), buf);
  console.log(name.padEnd(16), `${W}x${H * files.length}`, `${(buf.length / 1024).toFixed(0)}KB`);
}
await sprite("plates.webp", 1672, 941);
await sprite("plates-2x.webp", 3344, 1882, { sharpen: true });
await sprite("plates-m.webp", 1338, 1882, { sharpen: true, crop: 0.4 });
