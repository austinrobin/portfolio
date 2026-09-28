/* LWT showreel — "Reframing an engineering legacy for what comes next."
 *
 * 12 s loop at 30 fps. LWT is precise and forward-moving: every transition
 * is a cut on the mark's own 100° angle, led by an ignition-orange band;
 * type is Aeonik; grounds are Ember, Void and the signature orange gradient.
 *
 *  0.0  the mark on the gradient + the tagline (loop anchor / poster)
 *  2.0  the mark, drawn on its construction lines — "Bold innovation in motion."
 *  4.6  Engineering precision. | Human connection. — split on the 100° line
 *  6.7  One identity, many environments — seven applications, cut on the angle
 * 10.4  back to the mark
 */
import * as L from "../lib.js";
const { W, H, CX, CY, DUR, E, prog, lerp, clamp, put, pic, el, canvas, cover, TAU } = L;

const C = { void: "#050505", ember: "#220501", red: "#D11F0E", orange: "#FD5001", horizon: "#FFCDA3", silver: "#E6E6E6" };
const APPS = ["building-sign", "stage-screen", "flags", "lightbox", "hoarding", "business-cards", "auditorium"];
export const ASSETS = ["a/mark.png", "a/meter.jpg", "a/poster-family.jpg", ...APPS.map((k) => `a/${k}.jpg`)];
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
const SLANT = Math.tan((10 * Math.PI) / 180) * H; // the mark's 100° cut across the frame
/** clip keeping everything left of a slanted edge at x (edge measured at mid-height) */
const leftOf = (x) => `polygon(-400px 0, ${x + SLANT / 2}px 0, ${x - SLANT / 2}px ${H}px, -400px ${H}px)`;
const rightOf = (x) => `polygon(${x + SLANT / 2}px 0, ${W + 400}px 0, ${W + 400}px ${H}px, ${x - SLANT / 2}px ${H}px)`;
/** the ignition band that rides a wipe edge */
function band(parent, w = 220) {
  const b = el("div", parent, { width: w + "px", height: H + 80 + "px", background: `linear-gradient(90deg, ${C.red}, ${C.orange} 55%, ${C.horizon})`, zIndex: "40" });
  return (x, o = 1) => { b.style.display = o > 0 ? "" : "none"; b.style.transform = `translate(${x - w / 2}px, -40px) skewX(-10deg)`; };
}
const wipe = (t, t0, dur = 0.5) => E.inOutExpo(prog(t0, t0 + dur, t)); // 0..1
const edgeX = (k) => lerp(-420, W + 420, k);
function text(parent, str, css) { const d = el("div", parent, { whiteSpace: "nowrap", color: "#fff", ...css }); d.textContent = str; d.style.overflow = "hidden"; return d; }
/** a line that rises out of its own baseline */
function riseLine(parent, str, css) {
  const box = el("div", parent, { overflow: "hidden", whiteSpace: "nowrap" });
  const inner = el("div", box, { position: "relative", color: "#fff", ...css });
  inner.textContent = str;
  return { box, set: (t, t0, out = 0) => { const k = E.outExpo(prog(t0, t0 + 0.7, t)); inner.style.transform = `translateY(${((1 - k) * 110 - out * 110).toFixed(1)}%)`; } };
}
/** the mark as a colourable mask */
function mark(parent, w, color) {
  const im = L.imgs["a/mark.png"], h = (w * im.naturalHeight) / im.naturalWidth;
  const d = el("div", parent, { width: w + "px", height: h + "px", background: color, WebkitMaskImage: "url(a/mark.png)", WebkitMaskSize: "100% 100%", maskImage: "url(a/mark.png)", maskSize: "100% 100%" });
  d._h = h;
  return d;
}

