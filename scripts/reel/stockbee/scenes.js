/* StockBee showreel — "All signal. No noise."
 *
 * 12 s loop at 30 fps. StockBee is a trading terminal that lives on
 * WhatsApp: pitch black, one electric lime, Neue Haas Display set tight,
 * mono for the machine. The reel is the product's own argument — a wall of
 * market noise, one signal lighting up, the alert landing in a second,
 * then the whole command centre.
 *
 *  0.0  the mark + Stock/Bee wordmark (loop anchor / poster)
 *  1.1  Markets move fast. Information moves faster. — the feed accelerates
 *  3.9  the feed slams to a halt; one row lights up, lifts, lands on WhatsApp (+14%)
 *  6.3  All signal. No noise. — the dashboard rises into the lime light
 *  8.7  Signal → Context → Understanding — the product, as a moving wall
 * 10.7  a bolt of lime → back to the mark
 */
import * as L from "../lib.js";
const { W, H, CX, CY, DUR, E, prog, lerp, clamp, hash, put, pic, el, canvas, cover } = L;

const C = { bg: "#0A0B0A", lime: "#A2FE01", sage: "#98AF85", text: "#F2F5EF", grey: "#8B9187", dim: "#4A5046", green: "#35E07A", red: "#FF5A4E", ink: "#0F1C05" };
const WALL = ["terminal", "fno-table", "options-chart", "oi-gainers", "breakouts", "uptrend", "news-impact", "stock-list", "no-noise", "get-started", "lightning-fast", "ai-section", "tablet-feed", "radar", "funnel", "dashboard-ui"];
export const ASSETS = WALL.map((k) => `a/${k}.jpg`);
export const SEQS = {};

export const shots = [];
let stage;
function shot(name, t0, t1, bg) {
  const root = el("div", stage, { width: W + "px", height: H + "px", overflow: "hidden", background: bg || "transparent" });
  const s = { name, t0, t1, root, update: () => {} };
  shots.push(s);
  return s;
}
export function local(s, gt) {
  if (gt >= s.t0 && gt < s.t1) return gt - s.t0;
  if (gt + DUR >= s.t0 && gt + DUR < s.t1) return gt + DUR - s.t0;
  return null;
}
function text(parent, str, css) { const d = el("div", parent, { whiteSpace: "nowrap", color: C.text, ...css }); d.textContent = str; return d; }
/** a line that rises out of its own baseline */
function riseLine(parent, str, css) {
  const box = el("div", parent, { overflow: "hidden", whiteSpace: "nowrap", paddingBottom: "0.08em" });
  const inner = el("div", box, { position: "relative", color: C.text, ...css });
  inner.textContent = str;
  return { box, inner, set: (t, t0, out = 0) => { const k = E.outExpo(prog(t0, t0 + 0.7, t)); inner.style.transform = `translateY(${((1 - k) * 110 - out * 110).toFixed(1)}%)`; } };
}
/** the StockBee mark: two nested corners on a lime tile */
const MARK_SVG = (id) => `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#E4FF2E"/><stop offset="1" stop-color="#5EF51A"/></linearGradient></defs>
<rect width="100" height="100" rx="26" fill="url(#${id})"/><g fill="none" stroke="${C.ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M42 25H76V58"/><path d="M25 42H58V74"/></g></svg>`;
function mark(parent, size, id) { const d = el("div", parent, { width: size + "px", height: size + "px" }); d.innerHTML = MARK_SVG(id); return d; }

/* ---------------------------------------------------------------- the feed
 * the dashboard's own news table, drawn live: impact tag, direction, ticker,
 * headline, and the since-news pill */
