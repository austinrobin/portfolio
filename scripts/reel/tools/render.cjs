// Render a showreel frame-by-frame in headless Chromium.
//   node scripts/reel/tools/render.cjs <project> stills <outdir> 0,1.5,3.2
//   node scripts/reel/tools/render.cjs <project> full <out.mkv> [fromFrame] [toFrame]
// The page exposes window.renderFrame(i); every frame is a pure function of i.
const { chromium } = require("./pw.cjs"); const serve = require("./server.cjs");
const { spawn } = require("child_process"); const fs = require("fs"); const path = require("path");
const ROOT = path.resolve(__dirname, "..");
(async () => {
  const [project, mode, out, arg3, arg4] = process.argv.slice(2);
  const srv = await serve(ROOT, 8766);
  const browser = await chromium.launch({ headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--disable-lcd-text"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:8766/${project}/index.html`);
  const info = await page.evaluate(() => window.ready).catch((e) => ({ error: e.message }));
  console.log("ready", JSON.stringify(info), errs.length ? "ERRORS: " + errs.join(" | ") : "");
  if (info.error) { await browser.close(); srv.close(); process.exit(1); }
  const fps = await page.evaluate(() => window.FPS || 60), total = await page.evaluate(() => window.FRAMES || 960);
  const cdp = await page.context().newCDPSession(page);
  const shoot = async () => Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true })).data, "base64");
  const t0 = Date.now();
  if (mode === "stills") {
    fs.mkdirSync(out, { recursive: true });
    for (const t of arg3.split(",").map(Number)) {
      await page.evaluate((i) => window.renderFrame(i), Math.round(t * fps));
      fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(5, "0")}.png`), await shoot());
    }
  } else {
    const from = Number(arg3 ?? 0), to = Number(arg4 ?? total);
    // near-lossless 4:4:4 master; the web encodes are made from it
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "6", "-pix_fmt", "yuv444p", out], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = from; i < to; i++) {
      await page.evaluate((i) => window.renderFrame(i), i);
      const buf = await shoot();
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % fps === 0) process.stdout.write(`${i} `);
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  }
  console.log("\ndone in", ((Date.now() - t0) / 1000).toFixed(1), "s", errs.length ? "ERRORS: " + errs.slice(0, 5).join(" | ") : "");
  await browser.close(); srv.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n").slice(0, 6).join(" | ")); process.exit(1); });
