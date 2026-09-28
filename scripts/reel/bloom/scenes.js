/* Bloom Algo showreel — "Making algo trading feel less like an algorithm."
 *
 * 12 s loop at 30 fps. Bloom is HIGH's opposite: calm, airy, iridescent.
 * Nothing slams; everything floats, blurs in and dissolves. Pastel light,
 * glass cards with soft shadows, the brand's own chrome flowers, goldfish
 * and butterfly, the blue pinwheel.
 *
 *  0.0  "Algo trading for everyone." over the chrome flowers (loop anchor / poster)
 *  2.4  Choose. / Deploy. / Trade. — the product on floating glass cards
 *  6.2  Automated underneath. Visible on top. — notifications and live widgets drift
 *  8.6  goldfish → butterfly: "Making algo trading feel less like an algorithm."
 * 10.6  back to the flowers
 */
import * as L from "../lib.js";
const { W, H, CX, CY, DUR, E, prog, lerp, clamp, noise, put, pic, el, canvas, cover, TAU } = L;

const NAVY = "#141A3A", SUB = "#5B6180";
export const ASSETS = ["a/flowers.jpg", "a/goldfish.jpg", "a/butterfly.jpg", "a/notif.png", "a/mtm.png", "a/pl.png", "a/instances.png", "a/plcard.png", "a/logo.png"];
export const SEQS = { strategy: 270, deployed: 150, trade: 150, alerts: 150 };

export const shots = [];
let stage;
function shot(name, t0, t1) {
  const root = el("div", stage, { width: W + "px", height: H + "px", overflow: "hidden" });
  const s = { name, t0, t1, root, update: () => {} };
  shots.push(s);
  return s;
}
export function local(s, gt) {
  if (gt >= s.t0 && gt < s.t1) return gt - s.t0;
  if (gt + DUR >= s.t0 && gt + DUR < s.t1) return gt + DUR - s.t0;
  return null;
}
const soft = (t, t0, dur = 0.7) => E.inOutSine(prog(t0, t0 + dur, t));
/** dreamy in/out for a whole layer: opacity + blur + drift */
function dream(e, k, { blur = 18, dy = 0, s0 = 1 } = {}) {
  e.style.opacity = String(k);
  e.style.filter = k < 0.999 ? `blur(${((1 - k) * blur).toFixed(2)}px)` : "none";
  if (dy || s0 !== 1) e.style.transform = `translateY(${((1 - k) * dy).toFixed(1)}px) scale(${lerp(s0, 1, k).toFixed(4)})`;
}
/** a headline whose words blur in one after another */
class Line {
  constructor(parent, parts, css) {
    this.node = el("div", parent, { whiteSpace: "nowrap", font: css.font, color: css.color, letterSpacing: css.ls ?? "-0.02em", textShadow: css.shadow ?? "none" });
    this.words = [];
    parts.forEach(([text, italic], pi) => text.split(" ").forEach((w, wi) => {
      const sp = document.createElement("span");
      sp.textContent = w;
      Object.assign(sp.style, { display: "inline-block", marginRight: "0.24em", fontStyle: italic ? "italic" : "normal" });
      if (italic) sp.style.fontSynthesis = "style";
      this.node.appendChild(sp);
      this.words.push(sp);
    }));
  }
  /** k-in per word from t0 (stagger), and a shared k-out */
  set(t, t0, stagger = 0.14, out = 1) {
    this.words.forEach((sp, i) => {
      const k = soft(t, t0 + i * stagger, 0.8) * out;
      sp.style.opacity = String(k);
      sp.style.filter = k < 0.999 ? `blur(${((1 - k) * 14).toFixed(2)}px)` : "none";
      sp.style.transform = `translateY(${((1 - k) * 26).toFixed(1)}px)`;
    });
  }
}
/** pastel light: slow drifting blobs (drawn at half size, it is all blur anyway) */
function pastel(parent) {
  const c = canvas(parent, W / 2, H / 2, { width: W + "px", height: H + "px" });
  const ctx = c.getContext("2d");
  const blobs = [["#C9C2FF", 0.2, 0.25, 0.55], ["#A8D8FF", 0.8, 0.2, 0.6], ["#FFC9E6", 0.75, 0.85, 0.55], ["#FFE0C2", 0.15, 0.9, 0.5], ["#D6F3FF", 0.5, 0.5, 0.45]];
  return (t) => {
    ctx.fillStyle = "#F3F1FF"; ctx.fillRect(0, 0, W / 2, H / 2);
    blobs.forEach(([col, x, y, r], i) => {
      const bx = (x + 0.06 * Math.sin(TAU * (t / 12) + i * 1.7)) * (W / 2), by = (y + 0.06 * Math.cos(TAU * (t / 12) + i * 2.3)) * (H / 2), rr = r * (W / 2);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      g.addColorStop(0, col); g.addColorStop(1, col + "00");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W / 2, H / 2);
    });
  };
}
/** a glass card playing one of the product clips */
function card(parent, w, h) {
  const box = el("div", parent, { width: w + "px", height: h + "px", borderRadius: "46px", overflow: "hidden", background: "#fff", boxShadow: "0 50px 90px rgba(70,60,160,0.22), 0 8px 20px rgba(70,60,160,0.12), inset 0 0 0 1px rgba(255,255,255,0.8)" });
  const c = canvas(box, w, h), ctx = c.getContext("2d");
  return { box, show: (img) => cover(ctx, img, 0, 0, w, h) };
}
const frameOf = (name, t, from = 0, rate = 1) => { const list = L.seqs[name]; return list[clamp(Math.round(from + t * 30 * rate), 0, list.length - 1)]; };

