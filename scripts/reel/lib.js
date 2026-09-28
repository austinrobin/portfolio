/* HIGH showreel — motion library.
 * Everything is a pure function of time: renderFrame(i) sets every
 * element for t = i / FPS, so any frame renders identically in any order. */

export const W = 1920, H = 1200, CX = W / 2, CY = H / 2;
export const FPS = 60, DUR = 16, BEAT = 0.5;

/* ------------------------------------------------------------ math */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (a, b, x) => clamp((x - a) / (b - a));
export const TAU = Math.PI * 2;
export const E = {
  lin: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inQuint: (t) => t ** 5,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};
/** damped spring 0→1 (t in seconds) */
export const spring = (t, f = 2.2, d = 7) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(TAU * f * t));
/** a decaying wobble that starts at `amp` and settles to 0 */
export const settle = (t, amp, f = 2.4, d = 6) => (t <= 0 ? amp : amp * Math.exp(-d * t) * Math.cos(TAU * f * t));
/** tween helper: value from a→b between t0..t1 with easing */
export const tw = (t, t0, t1, a, b, ease = E.outCubic) => lerp(a, b, ease(prog(t0, t1, t)));

/* ------------------------------------------------------------ noise */
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise = (x, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.31), hash(i + 1 + seed * 57.31), u) * 2 - 1;
};
export const rng = (seed) => { let s = seed; return () => { s += 1; return hash(s * 13.37 + seed); }; };

/* ------------------------------------------------------------ assets */
const cache = new Map();
export function load(src) {
  if (cache.has(src)) return cache.get(src);
  const img = new Image();
  img.decoding = "sync";
  const p = new Promise((res, rej) => { img.onload = () => img.decode().then(() => res(img), () => res(img)); img.onerror = () => rej(new Error("load " + src)); });
  img.src = src;
  cache.set(src, p);
  return p;
}
export const imgs = {}; // src -> HTMLImageElement (after preload)
export const seqs = {}; // name -> [HTMLImageElement] (after preload)
export async function preload(list) {
  const out = await Promise.all(list.map((s) => load(s)));
  list.forEach((s, i) => (imgs[s] = out[i]));
}
export async function preloadSeq(name, count) {
  const list = Array.from({ length: count }, (_, i) => `seq/${name}/${String(i + 1).padStart(4, "0")}.jpg`);
  await preload(list);
  return list.map((s) => imgs[s]);
}

