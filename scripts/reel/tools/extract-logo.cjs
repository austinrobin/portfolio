const { chromium } = require("./pw.cjs");
const fs = require("fs");
(async () => {
  const [svgPath, outSvg, x0, y0, x1, y1] = process.argv.slice(2);
  const B = [x0, y0, x1, y1].map(Number);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
  await page.setContent(`<html><body style="margin:0">${fs.readFileSync(svgPath, "utf8")}</body></html>`);
  const res = await page.evaluate((B) => {
    const svg = document.querySelector("svg"); const root = svg.getBoundingClientRect();
    const out = [];
    for (const p of svg.querySelectorAll("path")) {
      const r = p.getBoundingClientRect();
      const x = r.left - root.left, y = r.top - root.top;
      if (x >= B[0] && y >= B[1] && x + r.width <= B[2] && y + r.height <= B[3] && r.width > 0) {
        // resolve the effective fill/stroke through ancestors
        const cs = getComputedStyle(p);
        const m = p.getCTM();
        out.push({ d: p.getAttribute("d"), fill: cs.fill, stroke: cs.stroke, sw: cs.strokeWidth, fr: cs.fillRule,
          m: m ? [m.a, m.b, m.c, m.d, m.e, m.f] : [1,0,0,1,0,0], x, y, w: r.width, h: r.height });
      }
    }
    return out;
  }, B);
  const minx = Math.min(...res.map(r => r.x)), miny = Math.min(...res.map(r => r.y));
  const maxx = Math.max(...res.map(r => r.x + r.w)), maxy = Math.max(...res.map(r => r.y + r.h));
  const body = res.map(r => `<path transform="matrix(${r.m.join(" ")})" d="${r.d}" fill="${r.fill}" fill-rule="${r.fr}" stroke="${r.stroke}" stroke-width="${r.sw}"/>`).join("\n");
  const svgOut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minx} ${miny} ${maxx - minx} ${maxy - miny}" width="${(maxx - minx) * 10}" height="${(maxy - miny) * 10}">\n${body}\n</svg>\n`;
  fs.writeFileSync(outSvg, svgOut);
  fs.writeFileSync(outSvg.replace(/\.svg$/, ".json"), JSON.stringify({ box: [minx, miny, maxx - minx, maxy - miny], paths: res }, null, 1));
  console.log("paths", res.length, "box", [minx, miny, maxx - minx, maxy - miny].map(v => v.toFixed(1)).join(" "), "fills", [...new Set(res.map(r => r.fill))].join(", "));
  // render check at 10x
  const p2 = await browser.newPage({ viewport: { width: Math.ceil((maxx - minx) * 10), height: Math.ceil((maxy - miny) * 10) } });
  await p2.setContent(`<html><body style="margin:0;background:#E5E1D8">${svgOut}</body></html>`);
  await p2.screenshot({ path: outSvg.replace(/\.svg$/, "-check.png"), omitBackground: false });
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n").slice(0, 4).join(" | ")); process.exit(1); });