export function build(stageEl) {
  stage = stageEl;

  /* ------------------------------------------------ the mark, on its construction (2.0 → 4.9) */
  {
    const s = shot("construct", 2.0, 4.9, C.ember);
    el("div", s.root, { width: W + "px", height: H + "px", backgroundImage: "linear-gradient(rgba(253,80,1,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,1,0.06) 1px, transparent 1px)", backgroundSize: "80px 80px" });
    const MW = 980, m = mark(s.root, MW, C.orange), mx = CX, my = 520, mh = m._h;
    const guides = [];
    const svg = el("div", s.root, { width: W + "px", height: H + "px" });
    const lines = [];
    // slanted 100° guides through the strokes, and the three horizontals
    [-380, -120, 140, 400].forEach((dx) => lines.push({ x1: mx + dx + Math.tan(0.1745) * 420, y1: my - 420, x2: mx + dx - Math.tan(0.1745) * 420, y2: my + 420 }));
    [my - mh / 2, my, my + mh / 2].forEach((y) => lines.push({ x1: 180, y1: y, x2: W - 180, y2: y }));
    svg.innerHTML = `<svg width="${W}" height="${H}">${lines.map((l, i) => `<line id="g${i}" x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="rgba(253,80,1,0.55)" stroke-width="2" stroke-dasharray="2000" stroke-dashoffset="2000"/>`).join("")}
      <path id="arc" d="M ${mx - 470} ${my - mh / 2 - 90} A 90 90 0 0 1 ${mx - 400} ${my - mh / 2 - 150}" fill="none" stroke="${C.horizon}" stroke-width="2" stroke-dasharray="400" stroke-dashoffset="400"/>
      <text id="deg" x="${mx - 520}" y="${my - mh / 2 - 150}" fill="${C.horizon}" font-family="Aeonik" font-weight="400" font-size="30" opacity="0">100°</text></svg>`;
    const gl = lines.map((_, i) => svg.querySelector(`#g${i}`)), arc = svg.querySelector("#arc"), deg = svg.querySelector("#deg");
    const kicker = text(s.root, "THE MARK", { font: "500 24px Aeonik", letterSpacing: "0.22em", color: C.orange });
    const l1 = riseLine(s.root, "Bold innovation", { font: "400 76px Aeonik", letterSpacing: "-0.02em" });
    const l2 = riseLine(s.root, "in motion.", { font: "300 76px Aeonik", letterSpacing: "-0.02em", color: C.horizon });
    s.update = (b) => {
      gl.forEach((g, i) => g.setAttribute("stroke-dashoffset", String(2000 * (1 - E.outExpo(prog(0.15 + i * 0.06, 0.95 + i * 0.06, b))))));
      arc.setAttribute("stroke-dashoffset", String(400 * (1 - E.outCubic(prog(0.6, 1.2, b)))));
      deg.setAttribute("opacity", String(prog(0.9, 1.2, b)));
      // the mark sweeps in along its own angle
      const k = E.inOutExpo(prog(0.55, 1.45, b));
      const ex = lerp(mx - MW / 2 - 200, mx + MW / 2 + 200, k) - (mx - MW / 2);
      m.style.clipPath = `polygon(-300px 0, ${ex + 70}px 0, ${ex - 70}px ${mh}px, -300px ${mh}px)`;
      put(m, { x: mx + 18 * (b - 1.5), y: my });
      put(kicker, { x: 180, y: 920, ax: 0, o: prog(1.3, 1.6, b) });
      put(l1.box, { x: 180, y: 1000, ax: 0 }); l1.set(b, 1.4);
      put(l2.box, { x: 180, y: 1086, ax: 0 }); l2.set(b, 1.55);
    };
  }

  /* ------------------------------------------------ precision | connection (4.6 → 7.2) */
  {
    const s = shot("idea", 4.6, 7.2, C.void);
    const left = el("div", s.root, { width: W + "px", height: H + "px" }), right = el("div", s.root, { width: W + "px", height: H + "px" });
    const lc = canvas(left), rc = canvas(right), lx = lc.getContext("2d"), rx = rc.getContext("2d");
    const shade = (p) => el("div", p, { width: W + "px", height: H + "px", background: "linear-gradient(0deg, rgba(5,5,5,0.7), rgba(5,5,5,0) 45%)" });
    shade(left); shade(right);
    const divider = band(s.root, 14);
    const tl = riseLine(left, "Engineering precision.", { font: "400 62px Aeonik", letterSpacing: "-0.02em" });
    const tr = riseLine(right, "Human connection.", { font: "400 62px Aeonik", letterSpacing: "-0.02em", color: C.horizon });
    const bnd = band(s.root);
    s.update = (c) => {
      const k = wipe(c, 0, 0.55); // enters over the construction
      s.root.style.clipPath = k < 1 ? leftOf(edgeX(k)) : "";
      bnd(edgeX(k), k > 0 && k < 1 ? 1 : 0);
      const split = lerp(W + 300, 900, E.outExpo(prog(0.45, 1.2, c)));
      lx.clearRect(0, 0, W, H); cover(lx, L.imgs["a/meter.jpg"], -80, -140 + c * 40, W * 0.62, H + 220, 0.5, 0.45);
      rx.clearRect(0, 0, W, H); cover(rx, L.imgs["a/poster-family.jpg"], 560 - c * 30, 0, W - 560 + 60, H, 0.55, 0.5);
      left.style.clipPath = leftOf(split); right.style.clipPath = rightOf(split);
      divider(split, c > 0.45 ? 1 : 0);
      put(tl.box, { x: 120, y: 1040, ax: 0 }); tl.set(c, 0.9);
      put(tr.box, { x: 1120, y: 1040, ax: 0 }); tr.set(c, 1.15);
    };
  }

  /* ------------------------------------------------ in the world (6.7 → 10.9) */
  {
    const s = shot("world", 6.7, 10.9); // transparent: the first application wipes in over the split
    const per = 0.58;
    const layers = APPS.map((k) => { const d = el("div", s.root, { width: W + "px", height: H + "px" }); const c = canvas(d); return { d, ctx: c.getContext("2d"), img: L.imgs[`a/${k}.jpg`] }; });
    el("div", s.root, { width: W + "px", height: H + "px", background: "linear-gradient(0deg, rgba(5,5,5,0.62), rgba(5,5,5,0) 38%)", zIndex: "20" });
    const kicker = text(s.root, "IN THE WORLD", { font: "500 24px Aeonik", letterSpacing: "0.22em", color: C.orange, zIndex: "30" });
    const cap = riseLine(s.root, "One identity, many environments.", { font: "400 62px Aeonik", letterSpacing: "-0.02em" });
    cap.box.style.zIndex = "30";
    const bnd = band(s.root);
    s.update = (w) => {
      let edge = null;
      layers.forEach((ly, i) => {
        const t0 = i * per, k = wipe(w, t0, 0.46);
        if (k <= 0) { ly.d.style.display = "none"; return; }
        ly.d.style.display = "";
        ly.d.style.clipPath = k < 1 ? leftOf(edgeX(k)) : "";
        if (k > 0 && k < 1) edge = edgeX(k);
        const life = w - t0, z = 1.05 + 0.05 * life;
        const ww = W * z, hh = H * z;
        ly.ctx.clearRect(0, 0, W, H);
        cover(ly.ctx, ly.img, (W - ww) / 2 - 24 * life, (H - hh) / 2, ww, hh);
      });
      bnd(edge ?? -999, edge === null ? 0 : 1);
      put(kicker, { x: 120, y: 960, ax: 0, o: prog(0.5, 0.8, w) });
      put(cap.box, { x: 120, y: 1050, ax: 0 }); cap.set(w, 0.55);
    };
  }

  /* ------------------------------------------------ the mark on the gradient (10.4 → 14.4 ≡ 2.4) */
  {
    const s = shot("anchor", 10.4, 14.4, C.void);
    const cv = canvas(s.root), ctx = cv.getContext("2d");
    const m = mark(s.root, 860, "#fff");
    const tag1 = riseLine(s.root, "Reframing an engineering legacy", { font: "300 50px Aeonik", letterSpacing: "-0.01em" });
    const tag2 = riseLine(s.root, "for what comes next.", { font: "300 50px Aeonik", letterSpacing: "-0.01em", color: C.horizon });
    const bnd = band(s.root);
    s.update = (u) => {
      const gtU = 10.4 + u;
      // the signature gradient with a slow rising sun
      const g = ctx.createLinearGradient(W * 1.05, -H * 0.2, W * 0.05, H * 1.15);
      g.addColorStop(0, C.horizon); g.addColorStop(0.3, C.orange); g.addColorStop(0.58, C.red); g.addColorStop(0.84, C.ember); g.addColorStop(1, C.void);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sy = lerp(1500, 1180, (gtU - 10.4) / 4), sun = ctx.createRadialGradient(1480, sy, 0, 1480, sy, 900);
      sun.addColorStop(0, "rgba(255,205,163,0.55)"); sun.addColorStop(0.45, "rgba(253,80,1,0.18)"); sun.addColorStop(1, "rgba(253,80,1,0)");
      ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
      // enter over the world (10.4), leave over the construction (2.0 → 2.4)
      const kin = wipe(u, 0, 0.5), kout = wipe(u, 3.6, 0.45);
      s.root.style.clipPath = kin < 1 ? leftOf(edgeX(kin)) : kout > 0 ? rightOf(edgeX(kout)) : "";
      bnd(kin < 1 ? edgeX(kin) : edgeX(kout), (kin > 0 && kin < 1) || (kout > 0 && kout < 1) ? 1 : 0);
      const arrive = E.outExpo(prog(0.3, 1.2, u)), leave = E.inExpo(prog(3.45, 4.0, u));
      m.style.transform = "";
      put(m, { x: CX - 260 * (1 - arrive) + 900 * leave, y: 520, o: prog(0.3, 0.5, u) });
      m.style.transform += ` skewX(${(-12 * (1 - arrive) - 14 * leave).toFixed(2)}deg)`;
      m.style.filter = arrive < 0.98 || leave > 0.02 ? `blur(${(10 * (1 - arrive) + 16 * leave).toFixed(1)}px)` : "none";
      put(tag1.box, { x: CX, y: 830 }); tag1.set(u, 0.75, leave);
      put(tag2.box, { x: CX, y: 900 }); tag2.set(u, 0.9, leave);
    };
  }
}