const ROWS = [
  ["MUTHOOTCAP", "Granules India Guaranteed CHF 25.50 Million To MUFG Bank For Senn Chemicals AG", "1.15%", 1, 1],
  ["TCS", "TCS Clinches A $400 Million Contract With A Major US Retailer, Propelling The IT Sector Forward", "0.31%", 1, 0],
  ["ADANI", "Adani Enterprises Commits ₹10,000 Cr To Data Center Infrastructure Over The Next 5 Years", "5.1%", -1, 1],
  ["INFOSYS", "Infosys And NVIDIA Unite To Deliver Cutting-Edge AI Solutions, Sparking A 2% Surge", "1.15%", 1, 1],
  ["L&T", "Larsen & Toubro Wins ₹2,500 Cr Order To Build A New Metro Line, Enhancing Urban Transit", "NA", -1, 0],
  ["HDFC", "HDFC Bank Plans To Secure ₹8,000 Cr Through Infrastructure Bonds, Fueling Key Projects", "0.53%", -1, 0],
  ["RELIANCE", "Reliance Industries Earmarks ₹50,000 Cr For Renewable Projects In Gujarat", "1.15%", 1, 1],
  ["ICICI", "ICICI Bank Announces A 15% Jump In Q1 Net Profit, Boosted By Strong Retail Banking", "0.31%", 1, 0],
  ["AIRTEL", "Bharti Airtel Forges A 5G Partnership With Google Cloud, Revolutionizing Network Solutions", "NA", 1, 0],
  ["WIPRO", "Wipro Expands Its Partnership With A Leading European Bank For Cloud Transformation", "0.84%", 1, 0],
  ["SBIN", "State Bank Of India Raises ₹10,000 Cr Via Infrastructure Bonds At 7.36% Coupon", "0.22%", -1, 0],
  ["HCLTECH", "HCLTech Signs A Multi-Year Deal With A Global Retailer To Modernise Its Stores", "1.42%", 1, 0],
];
const SIGNAL = ["TATAMOTORS", "Tata Motors Announces A Strategic Acquisition To Expand Its EV Portfolio", "+14%", 1, 1];
const ROW_H = 76, FEED_TOP = 40;
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function drawRow(c, row, y, a, hi = 0) {
  const [tick, head, pct, dir, impact] = row;
  c.globalAlpha = a;
  if (hi > 0) { c.fillStyle = `rgba(162,254,1,${0.1 * hi})`; c.fillRect(0, y, W, ROW_H); c.fillStyle = C.lime; c.fillRect(0, y, 6 * hi, ROW_H); }
  c.strokeStyle = "rgba(255,255,255,0.06)"; c.lineWidth = 1; c.beginPath(); c.moveTo(60, y + ROW_H - 0.5); c.lineTo(W - 60, y + ROW_H - 0.5); c.stroke();
  const cy = y + ROW_H / 2;
  if (impact) { c.fillStyle = hi > 0 ? C.lime : "rgba(162,254,1,0.85)"; rrect(c, 60, cy - 13, 92, 26, 5); c.fill(); c.fillStyle = C.ink; c.font = "500 14px Mono"; c.textBaseline = "middle"; c.fillText("IMPACT", 72, cy + 1); }
  c.strokeStyle = dir > 0 ? C.green : C.red; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath();
  if (dir > 0) { c.moveTo(186, cy + 9); c.lineTo(204, cy - 9); c.moveTo(194, cy - 9); c.lineTo(204, cy - 9); c.lineTo(204, cy + 1); }
  else { c.moveTo(186, cy - 9); c.lineTo(204, cy + 9); c.moveTo(194, cy + 9); c.lineTo(204, cy + 9); c.lineTo(204, cy - 1); }
  c.stroke();
  c.textBaseline = "middle";
  c.fillStyle = hi > 0 ? C.text : "#9CA298"; c.font = "400 21px Mono"; c.fillText(tick, 236, cy + 1);
  c.fillStyle = hi > 0 ? C.text : "#C4C9C0"; c.font = `${hi > 0 ? 500 : 400} 25px Haas`;
  c.save(); c.beginPath(); c.rect(440, y, 1080, ROW_H); c.clip(); c.fillText(head, 440, cy + 1); c.restore();
  // since-news pill
  const px = 1560, pw = 300;
  const col = pct === "NA" ? null : dir > 0 ? "53,224,122" : "255,90,78";
  c.fillStyle = "rgba(255,255,255,0.05)"; rrect(c, px, cy - 22, pw, 44, 10); c.fill();
  if (col) { const g = c.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, `rgba(${col},0.05)`); g.addColorStop(1, `rgba(${col},${hi > 0 ? 0.55 : 0.32})`); c.fillStyle = g; rrect(c, px, cy - 22, pw, 44, 10); c.fill(); c.strokeStyle = `rgba(${col},0.7)`; c.lineWidth = 1.2; rrect(c, px + 0.5, cy - 21.5, pw - 1, 43, 10); c.stroke(); }
  c.font = "400 20px Mono"; c.fillStyle = "#AEB4AA"; c.fillText("19:41:10", px + 18, cy + 1);
  c.fillStyle = col ? `rgb(${col})` : "#7A8076"; c.font = "500 21px Mono"; c.textAlign = "right"; c.fillText(pct, px + pw - 18, cy + 1); c.textAlign = "left";
  c.globalAlpha = 1;
}
/** the feed at a scroll offset; `focus` dims every row but the signal */
function drawFeed(c, scroll, { alpha = 0.6, blur = 0, focus = 0, hi = 0, sigRow = 7 } = {}) {
  c.clearRect(0, 0, W, H);
  const n = ROWS.length + 1, first = Math.floor(scroll / ROW_H);
  const passes = blur > 2 ? 3 : 1;
  for (let p = 0; p < passes; p++) {
    const off = passes > 1 ? (p - 1) * blur * 0.5 : 0, pa = passes > 1 ? (p === 1 ? 0.55 : 0.28) : 1;
    for (let i = first - 1; i < first + Math.ceil(H / ROW_H) + 2; i++) {
      const y = FEED_TOP + i * ROW_H - scroll + off;
      const k = ((i % n) + n) % n;
      const isSig = k === sigRow;
      const row = isSig ? SIGNAL : ROWS[k > sigRow ? k - 1 : k];
      drawRow(c, row, y, alpha * pa * (isSig ? 1 : 1 - focus * 0.8), isSig ? hi : 0);
    }
  }
}
/* the feed's scroll through the noise, and where it stops */
const noiseScroll = (n) => 120 * n + 760 * n * n;
const NOISE_END = 2.8, V_END = 120 + 1520 * NOISE_END;
/* stop so the signal row sits at y ≈ 470 */
function stopScroll() {
  const base = noiseScroll(NOISE_END) + V_END / 7;
  const n = ROWS.length + 1, target = 470;
  // choose the loop whose signal row lands nearest the target
  const i = Math.round((base + target - FEED_TOP) / ROW_H / n) * n + 7;
  return FEED_TOP + i * ROW_H - target;
}
const STOP = stopScroll();

