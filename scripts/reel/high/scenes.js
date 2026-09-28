/* HIGH showreel — "Markets, meet culture."
 *
 * 16 s loop at 120 BPM (beat = 0.5 s). Markets move like a terminal:
 * clean type rising off a baseline, expo easing, a ticker. Then culture
 * gets slapped on and everything after moves HIGH's way: sticker slams,
 * swirls, tapes, memes, drops.
 *
 *  0.0  HI*H on the pink swirl (loop anchor, also the poster frame)
 *  1.0  MARKETS          — terminal, ticker, chart
 *  2.0  MEET             — the tag slaps, the letters turn into stickers
 *  3.0  CULTURE          — yellow swirl, sticker slams; GET HIGH tapes out
 *  5.0  THE PRODUCT      — live phone, one screen per beat
 *  8.0  BLINK AND YOU'VE TRADED — lids close/open, octopus, disco
 *  9.5  AAAAAAAAAA       — the goat, on HIGH's pixel green
 * 10.5  FOUNDING CLUB    — the holo card spins in, the chrome chain drops
 * 12.5  THE CAMPAIGN     — the posters, dealt into a fan
 * 14.0  #CARRY THE CULTURE — collapses into the HI*H mark again
 */
import * as L from "../lib.js";
const { W, H, CX, CY, DUR, E, tw, prog, lerp, clamp, spring, settle, noise, hash, rng, put, pic, el, StickerText, label, canvas, drawSwirl, drawWaves, drawRays, cover, Phone, SHADOW, TAU } = L;

/* ---------------------------------------------------------------- palette */
const C = {
  ink: "#0A0A0E",
  pinkA: "#E826F1", pinkB: "#E452F2",          // pink swirl
  yelA: "#F8C81C", yelB: "#F9D94A",            // yellow swirl
  bluA: "#5262F2", bluB: "#4259F1",            // cobalt waves
  green: "#1BD96A", red: "#FF4D6D",
  hot: "#FF3E9D",                              // tag pink
};
const swirlAngle = (gtU) => 0.35 * gtU;       // one continuous turn across the loop

/* ---------------------------------------------------------------- stickers */
const S = {
  lips: "sheet-0", fineshyt: "sheet-1", balloondog: "sheet-3", carry: "sheet-4",
  super: "box-0", checkshades: "box-1", lollipop: "box-2", fireskull: "box-3", hello: "box-4", rock: "box-5", globe: "box-6", watermelon: "box-7", oohlala: "box-8", no1: "box-9", at: "box-10", helly: "box-11", awesome: "box-12",
  hash: "s24-0", atburst: "s24-1", bolt: "s24-2", eye: "s24-3", flower: "s24-4", starbadge: "s24-5",
  lipsgreen: "s60-0", skullgreen: "s60-1", goat: "s60-2", skullbow: "s60-3", rizz: "s60-4", feelin: "s60-5", ghost: "s60-7", pxheart: "s60-8", pxshades: "s60-9",
  omg: "s95-0", totally: "s95-1", notdeep: "s95-2", demure: "s95-3", mce: "s89-0", iconic: "s89-1", gameover: "s9b-0", duh: "s9b-1", manifest: "s9b-2",
  walkie: "scb-0", boltgreen: "scb-1", alarm: "scb-2", cloud: "scb-3", help: "scb-4", ticket: "scb-5", question: "scb-6",
  thumbs: "thumbs", skull: "skull", peace: "peace", coins: "coins", disco: "disco", tent1: "tentacle1", tent2: "tentacle2", popsicle: "popsicle", bag: "bag", dripx: "dripx", pacman: "pacman", cash: "cash", nimbu: "nimbu", mappin: "mappin",
};
const st = (k) => `a/st/${S[k]}.png`;

export const ASSETS = [
  ...Object.keys(S).map(st),
  "a/logo.svg", "a/obj/phone.png", "a/obj/card.png", "a/obj/chain.png", "a/obj/coin.png", "a/obj/phone-purple.png",
  "a/bg/star-purple.png", "a/bg/star-black.png", "a/bg/star-white.png",
  ...["break", "crush", "heat", "toohigh", "noone", "h72"].map((k) => `a/post/${k}.jpg`),
];
export const SEQS = { watch: 120, stock: 120, ipo: 156, port: 120, collect: 144, goat: 106 };