export function build(stageEl) {
  stage = stageEl;

  /* ------------------------------------------------ product: Choose / Deploy / Trade (2.0 → 6.9) */
  const productBg = (() => {
    const s = shot("product", 2.0, 6.9);
    const bg = pastel(s.root);
    const words = [
      ["Choose.", "Find a strategy that fits."],
      ["Deploy.", "Two clicks from strategy to live."],
      ["Trade.", "Simple to use. Serious underneath."],
    ].map(([w, sub]) => ({
      big: new Line(s.root, [[w, false]], { font: "700 170px Manrope", color: NAVY, ls: "-0.04em" }),
      sub: new Line(s.root, [[sub, false]], { font: "500 40px Manrope", color: SUB, ls: "-0.01em" }),
    }));
    const inst = pic(s.root, "a/instances.png", { w: 250, css: { borderRadius: "28px", boxShadow: "0 30px 60px rgba(70,60,160,0.22)" } });
    const cards = ["strategy", "deployed", "trade"].map(() => card(s.root, 732, 760));
    const starts = [0.5, 1.7, 2.9]; // local: 2.5, 3.7, 4.9
    s.update = (p) => {
      bg(p + 2);
      words.forEach((w, i) => {
        const t0 = starts[i], t1 = i < 2 ? starts[i + 1] : 9;
        const out = 1 - soft(p, t1 - 0.25, 0.4);
        put(w.big.node, { x: 180, y: 520, ax: 0, o: p < t0 - 0.1 || p > t1 + 0.2 ? 0 : 1 });
        put(w.sub.node, { x: 186, y: 640, ax: 0, o: p < t0 - 0.1 || p > t1 + 0.2 ? 0 : 1 });
        w.big.set(p, t0, 0, out); w.sub.set(p, t0 + 0.25, 0.06, out);
      });
      cards.forEach((c, i) => {
        const t0 = starts[i] - 0.15, t1 = i < 2 ? starts[i + 1] - 0.15 : 9;
        const kin = soft(p, t0, 0.8), kout = soft(p, t1, 0.8);
        const float = Math.sin(TAU * (p / 3.2 + i * 0.3)) * 10;
        put(c.box, { x: 1330, y: 610 + (1 - kin) * 90 - kout * 70 + float, s: lerp(0.94, 1, kin) * lerp(1, 0.96, kout), r: (1 - kin) * 2 - kout * 1.5, o: kin * (1 - kout) });
        c.box.style.filter = kin * (1 - kout) < 0.999 ? `blur(${((1 - kin * (1 - kout)) * 16).toFixed(1)}px)` : "none";
        if (kin > 0 && kout < 1) c.show(frameOf(["strategy", "deployed", "trade"][i], p - t0, i === 0 ? 40 : 0, i === 0 ? 1.4 : 1));
      });
      const ki = soft(p, 1.9, 0.8) * (1 - soft(p, 2.9, 0.6));
      put(inst, { x: 930, y: 900 + Math.sin(TAU * p / 2.6) * 8, o: ki, r: -4 });
      inst.style.filter = ki < 0.999 ? `blur(${((1 - ki) * 12).toFixed(1)}px)` : "none";
    };
    return s;
  })();

  /* ------------------------------------------------ control: alerts + drifting widgets (6.2 → 9.3) */
  {
    const s = shot("control", 6.2, 9.3);
    const bg = pastel(s.root);
    const widgets = [
      { src: "a/mtm.png", x: 470, y: 300, w: 520, r: -3, d: 0.0 },
      { src: "a/pl.png", x: 450, y: 900, w: 500, r: 2, d: 0.12 },
      { src: "a/notif.png", x: 1470, y: 330, w: 520, r: 3, d: 0.24 },
      { src: "a/plcard.png", x: 1500, y: 860, w: 330, r: -4, d: 0.36 },
    ].map((d, i) => ({ ...d, i, n: pic(s.root, d.src, { w: d.w, css: { borderRadius: "30px", boxShadow: "0 36px 70px rgba(70,60,160,0.2)" } }) }));
    const c = card(s.root, 640, 664);
    const line = new Line(s.root, [["Automated underneath.", false], ["Visible on top.", true]], { font: "700 64px Manrope", color: NAVY, ls: "-0.03em" });
    s.update = (q) => {
      bg(q + 6.2);
      const kin = soft(q, 0, 0.8);
      dream(s.root, kin, { blur: 16 });
      const kc = soft(q, 0.2, 0.9);
      put(c.box, { x: CX, y: 560 + (1 - kc) * 80 + Math.sin(TAU * q / 3) * 8, s: lerp(0.94, 1, kc), o: kc });
      c.show(frameOf("alerts", q - 0.2));
      widgets.forEach((d) => {
        const k = soft(q, 0.5 + d.d, 1.0);
        const px = (d.x - CX) * 0.035 * q, py = Math.sin(TAU * (q / 3.4 + d.i * 0.27)) * 12;
        put(d.n, { x: d.x + px + (1 - k) * (d.x < CX ? -60 : 60), y: d.y + py, r: d.r, s: lerp(0.92, 1, k), o: k });
        d.n.style.filter = k < 0.999 ? `blur(${((1 - k) * 14).toFixed(1)}px)` : "none";
      });
      put(line.node, { x: CX, y: 1080 });
      line.set(q, 0.9, 0.12);
    };
  }

  /* ------------------------------------------------ art: goldfish → butterfly (8.6 → 11.4) */
  {
    const s = shot("art", 8.6, 11.4);
    const fish = pic(s.root, "a/goldfish.jpg", { w: W });
    const fly = pic(s.root, "a/butterfly.jpg", { w: W });
    el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(20,26,58,0.18), rgba(20,26,58,0) 70%)" });
    const l1 = new Line(s.root, [["Making algo trading feel", false]], { font: "600 76px Manrope", color: "#fff", ls: "-0.03em", shadow: "0 6px 30px rgba(20,26,58,0.35)" });
    const l2 = new Line(s.root, [["less like an algorithm.", true]], { font: "700 118px Manrope", color: "#fff", ls: "-0.04em", shadow: "0 8px 40px rgba(20,26,58,0.35)" });
    s.update = (a) => {
      dream(s.root, soft(a, 0, 0.9), { blur: 20 });
      put(fish, { x: CX, y: CY, s: lerp(1.08, 1.2, a / 2.8) });
      const kf = soft(a, 1.2, 1.0);
      put(fly, { x: CX + 20 * a, y: CY, s: lerp(1.14, 1.06, a / 2.8), o: kf });
      fly.style.filter = kf < 0.999 ? `blur(${((1 - kf) * 10).toFixed(1)}px)` : "none";
      put(l1.node, { x: CX, y: 520 }); l1.set(a, 0.35, 0.1);
      put(l2.node, { x: CX, y: 640 }); l2.set(a, 0.75, 0.12);
    };
  }

  /* ------------------------------------------------ open: the flowers + "Algo trading for everyone." (10.6 → 14.6 ≡ 2.6) */
  {
    const s = shot("open", 10.6, 14.6);
    const art = pic(s.root, "a/flowers.jpg", { w: 2250 });
    el("div", s.root, { width: W + "px", height: H + "px", background: "linear-gradient(90deg, rgba(246,244,255,0.86) 0%, rgba(246,244,255,0.62) 30%, rgba(246,244,255,0.18) 50%, rgba(246,244,255,0) 64%)" });
    const logo = pic(s.root, "a/logo.png", { w: 78 });
    const word = new Line(s.root, [["Bloom Algo", false]], { font: "700 44px Manrope", color: NAVY, ls: "-0.02em" });
    const l1 = new Line(s.root, [["Algo trading for", false]], { font: "600 118px Manrope", color: NAVY, ls: "-0.04em" });
    const l2 = new Line(s.root, [["everyone.", true]], { font: "600 150px Manrope", color: NAVY, ls: "-0.045em" });
    s.update = (u) => {
      const kin = soft(u, 0, 1.0), kout = soft(u, 3.4, 0.6); // in at 10.6, out at 2.0–2.6
      dream(s.root, kin * (1 - kout), { blur: 22 });
      put(art, { x: CX + 140 - 10 * u, y: CY, s: lerp(1.0, 1.06, u / 4) });
      const spin = -TAU * 0.25 * (1 - E.outCubic(prog(0.3, 1.6, u))) * 57.3 + u * 6;
      put(logo, { x: 190, y: 170, r: spin, s: lerp(0.6, 1, soft(u, 0.15, 0.9)), o: soft(u, 0.15, 0.9) * (1 - kout) });
      put(word.node, { x: 250, y: 172, ax: 0 }); word.set(u, 0.3, 0.1, 1 - kout);
      put(l1.node, { x: 180, y: 520, ax: 0 }); l1.set(u, 0.25, 0.1, 1 - kout);
      put(l2.node, { x: 172, y: 668, ax: 0 }); l2.set(u, 0.5, 0.14, 1 - kout);
    };
  }
  void productBg;
}