export function build(stageEl) {
  stage = stageEl;

  /* ------------------------------------------------ noise (1.1 → 4.1) */
  {
    const s = shot("noise", 1.1, 4.1, C.bg);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    el("div", s.root, { width: W + "px", height: H + "px", background: "linear-gradient(90deg, rgba(10,11,10,0.96) 0%, rgba(10,11,10,0.86) 42%, rgba(10,11,10,0.2) 75%, rgba(10,11,10,0.55) 100%)" });
    el("div", s.root, { width: W + "px", height: H + "px", background: "linear-gradient(0deg, rgba(10,11,10,1) 0%, rgba(10,11,10,0) 22%, rgba(10,11,10,0) 80%, rgba(10,11,10,1) 100%)" });
    const kicker = text(s.root, "THE PROBLEM", { font: "500 22px Mono", letterSpacing: "0.24em", color: C.lime });
    const l1 = riseLine(s.root, "Markets move fast.", { font: "700 132px Haas", letterSpacing: "-0.035em" });
    const l2 = riseLine(s.root, "Information", { font: "700 132px Haas", letterSpacing: "-0.035em", color: C.lime });
    const l3 = riseLine(s.root, "moves faster.", { font: "700 132px Haas", letterSpacing: "-0.035em", color: C.lime });
    s.update = (t) => {
      const n = t - 0.2; // the feed starts as the mark leaves
      const sc = n > 0 ? noiseScroll(n) : 0, v = 120 + 1520 * Math.max(0, n);
      drawFeed(ctx, sc, { alpha: 0.7, blur: v / 30 * 0.5 });
      put(kicker, { x: 124, y: 330, ax: 0, o: prog(0.45, 0.7, t) });
      put(l1.box, { x: 116, y: 450, ax: 0 }); l1.set(t, 0.5);
      put(l2.box, { x: 116, y: 590, ax: 0 }); l2.set(t, 1.15);
      put(l3.box, { x: 116, y: 720, ax: 0 }); l3.set(t, 1.3);
    };
  }

  /* ------------------------------------------------ the signal (3.9 → 6.5) */
  {
    const s = shot("signal", 3.9, 6.5, C.bg);
    const feed = el("div", s.root, { width: W + "px", height: H + "px" }); const ctx = canvas(feed).getContext("2d");
    const scan = el("div", s.root, { width: W + "px", height: "2px", background: C.lime, boxShadow: `0 0 24px 6px rgba(162,254,1,0.6)` });
    // the alert card
    const card = el("div", s.root, { width: "640px", height: "330px", borderRadius: "30px", background: "linear-gradient(160deg, rgba(40,52,30,0.92), rgba(16,20,14,0.96))", boxShadow: "inset 0 0 0 1.5px rgba(162,254,1,0.28), 0 40px 90px rgba(0,0,0,0.6)", zIndex: "5" });
    card.innerHTML = `<div id="inner" style="position:absolute;inset:0"><div style="position:absolute;left:34px;top:32px;display:flex;align-items:center;gap:14px">
        <div style="width:46px;height:46px;border-radius:50%;background:#F2F5EF;display:grid;place-items:center;font:700 22px Haas;color:#1B3F8F">T</div>
        <div style="font:500 30px Haas;color:${C.text};letter-spacing:0.01em">TATA MOTORS</div></div>
      <div style="position:absolute;right:34px;top:40px;font:500 22px Haas;color:${C.lime}">↗ Bullish</div>
      <div style="position:absolute;left:34px;top:100px;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,0.08);font:400 20px Haas;color:#C4C9C0">Acquisition</div>
      <div id="pct" style="position:absolute;left:30px;top:150px;font:700 118px Haas;letter-spacing:-0.04em;color:${C.lime};text-shadow:0 0 40px rgba(162,254,1,0.45)">+0%</div>
      <div style="position:absolute;left:36px;bottom:30px;font:400 20px Mono;color:#8B9187">Published 28 Jul · 15:08</div>
      <div style="position:absolute;right:34px;bottom:44px;font:400 24px Haas;color:#AEB4AA">since news</div></div>`;
    const pct = card.querySelector("#pct"), inner = card.querySelector("#inner");
    const phone = new L.Phone(s.root, 1080);
    phone.node.style.zIndex = "4";
    const kicker = text(s.root, "WHATSAPP ALERTS", { font: "500 22px Mono", letterSpacing: "0.24em", color: C.lime, zIndex: "6" });
    const l1 = riseLine(s.root, "Within a second", { font: "700 100px Haas", letterSpacing: "-0.035em" });
    const l2 = riseLine(s.root, "of the news.", { font: "700 100px Haas", letterSpacing: "-0.035em", color: C.lime });
    l1.box.style.zIndex = l2.box.style.zIndex = "6";
    // the chat on the phone's screen
    const pc = phone.ctx, pw = phone.cv.width, ph = phone.cv.height, k = pw / 400;
    function chat(t) {
      pc.fillStyle = "#0B141A"; pc.fillRect(0, 0, pw, ph);
      pc.fillStyle = "#1F2C34"; pc.fillRect(0, 0, pw, 118 * k);
      pc.fillStyle = C.lime; rrect(pc, 62 * k, 58 * k, 44 * k, 44 * k, 12 * k); pc.fill();
      pc.strokeStyle = C.ink; pc.lineWidth = 3.6 * k; pc.lineCap = "round"; pc.lineJoin = "round"; pc.beginPath();
      const mx = 62 * k, my = 58 * k, ms = 44 * k / 100; pc.moveTo(mx + 42 * ms, my + 25 * ms); pc.lineTo(mx + 76 * ms, my + 25 * ms); pc.lineTo(mx + 76 * ms, my + 58 * ms); pc.moveTo(mx + 25 * ms, my + 42 * ms); pc.lineTo(mx + 58 * ms, my + 42 * ms); pc.lineTo(mx + 58 * ms, my + 74 * ms); pc.stroke();
      pc.textBaseline = "alphabetic"; pc.fillStyle = "#E9EDEF"; pc.font = `500 ${21 * k}px Haas`; pc.fillText("StockBee", 118 * k, 78 * k);
      pc.fillStyle = "#8696A0"; pc.font = `400 ${15 * k}px Haas`; pc.fillText("online", 118 * k, 98 * k);
      const bubble = (y, lines, a, s0 = 1) => {
        if (a <= 0) return;
        pc.save(); pc.globalAlpha = a; pc.translate(24 * k, y); pc.scale(s0, s0);
        const bh = (22 + lines.length * 30) * k; pc.fillStyle = "#1F2C34"; rrect(pc, 0, 0, 330 * k, bh, 14 * k); pc.fill();
        lines.forEach(([str, font, col], i) => { pc.fillStyle = col; pc.font = font; pc.fillText(str, 16 * k, (36 + i * 30) * k); });
        pc.restore();
      };
      bubble(150 * k, [["Adani Enterprises · Order win", `500 ${17 * k}px Haas`, "#E9EDEF"], ["−5.1% since news", `700 ${19 * k}px Haas`, C.red], ["14:52", `400 ${13 * k}px Haas`, "#8696A0"]], 0.55);
      const pop = E.outBack(prog(1.15, 1.5, t));
      bubble(300 * k, [["Tata Motors · Acquisition", `500 ${17 * k}px Haas`, "#E9EDEF"], ["+14% since news", `700 ${22 * k}px Haas`, C.lime], ["Strategic acquisition to expand", `400 ${16 * k}px Haas`, "#C4C9C0"], ["its EV portfolio.", `400 ${16 * k}px Haas`, "#C4C9C0"], ["15:08  ✓✓", `400 ${13 * k}px Haas`, "#53BDEB"]], prog(1.15, 1.3, t), lerp(0.85, 1, pop));
    }
    s.update = (g) => {
      // the feed brakes hard from the noise's speed and locks on the signal
      const brake = 1 - Math.exp(-7 * g);
      const from = noiseScroll(NOISE_END);
      const sc = lerp(from, STOP, brake);
      const scanK = E.inOutCubic(prog(0.25, 0.7, g));
      const hi = prog(0.62, 0.8, g);
      drawFeed(ctx, sc, { alpha: 0.72, blur: (1 - brake) * 60, focus: prog(0.55, 0.9, g), hi, sigRow: 7 });
      const sigY = FEED_TOP + (Math.round((sc + 470 - FEED_TOP) / ROW_H)) * ROW_H - sc; // the signal row's top
      put(scan, { x: 0, y: lerp(-10, 470 + ROW_H / 2, scanK), ax: 0, o: scanK > 0 && hi < 1 ? 1 : 0 });
      // the row lifts off into the card; the feed recedes
      const lift = E.outExpo(prog(0.85, 1.45, g));
      feed.style.opacity = String(lerp(1, 0.28, lift));
      feed.style.filter = lift > 0.01 ? `blur(${(lift * 6).toFixed(1)}px)` : "none";
      // the row becomes the card: its box resizes (never scales), then its contents arrive
      card.style.width = `${lerp(W, 640, lift).toFixed(1)}px`; card.style.height = `${lerp(ROW_H, 330, lift).toFixed(1)}px`;
      put(card, { x: lerp(CX, 560, lift), y: lerp(470 + ROW_H / 2, 780, lift), o: prog(0.8, 0.95, g), z: 5 });
      card.style.borderRadius = `${lerp(0, 30, lift)}px`;
      inner.style.opacity = String(prog(0.45, 0.9, lift));
      pct.textContent = `+${Math.round(14 * E.outCubic(prog(1.0, 1.7, g)))}%`;
      // the phone rises on the right
      const up = E.outExpo(prog(0.9, 1.6, g));
      phone.put({ x: 1440, y: lerp(1900, 640, up), r: lerp(8, -4, up) });
      chat(g);
      put(kicker, { x: 124, y: 250, ax: 0, o: prog(1.2, 1.45, g) });
      put(l1.box, { x: 116, y: 360, ax: 0 }); l1.set(g, 1.25);
      put(l2.box, { x: 116, y: 470, ax: 0 }); l2.set(g, 1.4);
    };
  }

  /* ------------------------------------------------ all signal, no noise (6.3 → 8.9) */
  {
    const s = shot("nonoise", 6.3, 8.9, C.bg);
    const glow = el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(ellipse 58% 46% at 50% -4%, rgba(162,254,1,0.62), rgba(120,210,0,0.18) 45%, rgba(10,11,10,0) 75%)" });
    const a1 = text(s.root, "All signal.", { font: "700 170px Haas", letterSpacing: "-0.04em" });
    const noNoise = el("div", s.root, { whiteSpace: "nowrap", font: "700 170px Haas", letterSpacing: "-0.04em", color: C.lime, textShadow: "0 0 50px rgba(162,254,1,0.55), 0 0 12px rgba(162,254,1,0.6)" });
    const letters = [..."No noise."].map((ch) => { const sp = document.createElement("span"); sp.textContent = ch; sp.style.whiteSpace = "pre"; noNoise.appendChild(sp); return sp; });
    const dash = el("div", s.root, { width: "1560px", height: "962px", perspective: "2200px" });
    const plate = el("div", dash, { position: "relative", width: "1560px", height: "962px", borderRadius: "22px", overflow: "hidden", boxShadow: "0 -2px 0 0 rgba(162,254,1,0.9), 0 -30px 90px rgba(162,254,1,0.35), 0 60px 120px rgba(0,0,0,0.7)", transformOrigin: "50% 0%" });
    pic(plate, "a/dashboard-ui.jpg", { w: 1560, css: { position: "absolute" } });
    s.update = (k) => {
      const inK = E.outCubic(prog(0, 0.3, k));
      s.root.style.opacity = String(inK);
      glow.style.opacity = String(lerp(0.2, 1, E.outCubic(prog(0.1, 0.9, k))) * (0.94 + 0.06 * Math.sin(k * 9)));
      put(a1, { x: CX, y: 250, o: prog(0.12, 0.4, k), sy: lerp(1.08, 1, E.outExpo(prog(0.12, 0.6, k))), filter: `blur(${(8 * (1 - prog(0.12, 0.45, k))).toFixed(1)}px)` });
      put(noNoise, { x: CX, y: 425 });
      letters.forEach((sp, i) => {
        const t0 = 0.5 + i * 0.05;
        const on = k < t0 ? 0 : k < t0 + 0.12 ? (hash(i * 7 + Math.floor(k * 30)) > 0.4 ? 1 : 0.15) : 1; // neon flicker on
        sp.style.opacity = String(on);
      });
      const rise = E.outExpo(prog(0.45, 1.5, k));
      put(dash, { x: CX, y: lerp(1700, 610, rise) - 30 * k, ay: 0 });
      plate.style.transform = `rotateX(${lerp(40, 16, rise).toFixed(2)}deg)`;
    };
  }

  /* ------------------------------------------------ the command centre, as a wall (8.7 → 10.95) */
  {
    const s = shot("wall", 8.7, 10.95, C.bg);
    const COLS = 5, CW = 720, GAP = 40;
    const plane = el("div", s.root, { width: COLS * (CW + GAP) + "px", height: "3000px", transformOrigin: "50% 50%" });
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      const col = el("div", plane, { left: c * (CW + GAP) + "px", width: CW + "px" });
      let y = 0;
      for (let r = 0; r < 7; r++) {
        const key = WALL[(c * 3 + r * 5) % WALL.length];
        const im = L.imgs[`a/${key}.jpg`], h = (CW * im.naturalHeight) / im.naturalWidth;
        const card = el("div", col, { top: y + "px", width: CW + "px", height: h + "px", borderRadius: "18px", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(162,254,1,0.12), 0 20px 50px rgba(0,0,0,0.5)" });
        pic(card, `a/${key}.jpg`, { w: CW });
        y += h + GAP;
      }
      cols.push({ col, len: y });
    }
    el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(ellipse 70% 60% at 50% 52%, rgba(10,11,10,0.9) 0%, rgba(10,11,10,0.55) 45%, rgba(10,11,10,0.15) 80%)" });
    const words = [["Signal", C.text], ["→", C.lime], ["Context", C.text], ["→", C.lime], ["Understanding.", C.lime]];
    const line = el("div", s.root, { whiteSpace: "nowrap", font: "700 96px Haas", letterSpacing: "-0.035em" });
    const spans = words.map(([w, col]) => { const sp = document.createElement("span"); sp.textContent = w; Object.assign(sp.style, { color: col, marginRight: "0.28em", display: "inline-block" }); line.appendChild(sp); return sp; });
    const kicker = text(s.root, "FROM SIGNAL TO CONVICTION", { font: "500 22px Mono", letterSpacing: "0.24em", color: C.lime });
    s.update = (w) => {
      const inK = E.outExpo(prog(0, 0.55, w));
      s.root.style.opacity = String(E.outCubic(prog(0, 0.2, w)));
      plane.style.transform = `translate(${(CX - (COLS * (CW + GAP)) / 2).toFixed(1)}px, ${(CY - 1500).toFixed(1)}px) perspective(2400px) rotateX(${lerp(58, 46, inK).toFixed(2)}deg) rotateZ(${lerp(-30, -22, inK).toFixed(2)}deg) scale(${lerp(1.5, 1.15, inK).toFixed(3)})`;
      cols.forEach(({ col, len }, i) => { const dir = i % 2 ? 1 : -1; col.style.transform = `translateY(${(-len * 0.12 + dir * (w * 150 + 60)).toFixed(1)}px)`; });
      put(kicker, { x: CX, y: 470, o: prog(0.25, 0.5, w) });
      put(line, { x: CX, y: 600 });
      spans.forEach((sp, i) => { const k = E.outExpo(prog(0.3 + i * 0.16, 0.8 + i * 0.16, w)); sp.style.opacity = String(k); sp.style.transform = `translateY(${((1 - k) * 40).toFixed(1)}px)`; sp.style.filter = k < 0.99 ? `blur(${((1 - k) * 10).toFixed(1)}px)` : "none"; });
    };
  }

  /* ------------------------------------------------ bolt → the mark (10.7 → 13.4 ≡ 1.4) */
  {
    const s = shot("anchor", 10.7, 13.4, C.bg);
    const halo = el("div", s.root, { width: "1400px", height: "1400px", background: "radial-gradient(circle, rgba(162,254,1,0.28) 0%, rgba(162,254,1,0.08) 35%, rgba(162,254,1,0) 65%)" });
    const bolt = el("div", s.root, { width: "620px", height: "900px" });
    bolt.innerHTML = `<svg viewBox="0 0 62 90" width="100%" height="100%"><path d="M40 0 L6 52 H29 L20 90 L56 34 H33 Z" fill="${C.lime}" /></svg>`;
    const m = mark(s.root, 250, "gAnchor");
    m.style.filter = "drop-shadow(0 0 60px rgba(162,254,1,0.55))";
    // Stock (filled) + Bee (outlined), as in the brand's own lockup
    const word = el("div", s.root, { whiteSpace: "nowrap", font: "700 232px Haas", letterSpacing: "-0.045em" });
    const parts = [];
    [..."Stock"].forEach((ch) => parts.push([ch, true])); [..."Bee"].forEach((ch) => parts.push([ch, false]));
    const spans = parts.map(([ch, fill]) => { const sp = document.createElement("span"); sp.textContent = ch; Object.assign(sp.style, { display: "inline-block", color: fill ? C.lime : "transparent", WebkitTextStroke: fill ? "0" : `3px ${C.lime}` }); word.appendChild(sp); return sp; });
    const tag = text(s.root, "AI-powered stock intelligence, on WhatsApp.", { font: "400 40px Haas", letterSpacing: "-0.01em", color: C.sage });
    const flash = el("div", s.root, { width: W + "px", height: H + "px", background: C.lime, zIndex: "10" });
    s.update = (u) => {
      // the bolt strikes, the screen flashes lime, and the mark is left standing
      const strike = prog(0, 0.06, u), fade = E.inCubic(prog(0.12, 0.5, u));
      put(bolt, { x: CX, y: CY, s: lerp(1.25, 0.35, E.outCubic(prog(0, 0.5, u))), o: strike * (1 - fade) });
      flash.style.opacity = String(0.9 * prog(0.02, 0.06, u) * (1 - E.outCubic(prog(0.06, 0.45, u))));
      flash.style.display = u < 0.5 ? "" : "none";
      const pop = L.spring(u - 0.3, 1.6, 6.5);
      const breathe = 1 + 0.015 * Math.sin((u - 0.3) * 3.2);
      const leave = E.inCubic(prog(2.4, 2.7, u));
      put(m, { x: CX, y: 395, s: Math.max(0, pop) * breathe * (1 + 0.15 * leave), o: prog(0.28, 0.4, u) * (1 - leave) });
      put(halo, { x: CX, y: 395, s: 0.8 + 0.1 * Math.sin(u * 2.4), o: prog(0.3, 0.8, u) * (1 - leave) });
      put(word, { x: CX, y: 715, o: 1 - leave, filter: leave > 0.01 ? `blur(${(leave * 12).toFixed(1)}px)` : "none" });
      spans.forEach((sp, i) => { const k = E.outExpo(prog(0.45 + i * 0.045, 1.0 + i * 0.045, u)); sp.style.opacity = String(k); sp.style.transform = `translateY(${((1 - k) * 60).toFixed(1)}px)`; });
      put(tag, { x: CX, y: 895, o: prog(0.95, 1.25, u) * (1 - leave) });
    };
  }
}