/* ---------------------------------------------------------------- shots */
export const shots = [];
let stage;
function shot(name, t0, t1, bg = null, z = null) {
  const root = el("div", stage, { width: W + "px", height: H + "px", overflow: "hidden" });
  if (z !== null) root.style.zIndex = String(z);
  if (bg) root.style.background = bg;
  const s = { name, t0, t1, root, update: () => {} };
  shots.push(s);
  return s;
}
export function local(s, gt) {
  if (gt >= s.t0 && gt < s.t1) return gt - s.t0;
  if (gt + DUR >= s.t0 && gt + DUR < s.t1) return gt + DUR - s.t0;
  return null;
}
const fitSize = (text, maxW, maxCap, weight = 900) => {
  const m = L.measure(text, 100, weight);
  return Math.min((maxW / m.width) * 100, (maxCap / m.cap) * 100);
};
/** the HIGH sticker type preset */
const sticker = (size, extra = {}) => ({ size, fill: "#fff", stroke: "#000", sw: size * 0.03, border: "#fff", bw: size * 0.045, shadow: { dx: size * 0.028, dy: size * 0.032, color: "#000" }, ...extra });
/** a sticker slam: scale in from `from` with overshoot, rotation settling onto `r` */
function slam(node, t, t0, b, o = {}) {
  const dur = o.dur ?? 0.2, from = o.from ?? 1.9;
  if (t < t0) { put(node, { x: b.x, y: b.y, o: 0 }); return; }
  const k = prog(t0, t0 + dur, t);
  const s = lerp(from, 1, E.outBack(k, o.over ?? 2.0)) * (b.s ?? 1);
  const bob = o.bob === false ? 0 : Math.sin(TAU * (t * 0.7 + (b.ph ?? 0))) * 6;
  const r = b.r + settle(t - t0 - dur * 0.5, (o.rot ?? 14) * (b.sign ?? 1), 2.2, 7) + Math.sin(TAU * (t * 0.5 + (b.ph ?? 0))) * 1.6;
  put(node, { x: b.x, y: b.y + bob * clamp((t - t0) / 0.4), s, r, o: clamp((t - t0) / 0.025) });
}
/** a type line that rises out of its own baseline (clean "markets" motion) */
function riseLetters(stx, t, t0, stagger = 0.04, dur = 0.5) {
  stx.letters.forEach((_, i) => {
    const k = E.outExpo(prog(t0 + i * stagger, t0 + i * stagger + dur, t));
    stx.letter(i, { dy: (1 - k) * stx.cap * 1.15 });
  });
}
/** letters slam in one after another (culture motion) */
function slamLetters(stx, t, t0, seed, stagger = 0.028) {
  const R = rng(seed);
  stx.letters.forEach((_, i) => {
    const rr = (R() - 0.5) * 36, t1 = t0 + i * stagger;
    if (t < t1) return stx.letter(i, { o: 0 });
    const k = prog(t1, t1 + 0.22, t);
    stx.letter(i, { s: E.outBack(k, 2.6), r: settle(t - t1, rr, 2, 7), dy: (1 - E.outCubic(k)) * -30 });
  });
}
const sparklePath = "M0,-50 C6,-10 10,-6 50,0 C10,6 6,10 0,50 C-6,10 -10,6 -50,0 C-10,-6 -6,-10 0,-50Z";
function sparkles(parent, n, seed, box) {
  const R = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const sv = el("div", parent, { width: "100px", height: "100px" });
    sv.innerHTML = `<svg width="100" height="100" viewBox="-50 -50 100 100"><path d="${sparklePath}" fill="#fff"/></svg>`;
    list.push({ sv, x: lerp(box[0], box[2], R()), y: lerp(box[1], box[3], R()), s: 0.35 + R() * 0.6, ph: R(), per: 0.7 + R() * 0.8 });
  }
  return (t) => list.forEach((p) => {
    const c = ((t / p.per + p.ph) % 1); const k = Math.sin(Math.PI * clamp(c / 0.45));
    put(p.sv, { x: p.x, y: p.y, s: p.s * k, r: c * 90, o: k });
  });
}

