/* MACH showreel — "Making the impossible feel production-ready."
 *
 * 12 s loop at 30 fps. MACH is virtual production: cinema, cut hard. The
 * reel is letterboxed 2.39:1 and seen through a camera's viewfinder — gold
 * corner brackets, REC, a running timecode on the bars — and every shot is
 * the studio's own footage. Type is Benzin, wide and slanted like the
 * livery on the jet's tail; the one colour is the livery's gold.
 *
 *  0.0  the LED-tile cube, MACH in gold (loop anchor / poster)
 *  1.35 the stage: the volume lights up — World-class production…
 *  3.45 the camera: its monitor sees green; a gold scan turns it into the world
 *  5.75 anywhere: the same two people, five worlds; the frame opens up
 *  8.4  on location: the Defender through three worlds, then the jet, then its tail
 * 10.75 MACH slams in over the tail → the cube
 */
import * as L from "../lib.js";
const { W, H, CX, CY, DUR, E, prog, lerp, clamp, put, el, canvas } = L;

const C = { black: "#050505", gold: "#E9AA2B", white: "#F4F1EA", red: "#FF3B30" };
export const ASSETS = [];
export const SEQS = { cube: 84, led1: 36, led2: 30, lcd: 42, final: 36, street: 16, desert: 16, jungle: 16, globe: 16, room: 18, dune: 15, lake: 15, market: 15, road: 15, jet: 21, tail: 24 };
const BAR = 198, IMG_Y = BAR, IMG_H = H - 2 * BAR; // 2.39:1 inside the 16:10 stage
const SLANT = "skewX(-10deg)";

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
/** a frame of a cut, `t` seconds in (held on its last frame) */
const frame = (name, t) => { const f = L.seqs[name]; return f[clamp(Math.floor(t * 30), 0, f.length - 1)]; };
/** draw a film frame into a rect with a slow push-in */
function film(ctx, img, { y = IMG_Y, h = IMG_H, push = 1, fx = 0.5, fy = 0.5 } = {}) {
  const w = W * push, hh = h * push;
  ctx.drawImage(img, (W - w) * fx, y + (h - hh) * fy, w, hh);
}
/** a slanted headline that slides up out of a mask */
function slant(parent, str, css) {
  const box = el("div", parent, { overflow: "hidden", whiteSpace: "nowrap", padding: "0.1em 0.3em 0.14em 0.1em" });
  const inner = el("div", box, { position: "relative", color: C.white, transform: SLANT, textShadow: "0 6px 40px rgba(0,0,0,0.55)", ...css });
  inner.textContent = str;
  return { box, inner, set: (t, t0, out = 0) => { const k = E.outExpo(prog(t0, t0 + 0.55, t)); inner.style.transform = `translateY(${((1 - k) * 115 + out * 115).toFixed(1)}%) ${SLANT}`; } };
}
function kicker(parent, str) { const d = el("div", parent, { whiteSpace: "nowrap", font: "500 20px Benzin", letterSpacing: "0.32em", color: C.gold, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }); d.textContent = str; return d; }
/** a bottom-up shade over the picture, so the type reads */
function shade(parent, y = IMG_Y, h = IMG_H) { el("div", parent, { top: y + "px", width: W + "px", height: h + "px", background: "linear-gradient(0deg, rgba(5,5,5,0.78) 0%, rgba(5,5,5,0.25) 38%, rgba(5,5,5,0) 60%)" }); }