/* ------------------------------------------------------------ DOM nodes */
export function el(tag, parent, css = {}, attrs = {}) {
  const e = document.createElement(tag);
  Object.assign(e.style, { position: "absolute", left: "0px", top: "0px" }, css);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
/** place an element: its anchor (ax, ay as fractions) lands on (x, y) */
export function put(e, p) {
  const ax = p.ax ?? 0.5, ay = p.ay ?? 0.5;
  let tr = `translate(${(p.x ?? 0).toFixed(2)}px,${(p.y ?? 0).toFixed(2)}px)`;
  if (p.persp) tr += ` perspective(${p.persp}px)`;
  if (p.r) tr += ` rotate(${p.r.toFixed(3)}deg)`;
  if (p.rx) tr += ` rotateX(${p.rx.toFixed(3)}deg)`;
  if (p.ry) tr += ` rotateY(${p.ry.toFixed(3)}deg)`;
  const s = p.s ?? 1;
  tr += ` scale(${((p.sx ?? 1) * s).toFixed(4)},${((p.sy ?? 1) * s).toFixed(4)})`;
  tr += ` translate(${-ax * 100}%,${-ay * 100}%)`;
  e.style.transformOrigin = "0 0";
  e.style.transform = tr;
  e.style.opacity = String(clamp(p.o ?? 1));
  e.style.display = (p.o ?? 1) <= 0.001 || (p.s ?? 1) * Math.min(p.sx ?? 1, p.sy ?? 1) === 0 ? "none" : "";
  if (p.z !== undefined) e.style.zIndex = String(p.z);
  if (p.filter !== undefined) e.style.filter = p.filter;
}
/** an image node sized to width w (or height h) */
export function pic(parent, src, { w, h, shadow, css = {} } = {}) {
  const im = imgs[src];
  if (!im) throw new Error("not preloaded " + src);
  const ar = im.naturalWidth / im.naturalHeight;
  const ww = w ?? h * ar, hh = h ?? w / ar;
  const e = el("img", parent, { width: ww + "px", height: hh + "px", ...css });
  e.src = src;
  if (shadow) e.style.filter = shadow;
  e.draggable = false;
  e._w = ww; e._h = hh;
  return e;
}
export const SHADOW = {
  sticker: "drop-shadow(0 10px 14px rgba(20,0,40,0.30))",
  soft: "drop-shadow(0 24px 40px rgba(20,0,40,0.35))",
  deep: "drop-shadow(0 40px 60px rgba(0,0,0,0.45))",
};

/* ------------------------------------------------------------ sticker type
 * HIGH's type treatment: Roc Grotesk Compressed caps, fill + black stroke +
 * a white die-cut border + a hard offset shadow. Layers are drawn in passes
 * (shadow, border, stroke, fill) across all letters so the outline reads as
 * one silhouette, while every letter can still move on its own. */
const measureCtx = document.createElement("canvas").getContext("2d");
export function measure(text, size, weight = 900, family = "Roc", tracking = 0) {
  measureCtx.font = `${weight} ${size}px ${family}`;
  const xs = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const pre = measureCtx.measureText(text.slice(0, i)).width + tracking * i;
    const ch = measureCtx.measureText(text[i]).width;
    xs.push({ x: pre, w: ch });
    x = pre + ch;
  }
  const m = measureCtx.measureText("H");
  return { xs, width: x, cap: m.actualBoundingBoxAscent };
}
const NS = "http://www.w3.org/2000/svg";
export class StickerText {
  constructor(parent, text, o = {}) {
    this.text = text;
    this.o = o = { size: 200, weight: 900, family: "Roc", fill: "#fff", stroke: "#000", sw: 0, border: "#fff", bw: 0, shadow: null, tracking: 0, ...o };
    const m = measure(text, o.size, o.weight, o.family, o.tracking);
    const pad = Math.ceil(o.sw + o.bw + (o.shadow ? Math.max(Math.abs(o.shadow.dx), Math.abs(o.shadow.dy)) : 0) + o.size * 0.08);
    this.w = m.width + pad * 2;
    this.h = m.cap + pad * 2;
    this.cap = m.cap;
    this.base = pad + m.cap;
    this.node = el("div", parent, { width: this.w + "px", height: this.h + "px" });
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", this.w); svg.setAttribute("height", this.h);
    svg.style.overflow = "visible";
    this.node.appendChild(svg);
    const layers = [];
    if (o.shadow) layers.push({ col: o.shadow.color, sw: (o.sw + o.bw) * 2, dx: o.shadow.dx, dy: o.shadow.dy });
    if (o.bw > 0) layers.push({ col: o.border, sw: (o.sw + o.bw) * 2, dx: 0, dy: 0 });
    if (o.sw > 0) layers.push({ col: o.stroke, sw: o.sw * 2, dx: 0, dy: 0 });
    if (o.outlineOnly) layers.push({ col: "none", stroke: o.fill, sw: o.outlineOnly, dx: 0, dy: 0 });
    else layers.push({ col: o.fill, sw: 0, dx: 0, dy: 0 });
    this.letters = m.xs.map((g, i) => ({ x: pad + g.x, w: g.w, cx: pad + g.x + g.w / 2, cy: this.base - m.cap / 2, els: [] }));
    for (const L of layers) {
      const grp = document.createElementNS(NS, "g");
      if (L.dx || L.dy) grp.setAttribute("transform", `translate(${L.dx} ${L.dy})`);
      svg.appendChild(grp);
      this.letters.forEach((lt, i) => {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", lt.x); t.setAttribute("y", this.base);
        t.setAttribute("font-family", o.family); t.setAttribute("font-weight", o.weight); t.setAttribute("font-size", o.size);
        if (L.stroke) { t.setAttribute("fill", "none"); t.setAttribute("stroke", L.stroke); t.setAttribute("stroke-width", L.sw); }
        else {
          t.setAttribute("fill", L.col);
          if (L.sw > 0) { t.setAttribute("stroke", L.col); t.setAttribute("stroke-width", L.sw); t.setAttribute("stroke-linejoin", "round"); }
        }
        t.textContent = text[i];
        grp.appendChild(t);
        lt.els.push(t);
      });
    }
  }
  /** per-letter pose: {dx, dy, s, sx, sy, r, o} */
  letter(i, p = {}) {
    const lt = this.letters[i];
    const s = p.s ?? 1, sx = (p.sx ?? 1) * s, sy = (p.sy ?? 1) * s;
    const tr = `translate(${(lt.cx + (p.dx ?? 0)).toFixed(2)} ${(lt.cy + (p.dy ?? 0)).toFixed(2)}) rotate(${(p.r ?? 0).toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-lt.cx} ${-lt.cy})`;
    const op = clamp(p.o ?? 1);
    for (const e of lt.els) { e.setAttribute("transform", tr); e.setAttribute("opacity", op); e.style.display = op <= 0.001 || sx === 0 || sy === 0 ? "none" : ""; }
  }
  put(p) { put(this.node, p); }
}

/* plain HTML text line */
export function label(parent, text, css = {}) {
  const e = el("div", parent, { whiteSpace: "nowrap", ...css });
  e.textContent = text;
  return e;
}