/* ================================================================ build */
export function build(stageEl) {
  stage = stageEl;
  const logoRing = [
    { k: "rizz", x: 960, y: 150, w: 300, r: -5 },
    { k: "lips", x: 330, y: 240, w: 270, r: -12 },
    { k: "fineshyt", x: 1600, y: 250, w: 280, r: 10 },
    { k: "coins", x: 330, y: 610, w: 260, r: -8 },
    { k: "peace", x: 1610, y: 600, w: 210, r: 12 },
    { k: "thumbs", x: 300, y: 960, w: 250, r: 8 },
    { k: "skull", x: 700, y: 1030, w: 170, r: -8 },
    { k: "no1", x: 1250, y: 1040, w: 180, r: 12 },
    { k: "goat", x: 1620, y: 960, w: 330, r: -8 },
  ];

  /* ------------------------------------------------ LOGO (15.0 → 17.0 ≡ 1.0) */
  {
    const s = shot("logo", 15.0, 17.0);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    const ring = logoRing.map((d, i) => ({ ...d, n: pic(s.root, st(d.k), { w: d.w, shadow: SHADOW.sticker }), i }));
    const logo = pic(s.root, "a/logo.svg", { w: 760, shadow: "drop-shadow(0 26px 40px rgba(70,0,90,0.38))" });
    s.update = (u) => {
      const gtU = 15 + u;
      drawSwirl(ctx, { a: C.pinkA, b: C.pinkB, angle: swirlAngle(gtU) });
      // exit: the scene closes into a circle around the mark (0.80 → 1.0 next loop)
      const close = E.inCubic(prog(1.8, 2.0, u));
      s.root.style.clipPath = close > 0 ? `circle(${(1 - close) * 1180}px at ${CX}px ${CY}px)` : "";
      // the mark
      const born = spring(u - 0.075, 1.9, 6.2);
      const beat = u > 0.5 ? 0.035 * Math.exp(-9 * (u % 0.5)) : 0;
      const squash = tw(u, 1.78, 1.86, 0, 1) * (1 - prog(1.86, 1.92, u));
      put(logo, { x: CX, y: CY - 10 + Math.sin(TAU * u * 0.5) * 6, s: born * (1 + beat) * (1 - 0.1 * squash) * (1 - 0.55 * close), r: settle(u - 0.075, -16, 1.6, 6) + Math.sin(TAU * u * 0.4) * 1.5 });
      // the ring flies in, bobs, and blows outward on exit
      ring.forEach((d) => {
        const t0 = 0.12 + d.i * 0.035, k = E.outBack(prog(t0, t0 + 0.45, u), 1.4);
        const out = 1 + 0.9 * E.inCubic(prog(1.82, 2.0, u));
        const dx = d.x - CX, dy = d.y - CY, far = 1.9 - 0.9 * k;
        put(d.n, {
          x: CX + dx * far * out, y: CY + dy * far * out + Math.sin(TAU * (u * 0.8 + d.i * 0.13)) * 7,
          s: lerp(0.3, 1, clamp(k)) * (1 - 0.3 * close), r: d.r + (1 - clamp(k)) * 40 * (d.i % 2 ? 1 : -1) + Math.sin(TAU * (u * 0.6 + d.i * 0.21)) * 3,
          o: clamp((u - t0) / 0.05),
        });
      });
    };
  }

  /* ------------------------------------------------ MARKETS (1.0 → 3.0) */
  const bombLayout = (() => {
    const keys = ["hash", "lips", "goat", "fireskull", "watermelon", "rizz", "super", "atburst", "peace", "omg", "no1", "skullbow", "pxheart", "duh", "flower", "helly", "thumbs", "gameover", "feelin", "eye", "lollipop", "totally", "bolt", "iconic"];
    const R = rng(77), list = [];
    let n = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      list.push({ k: keys[n++ % keys.length], x: 160 + i * 320 + (R() - 0.5) * 120, y: 150 + j * 300 + (R() - 0.5) * 110, w: 210 + R() * 110, r: (R() - 0.5) * 50, rank: R(), spin: (R() - 0.5) * 540 });
    }
    list.sort((a, b) => a.rank - b.rank);
    return list;
  })();
  {
    const s = shot("markets", 1.0, 3.0, C.ink);
    const grid = el("div", s.root, { width: W + "px", height: H + "px", backgroundImage: "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)", backgroundSize: "96px 96px" });
    const chart = canvas(s.root), cx2 = chart.getContext("2d");
    const R = rng(11), pts = [];
    let y = 860;
    for (let i = 0; i <= 64; i++) { y += (R() - 0.57) * 90; y = clamp(y, 420, 1000); pts.push([-20 + (i * 1960) / 64, y - i * 6]); }
    const tick = (items) => items.map(([s1, p, c]) => `<span style="color:#8C8C9A">${s1}</span>&nbsp; <span style="color:#fff">${p}</span>&nbsp; <span style="color:${c.startsWith("−") ? C.red : C.green}">${c.startsWith("−") ? "▼" : "▲"} ${c.replace("−", "")}</span>`).join('<span style="color:#3A3A48">&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>');
    const rowA = [["NIFTY 50", "25,944.52", "0.62%"], ["TITAN", "₹3,997.00", "10.00%"], ["JIOFIN", "₹248.50", "21.12%"], ["TECHM", "₹1,385.20", "−4.65%"], ["PFC", "₹578.08", "11.12%"], ["INFY", "₹1,845.00", "0.49%"], ["SWIGGY", "₹449.70", "2.31%"]];
    const rowB = [["SENSEX", "82,190.45", "0.71%"], ["NYKAA", "₹178.90", "1.08%"], ["TCS", "₹4,102.00", "−0.42%"], ["SILVERBEES", "₹112.40", "2.31%"], ["ZOMATO", "₹268.40", "3.94%"], ["PAYTM", "₹612.60", "−1.18%"], ["HDFCBANK", "₹1,978.10", "1.12%"]];
    const mk = (row) => { const d = label(s.root, "", { font: "600 34px Manrope", letterSpacing: "0.02em" }); d.innerHTML = (tick(row) + '<span style="color:#3A3A48">&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>').repeat(3); return d; };
    const tA = mk(rowA), tB = mk(rowB);
    const size = fitSize("MARKETS", 1500, 470);
    const clean = new StickerText(s.root, "MARKETS", { size, fill: "#fff" });
    clean.node.style.overflow = "hidden";
    const hot = new StickerText(s.root, "MARKETS", sticker(size));
    const tag = el("div", s.root, { background: C.hot, border: "12px solid #000", borderRadius: "46px", boxShadow: "0 0 0 14px #fff, 18px 20px 0 14px #000" });
    const meet = new StickerText(tag, "MEET", { size: 210, fill: "#fff", stroke: "#000", sw: 9 });
    tag.style.width = meet.w + 70 + "px"; tag.style.height = meet.h + 40 + "px";
    put(meet.node, { x: (meet.w + 70) / 2 - 12, y: (meet.h + 40) / 2 - 12 });
    const rays = el("div", s.root, { width: "900px", height: "900px" });
    rays.innerHTML = `<svg width="900" height="900" viewBox="-450 -450 900 900">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU + 0.2; return `<line x1="${Math.cos(a) * 330}" y1="${Math.sin(a) * 250}" x2="${Math.cos(a) * 430}" y2="${Math.sin(a) * 330}" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`; }).join("")}</svg>`;
    const bomb = bombLayout.map((d) => ({ ...d, n: pic(s.root, st(d.k), { w: d.w, shadow: SHADOW.sticker }) }));
    const Rt = rng(5), turn = hot.letters.map(() => (Rt() - 0.5) * 16);
    s.update = (v) => {
      const shake = v > 1.02 && v < 1.5 ? Math.exp(-7 * (v - 1.02)) : 0;
      s.root.style.transform = shake ? `translate(${noise(v * 40, 1) * 20 * shake}px,${noise(v * 40, 2) * 16 * shake}px)` : "";
      grid.style.backgroundPosition = `${-60 * v}px ${-20 * v}px`;
      // the chart draws itself, then dims as culture takes over
      const c = cx2; c.clearRect(0, 0, W, H);
      const head = 1960 * E.outCubic(prog(0.0, 1.5, v)), dim = 1 - 0.65 * prog(1.1, 1.5, v);
      c.save(); c.beginPath(); c.rect(0, 0, head, H); c.clip();
      const g = c.createLinearGradient(0, 300, 0, H); g.addColorStop(0, `rgba(27,217,106,${0.22 * dim})`); g.addColorStop(1, "rgba(27,217,106,0)");
      c.beginPath(); pts.forEach(([x, yy], i) => (i ? c.lineTo(x, yy) : c.moveTo(x, yy))); c.lineTo(1960, H); c.lineTo(-20, H); c.closePath(); c.fillStyle = g; c.fill();
      c.beginPath(); pts.forEach(([x, yy], i) => (i ? c.lineTo(x, yy) : c.moveTo(x, yy)));
      c.strokeStyle = `rgba(27,217,106,${dim})`; c.lineWidth = 8; c.lineJoin = "round"; c.shadowColor = "rgba(27,217,106,0.7)"; c.shadowBlur = 22; c.stroke(); c.restore();
      // tickers
      put(tA, { x: -40 - 260 * v, y: 70, ax: 0, ay: 0, o: prog(0, 0.25, v) * dim });
      put(tB, { x: -1400 + 200 * v, y: 1086, ax: 0, ay: 0, o: prog(0.1, 0.35, v) * dim });
      // MARKETS: clean letters rise off the baseline, then each one turns into a sticker
      const jolt = v > 1.02 ? settle(v - 1.02, 26, 2.6, 8) : 0;
      put(clean.node, { x: CX, y: CY + 40 + jolt });
      put(hot.node, { x: CX, y: CY + 40 + jolt });
      riseLetters(clean, v, 0.06, 0.045, 0.55);
      hot.letters.forEach((_, i) => {
        const tc = 1.14 + i * 0.045;
        if (v < tc) { hot.letter(i, { o: 0 }); return; }
        clean.letter(i, { o: 0 });
        hot.letter(i, { s: 1 + settle(v - tc, 0.35, 2.4, 8), r: turn[i] * clamp((v - tc) / 0.12) + settle(v - tc, turn[i], 2, 6), dy: settle(v - tc, -26, 2.5, 8) });
      });
      // MEET slaps on the beat
      if (v < 1.0) put(tag, { o: 0 });
      else put(tag, { x: CX + 470, y: CY + 300, s: lerp(2.8, 1, E.outBack(prog(1.0, 1.17, v), 1.9)), r: lerp(-26, -7, E.outCubic(prog(1.0, 1.2, v))) + settle(v - 1.17, 4, 2.4, 7), o: prog(1.0, 1.025, v) });
      const rk = prog(1.03, 1.2, v);
      put(rays, { x: CX + 470, y: CY + 300, s: 0.85 + 0.35 * E.outCubic(rk), r: -7, o: v < 1.03 ? 0 : 1 - rk });
      // the sticker bomb
      bomb.forEach((d, i) => {
        const t0 = 1.5 + i * 0.019;
        if (v < t0) return put(d.n, { o: 0 });
        put(d.n, { x: d.x, y: d.y, s: E.outBack(prog(t0, t0 + 0.16, v), 2.4), r: d.r + settle(v - t0, 20, 2.4, 8) });
      });
    };
  }

  /* ------------------------------------------------ CULTURE (3.0 → 5.0) */
  {
    const s = shot("culture", 3.0, 5.0, C.yelA);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    const bomb = bombLayout.map((d) => ({ ...d, n: pic(s.root, st(d.k), { w: d.w, shadow: SHADOW.sticker }) }));
    const spark = sparkles(s.root, 7, 21, [120, 120, 1800, 1080]);
    const size = fitSize("CULTURE", 1440, 480);
    const word = new StickerText(s.root, "CULTURE", sticker(size));
    const slaps = [
      { k: "lips", x: 330, y: 215, w: 300, r: -14, t: 0.5, sign: -1 },
      { k: "fineshyt", x: 1610, y: 225, w: 300, r: 12, t: 0.5, sign: 1 },
      { k: "fireskull", x: 290, y: 975, w: 240, r: 10, t: 0.5, sign: 1 },
      { k: "balloondog", x: 1630, y: 975, w: 300, r: -10, t: 0.5, sign: -1 },
      { k: "goat", x: 960, y: 1070, w: 360, r: -4, t: 1.0, sign: 1 },
      { k: "no1", x: 960, y: 125, w: 190, r: 10, t: 1.0, sign: -1 },
      { k: "peace", x: 150, y: 600, w: 190, r: -12, t: 1.0, sign: 1 },
      { k: "skull", x: 1790, y: 610, w: 150, r: 10, t: 1.0, sign: -1 },
    ].map((d, i) => ({ ...d, ph: i * 0.17, t: d.t + (i % 4) * 0.05, n: pic(s.root, st(d.k), { w: d.w, shadow: SHADOW.sticker }) }));
    s.update = (w) => {
      const gt = 3 + w;
      drawSwirl(ctx, { a: C.yelA, b: C.yelB, angle: 0.5 * gt, zoom: 1 + 0.45 * (1 - E.outExpo(prog(0, 0.7, w))) });
      bomb.forEach((d) => {
        const k = E.inCubic(prog(0, 0.42, w));
        put(d.n, { x: CX + (d.x - CX) * (1 + 2.6 * k), y: CY + (d.y - CY) * (1 + 2.6 * k), s: 1 + 0.5 * k, r: d.r + d.spin * k, o: w < 0.42 ? 1 : 0 });
      });
      spark(w);
      const beat = [0.5, 1.0, 1.5].reduce((a, tb) => a + (w >= tb ? 0.035 * Math.exp(-10 * (w - tb)) : 0), 0);
      put(word.node, { x: CX, y: CY - 30, s: lerp(1.2, 1, E.outCubic(prog(0, 0.6, w))) * (1 + beat), r: -3 });
      slamLetters(word, w, 0.0, 31, 0.03);
      slaps.forEach((d) => slam(d.n, w, d.t, d));
    };
  }

  /* ------------------------------------------------ GET HIGH tapes (4.5 → 5.45) */
  {
    const s = shot("tapes", 4.5, 5.45, null, 50);
    const mkTape = (rot, cy) => {
      const t = el("div", s.root, { width: "3600px", height: "150px", background: "#fff", borderTop: "6px solid #000", borderBottom: "6px solid #000", overflow: "hidden", filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.35))" });
      const inner = label(t, ("GET HIGH ✱ ").repeat(40), { top: "10px", font: "800 112px Roc", color: "#000", letterSpacing: "0.01em" });
      return { t, inner, rot, cy };
    };
    const a = mkTape(-13, 520), b = mkTape(9, 700);
    s.update = (z) => {
      [[a, 0.04, 1], [b, 0.12, -1]].forEach(([tp, t0, dir]) => {
        const inn = 3600 * (1 - E.outExpo(prog(t0, t0 + 0.28, z)));
        const out = 3600 * E.inExpo(prog(0.6 + (t0 - 0.04), 0.9 + (t0 - 0.04), z));
        const along = -dir * inn + dir * out;
        const rad = (tp.rot * Math.PI) / 180;
        put(tp.t, { x: CX + Math.cos(rad) * along, y: tp.cy + Math.sin(rad) * along, r: tp.rot });
        tp.inner.style.transform = `translateX(${-(z * 380) % 700}px)`;
      });
    };
  }

  /* ------------------------------------------------ THE PRODUCT (5.0 → 8.0) */
  {
    const s = shot("product", 5.0, 8.0, "#4A2DBE");
    const bg = pic(s.root, "a/bg/star-purple.png", { w: W });
    const glow = el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(circle at 1330px 600px, rgba(255,255,255,0.22), rgba(255,255,255,0) 520px)" });
    const head = new StickerText(s.root, "EVERYTHING A BROKING APP DOES", { size: 72, weight: 800, fill: "#fff" });
    head.node.style.overflow = "hidden";
    const words = ["WATCHLISTS", "STOCKS", "IPOs", "PORTFOLIOS", "COLLECTIBLES"].map((t) => new StickerText(s.root, t, { size: fitSize(t, 760, 250), fill: "#fff", stroke: "#000", sw: 10, shadow: { dx: 12, dy: 14, color: "#000" } }));
    const chips = ["+157.48% SINCE ADDED", "TITAN · ₹3,997.00", "SUNSHINE PICTURES · IPO", "₹17,53,963.40", "NEW COLLECTIBLE UNLOCKED"].map((t) => label(s.root, t, { font: "800 30px Manrope", color: "#000", background: C.green, padding: "12px 22px", borderRadius: "999px", border: "5px solid #000", letterSpacing: "0.02em" }));
    const phone = new Phone(s.root, 1000);
    const seq = { watch: L.seqs.watch, stock: L.seqs.stock, ipo: L.seqs.ipo, port: L.seqs.port, collect: L.seqs.collect };
    const screenAt = (name, p, from, rate = 1) => { const list = seq[name]; return list[clamp(Math.round(from + p * 60 * rate), 0, list.length - 1)]; };
    const plan = [
      (p) => screenAt("watch", p, 18),
      (p) => screenAt("stock", p - 0.5, 20),
      (p) => screenAt("ipo", p - 1.0, 30, 1.3),
      (p) => screenAt("port", p - 1.5, 14),
      (p) => screenAt("collect", p - 2.0, 14, 1.25),
    ];
    const accents = [
      { k: "fineshyt", x: 1735, y: 235, w: 240, r: 10, t: 0.1, sign: 1 },
      { k: "goat", x: 1770, y: 600, w: 250, r: -8, t: 0.6, sign: -1 },
      { k: "omg", x: 1700, y: 985, w: 250, r: -7, t: 1.1, sign: -1 },
      { k: "mce", x: 1030, y: 1045, w: 290, r: 6, t: 1.6, sign: 1 },
      { k: "feelin", x: 1000, y: 175, w: 190, r: -10, t: 2.1, sign: -1 },
    ].map((d, i) => ({ ...d, ph: i * 0.23, n: pic(s.root, st(d.k), { w: d.w, shadow: SHADOW.sticker }) }));
    s.update = (p) => {
      put(bg, { x: CX, y: CY, s: lerp(1.32, 1.4, p / 3), r: lerp(0, 1.5, p / 3) });
      glow.style.opacity = String(prog(0.1, 0.6, p));
      // phone rises, then floats
      const k = E.outBack(prog(0, 0.55, p), 1.3);
      put(phone.node, { x: 1330 + Math.sin(TAU * p / 2.4) * 8, y: lerp(1750, 610, k) + Math.sin(TAU * p / 1.6) * 10, persp: 2200, ry: lerp(-38, -15, k) + Math.sin(TAU * p / 2.2) * 3, rx: 4, r: lerp(10, 4, k) });
      const i = clamp(Math.floor(p / 0.5), 0, 4), local = p - i * 0.5;
      const cur = plan[i](p), prev = i > 0 ? plan[i - 1](i * 0.5 - 0.001) : null;
      const mix = E.outCubic(prog(0, 0.12, local));
      if (prev && mix < 1) phone.screen(prev, cur, mix); else phone.screen(cur);
      // header + the word slot
      put(head.node, { x: 150, y: 330, ax: 0, ay: 0.5 });
      riseLetters(head, p, 0.12, 0.012, 0.5);
      words.forEach((wd, j) => {
        const t0 = j * 0.5, t1 = j < 4 ? t0 + 0.5 : 99;
        const ti = j === 0 ? t0 : t0 + 0.07;
        if (p < ti || p >= t1 + 0.07) return put(wd.node, { o: 0 });
        const kin = E.outBack(prog(ti, ti + 0.24, p), 1.7), kout = E.inCubic(prog(t1, t1 + 0.07, p));
        put(wd.node, { x: 150 - 20, y: 610 + (1 - kin) * 150 - kout * 120, ax: 0, sy: lerp(1.35, 1, clamp(kin)), s: 1 - 0.1 * kout, o: clamp(prog(ti, ti + 0.04, p)) * (1 - kout) });
      });
      chips.forEach((cp, j) => {
        const t0 = j * 0.5 + 0.1, t1 = j < 4 ? j * 0.5 + 0.5 : 99;
        if (p < t0 || p >= t1 + 0.1) return put(cp, { o: 0 });
        put(cp, { x: 150, y: 820 - E.inCubic(prog(t1, t1 + 0.1, p)) * 60, ax: 0, s: E.outBack(prog(t0, t0 + 0.18, p), 2.2), r: -2, o: 1 - prog(t1, t1 + 0.1, p) });
      });
      accents.forEach((d) => slam(d.n, p, d.t, d));
    };
  }

  /* ------------------------------------------------ blink lids (7.78 → 8.2) */
  {
    const s = shot("lids", 7.78, 8.2, null, 50);
    const lash = () => Array.from({ length: 13 }, (_, i) => { const x = 160 + i * 133, t = 1 - x / W, y0 = 720 + 360 * t * (1 - t) - 8; return `<line x1="${x}" y1="${y0}" x2="${x + (i - 6) * 9}" y2="${y0 + 58}" stroke="#0A0A0E" stroke-width="12" stroke-linecap="round"/>`; }).join("");
    const top = el("div", s.root, { width: W + "px", height: "900px" });
    top.innerHTML = `<svg width="${W}" height="900" viewBox="0 0 ${W} 900" style="overflow:visible"><path d="M0,0 H${W} V720 Q${CX},900 0,720 Z" fill="#0A0A0E"/>${lash()}</svg>`;
    const bot = el("div", s.root, { width: W + "px", height: "900px" });
    bot.innerHTML = `<svg width="${W}" height="900" viewBox="0 0 ${W} 900" style="overflow:visible"><path d="M0,900 H${W} V180 Q${CX},0 0,180 Z" fill="#0A0A0E"/></svg>`;
    s.update = (l) => {
      const close = E.inCubic(prog(0.0, 0.14, l)), open = E.outCubic(prog(0.24, 0.42, l));
      const k = close * (1 - open);
      put(top, { x: 0, y: lerp(-960, -60, k), ax: 0, ay: 0 });
      put(bot, { x: 0, y: lerp(H + 60, 420, k), ax: 0, ay: 0 });
    };
  }

  /* ------------------------------------------------ BLINK AND YOU'VE TRADED (8.0 → 9.5) */
  {
    const s = shot("traded", 8.0, 9.5, "#07050C");
    const bg = pic(s.root, "a/bg/star-black.png", { w: W });
    el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(circle at 1330px 560px, rgba(140,70,255,0.55), rgba(140,70,255,0) 720px)" });
    const string = el("div", s.root, { width: "4px", height: "400px", background: "linear-gradient(#999,#ddd)" });
    const disco = pic(s.root, st("disco"), { w: 360, shadow: "drop-shadow(0 0 40px rgba(200,170,255,0.45))" });
    const spark = sparkles(s.root, 8, 41, [1300, 40, 1900, 460]);
    const phoneP = pic(s.root, "a/obj/phone-purple.png", { h: 900, shadow: SHADOW.deep });
    const t1 = pic(s.root, st("tent1"), { h: 720, shadow: SHADOW.soft });
    const t2 = pic(s.root, st("tent2"), { h: 780, shadow: SHADOW.soft });
    const lines = [["BLINK", 250, 0.02], ["AND YOU'VE", 140, 0.24], ["TRADED", 250, 0.5]].map(([t, cap, t0]) => {
      const tx = new StickerText(s.root, t, { size: fitSize(t, 900, cap), fill: "#fff", shadow: { dx: 0, dy: 10, color: "rgba(0,0,0,0.5)" } });
      tx.node.style.overflow = "hidden";
      return { tx, t0 };
    });
    const bolt = pic(s.root, st("boltgreen"), { w: 170, shadow: SHADOW.sticker });
    s.update = (q) => {
      put(bg, { x: CX, y: CY, s: lerp(1.32, 1.38, q / 1.5), r: -q * 1.2 });
      const sw = 11 * Math.exp(-1.4 * q) * Math.sin(TAU * 0.95 * q + 0.6);
      const px = 1560, py = -30, len = 330, rad = (sw * Math.PI) / 180;
      put(string, { x: px, y: py, ax: 0.5, ay: 0, r: sw, sy: len / 400 });
      put(disco, { x: px - Math.sin(rad) * (len + 160), y: py + Math.cos(rad) * (len + 160), r: sw + q * 30 });
      spark(q);
      put(t1, { x: 300, y: 1250, ax: 0.5, ay: 1, r: lerp(-60, -14, E.outBack(prog(0.05, 0.6, q), 1.4)) + Math.sin(TAU * q * 0.9) * 5 });
      put(phoneP, { x: lerp(2350, 1280, E.outBack(prog(0.46, 0.8, q), 1.3)), y: 640 + Math.sin(TAU * q * 0.7) * 8, r: lerp(28, 11, E.outCubic(prog(0.46, 0.85, q))) });
      put(t2, { x: 1770, y: 1260, ax: 0.5, ay: 1, r: lerp(55, 12, E.outBack(prog(0.35, 0.85, q), 1.4)) + Math.sin(TAU * q * 0.8 + 1) * 5 });
      const ys = [250, 462, 690];
      lines.forEach(({ tx, t0 }, j) => {
        put(tx.node, { x: 150, y: ys[j], ax: 0, s: lerp(1.08, 1, E.outCubic(prog(t0, t0 + 0.4, q))) });
        riseLetters(tx, q, t0, 0.02, 0.42);
      });
      slam(bolt, q, 0.56, { x: 1085, y: 845, r: 14, sign: 1 }, { from: 2.2 });
    };
  }

  /* ------------------------------------------------ pixel mosaic (9.15 → 9.5) + GOAT (9.5 → 10.5) */
  const MS = 120, MC = Math.ceil(W / MS), MR = Math.ceil(H / MS);
  const mosCol = (i, j) => ["#1BD96A", "#12C962", "#0FB857", "#2BE37C"][Math.floor(hash(i * 31 + j * 17) * 4)];
  const mosT = (i, j) => { const d = Math.hypot(i - MC * 0.42, j - MR * 0.58) / Math.hypot(MC, MR); return d * 0.17 + hash(i * 7 + j * 131) * 0.08; };
  const drawMosaic = (ctx, t, shimmer = 0) => {
    ctx.clearRect(0, 0, W, H);
    for (let j = 0; j < MR; j++) for (let i = 0; i < MC; i++) {
      const k = E.outBack(prog(mosT(i, j), mosT(i, j) + 0.07, t), 1.8);
      if (k <= 0) continue;
      let col = mosCol(i, j);
      if (shimmer && hash(i * 13 + j * 7 + Math.floor(shimmer * 6) * 3.1) > 0.93) col = "#4BF08F";
      const sz = MS * clamp(k, 0, 1.1);
      ctx.fillStyle = col; ctx.fillRect(i * MS + (MS - sz) / 2, j * MS + (MS - sz) / 2, sz + 0.5, sz + 0.5);
    }
  };
  {
    const s = shot("mosaic", 9.15, 9.5, null, 50);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    s.update = (m) => drawMosaic(ctx, m);
  }
  {
    const s = shot("goat", 9.5, 10.5, C.green);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    const rc = canvas(s.root), rctx = rc.getContext("2d");
    const card = el("div", s.root, { width: "620px", height: "860px", background: "#fff", borderRadius: "10px", boxShadow: "0 40px 70px rgba(0,40,10,0.45)" });
    const gv = canvas(card, 560, 700, { left: "30px", top: "30px", borderRadius: "4px" });
    const gctx = gv.getContext("2d");
    const mark = pic(card, "a/logo.svg", { w: 110 });
    put(mark, { x: 620 - 30 - 55, y: 860 - 64 });
    const omg = pic(s.root, st("omg"), { w: 280, shadow: SHADOW.sticker });
    const help = pic(s.root, st("help"), { w: 260, shadow: SHADOW.sticker });
    const qm = pic(s.root, st("question"), { w: 140, shadow: SHADOW.sticker });
    s.update = (g) => {
      drawMosaic(ctx, 9, g);
      const scream = g > 0.3 ? Math.exp(-2.2 * (g - 0.3)) : 0;
      rctx.clearRect(0, 0, W, H);
      if (g > 0.28) drawRays(rctx, { col: "#fff", n: 44, cx: CX, cy: CY, angle: g * 0.4, inner: 380, alpha: 0.28 * prog(0.28, 0.36, g) });
      s.root.style.transform = scream ? `translate(${noise(g * 50, 3) * 18 * scream}px,${noise(g * 50, 4) * 14 * scream}px) rotate(${noise(g * 30, 5) * 1.1 * scream}deg)` : "";
      const k = prog(0, 0.24, g);
      put(card, { x: CX, y: CY, s: lerp(1.7, 1, E.outBack(k, 1.6)), r: lerp(-14, -4, E.outCubic(k)) + settle(g - 0.24, 3, 2.2, 7), o: prog(0, 0.03, g) });
      gctx.drawImage(L.seqs.goat[clamp(Math.round(34 + g * 60), 0, 105)], 0, 0, 560, 700);
      slam(omg, g, 0.33, { x: 560, y: 240, r: -12, sign: -1 });
      slam(help, g, 0.42, { x: 1400, y: 930, r: 9, sign: 1 });
      slam(qm, g, 0.5, { x: 1360, y: 230, r: 14, sign: 1 });
    };
  }
  {
    const s = shot("flash", 10.42, 10.64, null, 50);
    const f = el("div", s.root, { width: W + "px", height: H + "px", background: "#fff" });
    s.update = (x) => { f.style.opacity = String(x < 0.08 ? prog(0, 0.06, x) : 1 - prog(0.08, 0.22, x)); };
  }

  /* ------------------------------------------------ FOUNDING CLUB (10.5 → 12.5) */
  {
    const s = shot("founding", 10.5, 12.5, C.bluA);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(circle at 600px 620px, rgba(255,255,255,0.28), rgba(255,255,255,0) 560px)" });
    const cardBox = el("div", s.root, { width: "520px", height: "948px" });
    const card = pic(cardBox, "a/obj/card.png", { h: 948, css: { filter: "drop-shadow(0 40px 60px rgba(10,0,60,0.55))" } });
    const sheen = el("div", cardBox, { width: card._w + "px", height: "948px", mixBlendMode: "screen", WebkitMaskImage: "url(a/obj/card.png)", WebkitMaskSize: "100% 100%", maskImage: "url(a/obj/card.png)", maskSize: "100% 100%" });
    cardBox.style.width = card._w + "px";
    const welcome = new StickerText(s.root, "WELCOME TO THE", { size: fitSize("WELCOME TO THE", 700, 78, 800), weight: 800, fill: "#fff" });
    welcome.node.style.overflow = "hidden";
    const found = new StickerText(s.root, "FOUNDING", sticker(fitSize("FOUNDING", 800, 215)));
    const club = new StickerText(s.root, "CLUB", sticker(fitSize("CLUB", 800, 215)));
    const chain = pic(s.root, "a/obj/chain.png", { w: 700, shadow: "drop-shadow(0 22px 26px rgba(0,0,40,0.45))" });
    const coin = pic(s.root, "a/obj/coin.png", { w: 230, shadow: SHADOW.soft });
    const spark = sparkles(s.root, 6, 61, [260, 120, 1000, 1080]);
    s.update = (f) => {
      drawWaves(ctx, { a: C.bluA, b: C.bluB, phase: f * 2.2, drift: f * 30 });
      const k = prog(0.0, 0.7, f);
      put(cardBox, { x: 600, y: 620 + Math.sin(TAU * f / 2) * 8, persp: 2400, ry: lerp(-88, 0, E.outBack(k, 1.5)) + (f > 0.7 ? Math.sin(TAU * (f - 0.7) / 2.2) * 9 : 0), rx: 5 * Math.sin(TAU * f / 3), r: -6, s: lerp(0.8, 1, E.outCubic(k)) });
      const sp = (x) => -60 + 220 * x;
      const s1 = prog(0.15, 0.85, f), s2 = prog(1.35, 1.95, f);
      sheen.style.background = `linear-gradient(110deg, rgba(255,255,255,0) ${sp(s1 || s2) - 18}%, rgba(255,255,255,0.75) ${sp(s1 || s2)}%, rgba(255,255,255,0) ${sp(s1 || s2) + 18}%)`;
      sheen.style.opacity = String(s1 > 0 && s1 < 1 ? 1 : s2 > 0 && s2 < 1 ? 1 : 0);
      spark(f);
      put(welcome.node, { x: 1030, y: 560, ax: 0 });
      riseLetters(welcome, f, 0.3, 0.018, 0.45);
      put(found.node, { x: 1000, y: 740, ax: 0, r: -3 });
      slamLetters(found, f, 0.5, 71);
      put(club.node, { x: 1000, y: 975, ax: 0, r: -3 });
      slamLetters(club, f, 0.75, 81);
      // the chain drops in and swings; the coin spins on the corner
      const drop = E.outBack(prog(1.0, 1.28, f), 1.2);
      const swing = f > 1.28 ? 9 * Math.exp(-1.5 * (f - 1.28)) * Math.sin(TAU * 1.05 * (f - 1.28)) : 0;
      put(chain, { x: 1420, y: lerp(-760, -70, drop), ax: 0.5, ay: 0, r: swing, o: f < 1.0 ? 0 : 1 });
      const ck = E.outBack(prog(1.2, 1.5, f), 1.6);
      put(coin, { x: 250, y: lerp(1400, 1010, ck), sx: Math.cos(TAU * f * 0.9) * 0.9 + (Math.cos(TAU * f * 0.9) >= 0 ? 0.1 : -0.1), r: 10, o: f < 1.2 ? 0 : 1 });
    };
  }

  /* ------------------------------------------------ THE CAMPAIGN (12.3 → 14.1) */
  {
    const s = shot("campaignbg", 12.35, 14.1, "#EEEAF2", 15);
    s.root.style.boxShadow = "0 -40px 80px rgba(20,0,40,0.35)";
    s.root.style.overflow = "visible";
    const clip = el("div", s.root, { width: W + "px", height: H + "px", overflow: "hidden" });
    const bg = pic(clip, "a/bg/star-white.png", { w: W });
    s.update = (c) => {
      s.root.style.transform = `translateY(${(H + 90) * (1 - E.outExpo(prog(0, 0.26, c)))}px)`;
      put(bg, { x: CX, y: CY, s: lerp(1.32, 1.4, c / 1.75), r: c * 1.5 });
    };
  }
  {
    const s = shot("posters", 12.35, 14.1, null, 20);
    const keys = ["break", "crush", "heat", "toohigh", "noone", "h72"];
    const cards = keys.map((k, i) => {
      const n = pic(s.root, `a/post/${k}.jpg`, { h: 820, css: { borderRadius: "14px", boxShadow: "0 36px 60px rgba(30,0,50,0.38), 0 6px 14px rgba(30,0,50,0.25)" } });
      const o = i - 2.5;
      return { n, x: CX + o * 232, y: 640 + Math.pow(Math.abs(o), 1.6) * 16, r: o * 5.2, t0: i * 0.23, from: i % 2 ? 1 : -1 };
    });
    s.update = (cc) => {
      const c = cc - 0.1; // 0 = 12.45
      cards.forEach((d, i) => {
        if (c < d.t0) return put(d.n, { o: 0 });
        const k = E.outExpo(prog(d.t0, d.t0 + 0.3, c));
        const nudge = cards.slice(i + 1).reduce((a, e) => a + (c > e.t0 ? settle(c - e.t0, 5, 3, 10) : 0), 0);
        put(d.n, { x: lerp(CX + d.from * 1500, d.x, k), y: lerp(1500, d.y, k) + nudge, r: lerp(d.from * 40, d.r, E.outBack(prog(d.t0, d.t0 + 0.34, c), 1.6)), s: 1 + 0.06 * (1 - prog(d.t0 + 0.2, d.t0 + 0.32, c)) });
      });
    };
  }

  /* ------------------------------------------------ #CARRY THE CULTURE (13.85 → 15.25) */
  {
    const s = shot("carry", 13.85, 15.25, null, 30);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    const l1 = new StickerText(s.root, "#CARRY", sticker(fitSize("#CARRY", 1100, 250)));
    const l2 = new StickerText(s.root, "THE", sticker(fitSize("THE", 600, 150)));
    const l3 = new StickerText(s.root, "CULTURE", sticker(fitSize("CULTURE", 1300, 260)));
    const echoes = [1, 2, 3].map(() => new StickerText(s.root, "CULTURE", { size: l3.o.size, fill: "#fff", outlineOnly: 5 }));
    const spark = sparkles(s.root, 6, 91, [100, 100, 1820, 1100]);
    s.update = (x) => {
      const gt = 13.85 + x, k = x - 0.15; // k = 0 at 14.0
      const open = E.inOutCubic(prog(-0.15, 0.12, k));
      s.root.style.clipPath = open < 1 ? `circle(${open * 1200}px at ${CX}px ${CY}px)` : "";
      // from 15.0 the logo scene underneath carries the identical swirl, so the mark can grow behind the collapsing type
      if (gt < 15.0) drawSwirl(ctx, { a: C.pinkA, b: C.pinkB, angle: swirlAngle(gt) }); else ctx.clearRect(0, 0, W, H);
      spark(k);
      const col = E.inBack(prog(0.9, 1.07, k), 1.5);
      const toC = (y) => lerp(y, CY, col);
      const sc = 1 - col, rot = -3 + col * 30;
      put(l1.node, { x: CX, y: toC(330), s: sc, r: rot }); slamLetters(l1, k, 0.05, 101, 0.026);
      put(l2.node, { x: CX, y: toC(560), s: sc, r: rot }); slamLetters(l2, k, 0.3, 111, 0.04);
      put(l3.node, { x: CX, y: toC(810), s: sc, r: rot }); slamLetters(l3, k, 0.55, 121, 0.026);
      echoes.forEach((e, j) => {
        const t0 = 0.64 + j * 0.07, a = prog(t0, t0 + 0.06, k);
        put(e.node, { x: CX, y: toC(810 + (j + 1) * 170 - (k - t0) * 60), s: sc, r: rot, o: a * [0.85, 0.55, 0.3][j] * (1 - prog(0.86, 0.94, k)) });
      });
    };
  }
}