export function build(stageEl) {
  stage = stageEl;

  /* ------------------------------------------------ the stage (1.35 → 3.45) */
  {
    const s = shot("stage", 1.35, 3.45, C.black);
    const ctx = canvas(s.root).getContext("2d"); ctx.imageSmoothingQuality = "high";
    shade(s.root);
    const k = kicker(s.root, "SC.01 — THE STAGE");
    const l1 = slant(s.root, "World-class production,", { font: "700 70px Benzin" });
    const l2 = slant(s.root, "without the usual constraints.", { font: "700 70px Benzin", color: C.gold });
    s.update = (t) => {
      ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
      if (t < 1.2) film(ctx, frame("led1", t), { push: 1 + 0.05 * t });
      else film(ctx, frame("led2", t - 1.2), { push: 1.04 + 0.05 * (t - 1.2) });
      put(k, { x: 120, y: 790, ax: 0, o: prog(0.2, 0.4, t) });
      put(l1.box, { x: 104, y: 862, ax: 0 }); l1.set(t, 0.25);
      put(l2.box, { x: 104, y: 944, ax: 0 }); l2.set(t, 0.4);
    };
  }

  /* ------------------------------------------------ the camera (3.45 → 5.75) */
  {
    const s = shot("camera", 3.45, 5.75, C.black);
    const lcdCtx = canvas(s.root).getContext("2d");
    const finL = el("div", s.root, { width: W + "px", height: H + "px" }); const finCtx = canvas(finL).getContext("2d");
    const scan = el("div", s.root, { top: IMG_Y + "px", width: "4px", height: IMG_H + "px", background: C.gold, boxShadow: `0 0 30px 8px rgba(233,170,43,0.55)` });
    shade(s.root);
    const k = kicker(s.root, "SC.02 — BETWEEN TWO WORLDS");
    const l1 = slant(s.root, "Creative enough to excite.", { font: "700 70px Benzin" });
    const l2 = slant(s.root, "Technical enough to trust.", { font: "700 70px Benzin", color: C.gold });
    s.update = (t) => {
      lcdCtx.fillStyle = C.black; lcdCtx.fillRect(0, 0, W, H);
      film(lcdCtx, frame("lcd", t), { push: 1 + 0.06 * t });
      // the gold scan: green screen on one side, the finished world on the other
      const wk = E.inOutCubic(prog(1.1, 1.55, t)), x = lerp(W + 40, -40, wk);
      finCtx.clearRect(0, 0, W, H);
      if (wk > 0) { finCtx.fillStyle = C.black; finCtx.fillRect(0, IMG_Y, W, IMG_H); film(finCtx, frame("final", t - 1.1), { push: 1.08 - 0.05 * (t - 1.1) }); }
      finL.style.clipPath = wk < 1 ? `inset(0 0 0 ${x.toFixed(1)}px)` : "";
      put(scan, { x, y: 0, ax: 0.5, ay: 0, o: wk > 0 && wk < 1 ? 1 : 0 });
      put(k, { x: 120, y: 790, ax: 0, o: prog(0.2, 0.4, t) });
      put(l1.box, { x: 104, y: 862, ax: 0 }); l1.set(t, 0.3);
      put(l2.box, { x: 104, y: 944, ax: 0 }); l2.set(t, 1.35);
    };
  }

  /* ------------------------------------------------ anywhere (5.75 → 8.4) */
  const WORLDS = [["street", "SET 01 — STREET"], ["desert", "SET 02 — DESERT"], ["jungle", "SET 03 — JUNGLE"], ["globe", "SET 04 — SNOW GLOBE"], ["room", "SET 05 — LIVING ROOM"]];
  const PER = 0.53;
  {
    const s = shot("anywhere", 5.75, 8.4, C.black);
    const ctx = canvas(s.root).getContext("2d"); ctx.imageSmoothingQuality = "high";
    shade(s.root, 60, H - 120);
    const set = kicker(s.root, "");
    const k = kicker(s.root, "SC.03 — ONE STAGE, EVERY WORLD");
    const l1 = slant(s.root, "Your stage,", { font: "800 150px Benzin" });
    const l2 = slant(s.root, "anywhere.", { font: "800 150px Benzin", color: C.gold });
    s.update = (t) => {
      const i = clamp(Math.floor(t / PER), 0, WORLDS.length - 1), lt = t - i * PER;
      ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
      film(ctx, frame(WORLDS[i][0], lt), { y: 60, h: 1080, push: 1.02 + 0.03 * lt });
      set.textContent = WORLDS[i][1];
      put(set, { x: 120, y: 150, ax: 0, o: prog(0.1, 0.25, t) });
      put(k, { x: 120, y: 690, ax: 0, o: prog(0.15, 0.35, t) });
      put(l1.box, { x: 96, y: 800, ax: 0 }); l1.set(t, 0.2);
      put(l2.box, { x: 96, y: 960, ax: 0 }); l2.set(t, 0.72);
    };
  }

  /* ------------------------------------------------ on location (8.4 → 10.9) */
  const DRIVE = [["dune", 0, 0.45], ["lake", 0.45, 0.45], ["market", 0.9, 0.45], ["jet", 1.35, 0.5], ["tail", 1.85, 0.65]];
  {
    const s = shot("drive", 8.4, 10.9, C.black);
    const ctx = canvas(s.root).getContext("2d"); ctx.imageSmoothingQuality = "high";
    shade(s.root);
    const k = kicker(s.root, "SC.04 — ON LOCATION");
    const l1 = slant(s.root, "Possibilities", { font: "800 96px Benzin" });
    const l2 = slant(s.root, "made limitless.", { font: "800 96px Benzin", color: C.gold });
    s.update = (t) => {
      const cut = DRIVE.filter(([, t0]) => t >= t0).pop();
      const lt = t - cut[1];
      ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
      film(ctx, frame(cut[0], lt), { push: 1.03 + 0.06 * lt });
      const out = prog(1.75, 1.9, t); // the type clears before the tail
      put(k, { x: 120, y: 760, ax: 0, o: prog(0.1, 0.3, t) * (1 - out) });
      put(l1.box, { x: 104, y: 850, ax: 0 }); l1.set(t, 0.15, out);
      put(l2.box, { x: 104, y: 950, ax: 0 }); l2.set(t, 0.3, out);
    };
  }

  /* ------------------------------------------------ MACH (10.75 → 13.4 ≡ 1.4) */
  {
    const s = shot("anchor", 10.75, 13.4);
    const black = el("div", s.root, { width: W + "px", height: H + "px", background: C.black });
    const cv = canvas(s.root); const ctx = cv.getContext("2d"); ctx.imageSmoothingQuality = "high";
    const glow = el("div", s.root, { width: W + "px", height: H + "px", background: "radial-gradient(ellipse 45% 38% at 50% 48%, rgba(233,170,43,0.22), rgba(233,170,43,0) 70%)" });
    const k = el("div", s.root, { whiteSpace: "nowrap", font: "500 22px Benzin", letterSpacing: "0.42em", color: C.gold });
    k.textContent = "VIRTUAL PRODUCTION";
    const word = el("div", s.root, { whiteSpace: "nowrap", font: "800 330px Benzin", letterSpacing: "0.01em", color: C.gold, textShadow: "0 0 80px rgba(233,170,43,0.35), 0 10px 60px rgba(0,0,0,0.6)" });
    word.textContent = "MACH";
    const tag = el("div", s.root, { whiteSpace: "nowrap", font: "400 30px Benzin", letterSpacing: "0.02em", color: "rgba(244,241,234,0.86)" });
    tag.textContent = "Making the impossible feel production-ready.";
    s.update = (u) => {
      // MACH slams in over the jet's tail, then the tail gives way to the cube
      const bg = prog(0.12, 0.3, u);
      black.style.opacity = String(bg);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = E.outCubic(prog(0.2, 0.7, u)) * 0.9;
      film(ctx, frame("cube", u * 0.95), { push: 1.08 - 0.03 * u });
      ctx.globalAlpha = 1;
      glow.style.opacity = String(prog(0.3, 0.9, u));
      const slam = E.outExpo(prog(0, 0.32, u));
      put(word, { x: CX, y: 590, s: lerp(1.35, 1, slam), o: prog(0, 0.06, u), filter: slam < 0.98 ? `blur(${((1 - slam) * 18).toFixed(1)}px)` : "none" });
      word.style.transform += ` ${SLANT}`;
      put(k, { x: CX, y: 385, o: prog(0.45, 0.7, u) });
      const tk = E.outExpo(prog(0.55, 1.15, u));
      put(tag, { x: CX, y: 790 + 30 * (1 - tk), o: tk });
    };
  }

  /* ------------------------------------------------ the viewfinder: bars, brackets, REC, timecode (whole loop) */
  {
    const s = shot("chrome", 0, DUR);
    const top = el("div", s.root, { width: W + "px", background: C.black, zIndex: "1" });
    const bot = el("div", s.root, { width: W + "px", background: C.black, zIndex: "1" });
    const hud = el("div", s.root, { width: W + "px", height: H + "px", zIndex: "2" });
    const rec = el("div", hud, { whiteSpace: "nowrap", font: "400 22px Mono", letterSpacing: "0.12em", color: C.white });
    rec.innerHTML = `<span id="dot" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${C.red};margin-right:14px;vertical-align:-1px"></span>REC`;
    const dot = rec.querySelector("#dot");
    const tc = el("div", hud, { whiteSpace: "nowrap", font: "400 22px Mono", letterSpacing: "0.12em", color: C.white });
    const spec = el("div", hud, { whiteSpace: "nowrap", font: "400 20px Mono", letterSpacing: "0.14em", color: "rgba(244,241,234,0.55)" });
    spec.textContent = "4K   24P   ISO 800   2.39:1";
    const brand = el("div", hud, { whiteSpace: "nowrap", font: "800 26px Benzin", color: C.gold, transform: SLANT }); brand.textContent = "MACH";
    const site = el("div", hud, { whiteSpace: "nowrap", font: "400 20px Mono", letterSpacing: "0.14em", color: "rgba(244,241,234,0.55)" }); site.textContent = "MACHVISUALS.COM";
    const corners = [0, 1, 2, 3].map(() => el("div", hud, { width: "64px", height: "64px", borderColor: C.gold, borderStyle: "solid", borderWidth: "0" }));
    corners[0].style.borderWidth = "3px 0 0 3px"; corners[1].style.borderWidth = "3px 3px 0 0"; corners[2].style.borderWidth = "0 0 3px 3px"; corners[3].style.borderWidth = "0 3px 3px 0";
    const flash = el("div", s.root, { width: W + "px", height: H + "px", background: "#fff", zIndex: "3" });
    const CUTS = [1.35, 2.55, 3.45, 5.75, 5.75 + PER, 5.75 + 2 * PER, 5.75 + 3 * PER, 5.75 + 4 * PER, 8.4, 8.85, 9.3, 9.75, 10.25, 10.75];
    s.update = (gt) => {
      // the frame opens up for the worlds, and closes again for the road
      const open = E.outExpo(prog(5.75, 6.15, gt)) * (1 - E.inOutCubic(prog(8.3, 8.42, gt)));
      const bar = lerp(BAR, 60, open);
      top.style.height = bar + "px"; bot.style.height = bar + "px"; bot.style.top = H - bar + "px";
      const hudOn = 1 - prog(0, 0.4, open);
      const ty = bar / 2, by = H - bar / 2;
      dot.style.opacity = Math.floor(gt * 2) % 2 === 0 ? "1" : "0.25";
      put(rec, { x: 120, y: ty, ax: 0, o: hudOn });
      const f = Math.floor(gt * 30) % 30, sec = Math.floor(gt) + 12; // 01:00:12:00 at the loop's start
      tc.textContent = `TC 01:00:${String(sec).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
      put(tc, { x: W - 120, y: ty, ax: 1, o: hudOn });
      put(spec, { x: CX, y: ty, o: hudOn });
      put(brand, { x: 120, y: by, ax: 0, o: hudOn });
      put(site, { x: W - 120, y: by, ax: 1, o: hudOn });
      const inset = 44, y0 = bar + inset, y1 = H - bar - inset;
      put(corners[0], { x: inset + 40, y: y0, ax: 0, ay: 0 }); put(corners[1], { x: W - inset - 40, y: y0, ax: 1, ay: 0 });
      put(corners[2], { x: inset + 40, y: y1, ax: 0, ay: 1 }); put(corners[3], { x: W - inset - 40, y: y1, ax: 1, ay: 1 });
      // a camera-flash frame on every cut
      let fl = 0;
      for (const c of CUTS) { const d = gt - c; if (d >= 0 && d < 0.12) fl = Math.max(fl, 0.32 * (1 - d / 0.12)); }
      flash.style.opacity = String(fl); flash.style.display = fl > 0.003 ? "" : "none";
    };
  }
}