/* ------------------------------------------------------------ canvases */
export function canvas(parent, w = W, h = H, css = {}) {
  const c = el("canvas", parent, { width: w + "px", height: h + "px", ...css });
  c.width = w; c.height = h;
  return c;
}
/** HIGH swirl: two-tone arms curling out from a centre (the brand's own background, redrawn so it stays sharp while it turns) */
export function drawSwirl(ctx, { a, b, arms = 24, twist = 0.0011, angle = 0, cx = CX, cy = CY, zoom = 1 }) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.fillStyle = a; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = b;
  const R = Math.hypot(w, h) * 0.75 / zoom, steps = 48;
  for (let i = 0; i < arms; i += 2) {
    const a0 = angle + (i * TAU) / arms, a1 = angle + ((i + 1) * TAU) / arms;
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) { const r = (k / steps) * R; const th = a0 + twist * r; ctx.lineTo(cx + r * zoom * Math.cos(th), cy + r * zoom * Math.sin(th)); }
    for (let k = steps; k >= 0; k--) { const r = (k / steps) * R; const th = a1 + twist * r; ctx.lineTo(cx + r * zoom * Math.cos(th), cy + r * zoom * Math.sin(th)); }
    ctx.closePath(); ctx.fill();
  }
}
/** HIGH waves: vertical stripes with a travelling ripple */
export function drawWaves(ctx, { a, b, period = 150, amp = 38, wl = 420, phase = 0, drift = 0 }) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.fillStyle = a; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = b;
  const n = Math.ceil(w / period) + 3, steps = 40;
  for (let i = -2; i < n; i++) {
    const x0 = i * period + (drift % period);
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) { const y = (k / steps) * (h + 40) - 20; ctx.lineTo(x0 + amp * Math.sin(TAU * y / wl + phase + i * 0.35), y); }
    for (let k = steps; k >= 0; k--) { const y = (k / steps) * (h + 40) - 20; ctx.lineTo(x0 + period * 0.46 + amp * Math.sin(TAU * y / wl + phase + i * 0.35 + 0.7), y); }
    ctx.closePath(); ctx.fill();
  }
}
/** comic speed rays from a point */
export function drawRays(ctx, { col, n = 36, cx = CX, cy = CY, angle = 0, inner = 180, alpha = 1, width = 0.5 }) {
  const R = Math.hypot(ctx.canvas.width, ctx.canvas.height);
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a0 = angle + (i * TAU) / n, a1 = a0 + (TAU / n) * width;
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(a0), cy + inner * Math.sin(a0));
    ctx.lineTo(cx + R * Math.cos(a0), cy + R * Math.sin(a0));
    ctx.lineTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1));
    ctx.lineTo(cx + inner * Math.cos(a1), cy + inner * Math.sin(a1));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** draw an image to cover a rect */
export function cover(ctx, im, x, y, w, h, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const sw = w / s, sh = h / s;
  ctx.drawImage(im, (im.naturalWidth - sw) * fx, (im.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
}

/* ------------------------------------------------------------ the phone
 * The HIGH mockup (display cut out, 944×1850, display at 79,50 790×1734 r118)
 * with a live screen underneath, sized by height. */
export class Phone {
  constructor(parent, height, shadow = SHADOW.deep) {
    const k = (this.k = height / 1850);
    this.node = el("div", parent, { width: 944 * k + "px", height: 1850 * k + "px" });
    if (shadow) this.node.style.filter = shadow;
    this.screenBox = el("div", this.node, { left: (79 - 3) * k + "px", top: (50 - 3) * k + "px", width: (790 + 6) * k + "px", height: (1734 + 6) * k + "px", borderRadius: (118 + 3) * k + "px", overflow: "hidden", background: "#000" });
    this.cv = canvas(this.screenBox, Math.round((790 + 6) * k), Math.round((1734 + 6) * k));
    this.ctx = this.cv.getContext("2d");
    this.ctx.imageSmoothingQuality = "high";
    const f = el("img", this.node, { width: 944 * k + "px", height: 1850 * k + "px" });
    f.src = "a/obj/phone.png";
  }
  /** draw frame(s): {a: img, b?: img, mix: 0..1 (b slides up over a)} */
  screen(a, b = null, mix = 0) {
    const c = this.ctx, w = this.cv.width, h = this.cv.height;
    cover(c, a, 0, 0, w, h);
    if (b && mix > 0) {
      const y = h * (1 - mix);
      c.fillStyle = `rgba(0,0,0,${0.45 * mix})`; c.fillRect(0, 0, w, h);
      c.save(); c.beginPath(); c.rect(0, y, w, h - y); c.clip(); cover(c, b, 0, y, w, h); c.restore();
    }
  }
  put(p) { put(this.node, p); }
}
