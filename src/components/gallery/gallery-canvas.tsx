"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { galleryItems } from "@/lib/gallery";
import { BanknoteNav } from "@/components/banknote-nav";
import { heroFonts } from "@/components/home/hero-config";

/*
 * The Gallery — a flight through the work (reference: Gufram's SPACE mode,
 * card treatment: curved ad-reel reference).
 *
 *  · Pieces float in a depth field. The camera drifts forward on its own —
 *    work slowly appears far off, comes in, scales up and sweeps past.
 *    Scrolling feeds velocity on top of the drift; it decays back.
 *  · Passing the camera recycles a piece to the far end, so the stream
 *    never runs out. Fade-in at the far edge, fade-out just before the
 *    pass, so nothing pops.
 *  · CURVED SURFACES (WebGL): every piece is a subdivided plane bent by a
 *    vertex shader — a standing cylindrical bow per card (axis + direction
 *    dealt deterministically), aimed inward at the camera like the inside
 *    of a sphere, drawn with true perspective foreshortening, rounded
 *    corners and curvature shading. Speed feeds a travelling ripple on
 *    top — paper caught in the slipstream.
 *  · SOUND (WebAudio, synthesised — zero assets): a filtered-noise woosh
 *    whose volume follows speed, and a two-blade shutter click when a
 *    piece passes the camera at speed. Audio can only start after a user
 *    gesture, so it arms on click/key; a quiet toggle sits bottom-right.
 *
 * All rAF + refs; React renders once. Reduced motion gets a plain grid
 * (and no audio, no GL).
 */

const ZSPAN = 14; // depth of the field, arbitrary units
const IDLE_SPEED = 0.35; // units/s of self-drift
const SCROLL_GAIN = 0.0045;
const BOOST_DECAY = 1.6; // /s
const MAX_BOOST = 6;
const FOV = 1.9;

/* card material — the curved-reel treatment */
const BASE_BEND = 0.24; // standing bow, fraction of card width
const SPEED_BEND = 0.1; // extra bow at full speed
const FLUTTER = 0.055; // travelling ripple amp at full speed, × width
const AIM_X = 0.5; // rad of inward yaw at the viewport edge
const AIM_Y = 0.38; // rad of inward pitch at the viewport edge
const FOCAL = 900; // perspective focal length, css px
const RADIUS_FRAC = 0.045; // corner radius, fraction of card width
const TAU = Math.PI * 2;

/* radial formation — even spokes on one fixed ring; depth follows angle,
   so the field reads as a clean helix tunnel, not a random scatter. The
   whole formation swirls collectively as it travels. */
const RING_R = 0.6;
const TURNS = 5; // helix windings across the depth field — fills the circle
const RECYCLE_AT = 0.85; // depth where a passed card jumps to the far end
const ROT_IDLE = 0.045; // rad/s of collective swirl at rest
const ROT_SPEED = 0.11; // extra swirl per unit of travel speed
const ROLL_LEAN = 0.3; // bounded lean into the swirl — never flips a card

/* deterministic per-card hash in [0,1) — CPU-seeded, never raw time */
const hash = (i: number, s: number) => ((i * 12.9898 + s * 78.233) * 43758.5453) % 1;

const VERT = `
attribute vec2 aPos;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uRoll;
uniform vec2 uAim;
uniform float uCurve;
uniform float uAxis;
uniform float uPhase;
uniform float uFlut;
varying vec2 vUv;
varying float vShade;
void main() {
  vUv = aPos + 0.5;
  vec3 p = vec3(aPos * uSize, 0.0);
  // bend axis frame
  float ca = cos(uAxis), sa = sin(uAxis);
  float nx = (ca * p.x + sa * p.y) / max(uSize.x, 1.0); // -0.5..0.5 along bend
  // standing cylindrical bow (parabolic arc) + travelling ripple
  p.z += uCurve * (0.5 - 2.0 * nx * nx);
  p.z += uFlut * sin(nx * 6.2831 + uPhase);
  // curvature shading from the surface slope
  float slope = (-4.0 * uCurve * nx + uFlut * 6.2831 * cos(nx * 6.2831 + uPhase)) / max(uSize.x, 1.0);
  vShade = 1.0 - clamp(abs(slope), 0.0, 1.0) * 0.16;
  // roll
  float cr = cos(uRoll), sr = sin(uRoll);
  p = vec3(cr * p.x - sr * p.y, sr * p.x + cr * p.y, p.z);
  // aim inward at the camera (yaw then pitch)
  float cy = cos(uAim.x), sy = sin(uAim.x);
  p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  float cx = cos(uAim.y), sx = sin(uAim.y);
  p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
  // perspective toward the viewer
  float w = ${FOCAL.toFixed(1)} / max(${FOCAL.toFixed(1)} - p.z, 1.0);
  vec2 s = uCenter + p.xy * w;
  vec2 ndc = (s / uRes) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
varying float vShade;
uniform sampler2D uTex;
uniform float uAlpha;
uniform highp vec2 uSize;
uniform float uHasTex;
float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float r = uSize.x * ${RADIUS_FRAC.toFixed(3)};
  float d = sdRoundRect(p, uSize * 0.5, r);
  float mask = 1.0 - smoothstep(-1.2, 0.3, d);
  float edge = smoothstep(-2.6, -1.2, d); // lit rim = card thickness
  vec4 tex = texture2D(uTex, vUv);
  vec3 card = mix(vec3(0.937, 0.929, 0.902), tex.rgb, uHasTex); // paper until loaded
  vec3 col = card * vShade;
  col = mix(col, vec3(0.985, 0.978, 0.955), edge * 0.5);
  float a = uAlpha * mask;
  gl_FragColor = vec4(col * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("gallery shader:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

export function GalleryCanvas() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mutedRef = useRef(false);
  const muteBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reduce) return;
    /* one deal per load: Fisher–Yates over a copy, so the stream's sequence
       is fresh each visit but stays fixed across recycles */
    const items = [...galleryItems];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return; // fallback: nav + hint still render; grid below covers it

    /* ---------------- geometry: one subdivided unit plane ---------------- */
    const SEG_X = 32;
    const SEG_Y = 20;
    const verts: number[] = [];
    for (let yi = 0; yi < SEG_Y; yi++) {
      for (let xi = 0; xi < SEG_X; xi++) {
        const x0 = xi / SEG_X - 0.5;
        const x1 = (xi + 1) / SEG_X - 0.5;
        const y0 = yi / SEG_Y - 0.5;
        const y1 = (yi + 1) / SEG_Y - 0.5;
        verts.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
      }
    }
    const vertCount = verts.length / 2;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("gallery link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes");
    const uCenter = U("uCenter");
    const uSize = U("uSize");
    const uRoll = U("uRoll");
    const uAim = U("uAim");
    const uCurve = U("uCurve");
    const uAxis = U("uAxis");
    const uPhase = U("uPhase");
    const uFlut = U("uFlut");
    const uAlpha = U("uAlpha");
    const uHasTex = U("uHasTex");
    gl.uniform1i(U("uTex"), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    /* ---------------- textures: rasterise each piece once ---------------- */
    const n = items.length;
    const textures: (WebGLTexture | null)[] = new Array(n).fill(null);
    const aspects: number[] = new Array(n).fill(4 / 3);
    let disposed = false;
    items.forEach((it, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (disposed) return;
        const iw = img.naturalWidth || 800;
        const ih = img.naturalHeight || 600;
        aspects[i] = iw / ih;
        // draw through 2D canvas (SVG-safe), capped for texture weight
        // power-of-two rasterisation so mipmaps can kill minification shimmer
        const pot = (v: number) =>
          Math.pow(2, Math.max(6, Math.min(10, Math.round(Math.log2(v)))));
        const tw = pot(iw * 2);
        const th = pot((tw * ih) / iw);
        const c = document.createElement("canvas");
        c.width = tw;
        c.height = th;
        const ctx2 = c.getContext("2d");
        if (!ctx2) return;
        ctx2.drawImage(img, 0, 0, tw, th);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
        if (aniso)
          gl.texParameterf(
            gl.TEXTURE_2D,
            aniso.TEXTURE_MAX_ANISOTROPY_EXT,
            Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
          );
        textures[i] = tex;
        drawFrame(performance.now()); // eager repaint as pieces arrive
      };
      img.src = it.src;
    });

    /* ---------------- per-card character (deterministic) ---------------- */
    const bendDir = items.map((_, i) => (hash(i, 1) < 0.5 ? -1 : 1));
    const bendAxis = items.map(
      (_, i) => (hash(i, 2) - 0.5) * 1.2, // mostly vertical-axis bows, ±35°
    );
    const rollBase = items.map((_, i) => (hash(i, 3) - 0.5) * 0.2);
    const phase = items.map((_, i) => hash(i, 4) * TAU);

    /* ---------------- state ---------------- */
    const z = items.map((_, i) => ((i + 0.5) / n) * ZSPAN);
    const order = items.map((_, i) => i);
    let boost = 0;
    let speedNorm = 0;
    let flutPhase = 0;
    let worldAngle = 0;
    let last = performance.now();
    let raf = 0;
    let vw = 0;
    let vh = 0;

    const resize = () => {
      vw = wrap.clientWidth;
      vh = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, vw, vh);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /* ---------------- audio ---------------- */
    let ctx: AudioContext | null = null;
    let wooshGain: GainNode | null = null;
    let lastShutter = 0;

    const armAudio = () => {
      if (ctx) {
        // wheel isn't "user activation" in Chrome — resume whenever we can
        if (ctx.state === "suspended") void ctx.resume();
        return;
      }
      try {
        ctx = new AudioContext();
        if (ctx.state === "suspended") void ctx.resume();
        // woosh: looped noise through a low bandpass, gain rides speed
        const len = ctx.sampleRate * 2;
        const buf2 = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf2.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf2;
        src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 380;
        bp.Q.value = 0.6;
        wooshGain = ctx.createGain();
        wooshGain.gain.value = 0;
        src.connect(bp).connect(wooshGain).connect(ctx.destination);
        src.start();
      } catch {
        ctx = null;
      }
    };

    const shutter = (strength: number) => {
      if (!ctx || mutedRef.current) return;
      const now = ctx.currentTime;
      if (now - lastShutter < 0.14) return;
      lastShutter = now;
      // two tight noise blades = curtain open/close
      for (const [dt, dur, level] of [
        [0, 0.018, 0.5],
        [0.052, 0.026, 0.32],
      ] as const) {
        const len = Math.ceil(ctx.sampleRate * dur);
        const b = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = b.getChannelData(0);
        for (let i = 0; i < len; i++)
          ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ctx.createBufferSource();
        s.buffer = b;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1800;
        const g = ctx.createGain();
        g.gain.value = level * Math.min(1, 0.3 + strength);
        s.connect(hp).connect(g).connect(ctx.destination);
        s.start(now + dt);
      }
    };

    /* ---------------- input ---------------- */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      armAudio();
      boost = Math.min(MAX_BOOST, Math.max(-2, boost + e.deltaY * SCROLL_GAIN));
    };
    const onPointerDown = () => armAudio();
    const onKey = () => armAudio();

    /* ---------------- frame ---------------- */
    const drawFrame = (now: number) => {
      const t = now / 1000;
      const cx = vw / 2;
      const cy = vh / 2;
      gl.clear(gl.COLOR_BUFFER_BIT);

      // painter's order: far first
      order.sort((p, q) => z[q] - z[p] || p - q);
      for (const i of order) {
        const d = z[i];
        const k = FOV / d;
        const a = ((i * TURNS) / n) * TAU + worldAngle;
        const x = cx + Math.cos(a) * RING_R * cx * k * 1.15;
        const y = cy + Math.sin(a) * RING_R * cy * k * 1.3;

        // far fade-in, near fade-out (gone before it can flash the screen)
        const fadeIn = Math.min(
          1,
          Math.max(0, (ZSPAN + RECYCLE_AT - d) / (ZSPAN * 0.25)),
        );
        const fadeOut = Math.min(1, Math.max(0, (d - 0.9) / 1.1));
        const o = Math.min(fadeIn, fadeOut);
        if (o <= 0.004) continue;

        const w = items[i].w * k;
        const h = w / aspects[i];

        // standing bow + speed bow; ripple only in the slipstream
        const bow = Math.max(
          -FOCAL * 0.4,
          Math.min(w * (BASE_BEND + SPEED_BEND * speedNorm) * bendDir[i], FOCAL * 0.4),
        );
        const flut = w * FLUTTER * speedNorm;
        const roll =
          rollBase[i] * 0.5 +
          ROLL_LEAN * Math.sin(a) +
          Math.sin(t * 2.6 + phase[i]) * 0.06 * speedNorm;

        gl.uniform2f(uCenter, x, y);
        gl.uniform2f(uSize, w, h);
        gl.uniform1f(uRoll, roll);
        gl.uniform2f(
          uAim,
          -((x - cx) / cx) * AIM_X,
          ((y - cy) / cy) * AIM_Y,
        );
        gl.uniform1f(uCurve, bow);
        gl.uniform1f(uAxis, bendAxis[i]);
        gl.uniform1f(uPhase, (flutPhase + phase[i]) % TAU);
        gl.uniform1f(uFlut, flut);
        gl.uniform1f(uAlpha, o);
        gl.uniform1f(uHasTex, textures[i] ? 1 : 0);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.drawArrays(gl.TRIANGLES, 0, vertCount);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const v = IDLE_SPEED + boost;
      boost *= Math.exp(-BOOST_DECAY * dt);
      speedNorm += (Math.min(Math.abs(boost) / MAX_BOOST, 1) - speedNorm) * 0.08;
      flutPhase = (flutPhase + dt * 3.4) % TAU; // wrapped — mediump-safe

      worldAngle = (worldAngle + (ROT_IDLE + v * ROT_SPEED) * dt) % TAU;
      for (let i = 0; i < n; i++) {
        z[i] -= v * dt;
        if (z[i] < RECYCLE_AT) {
          // one clean jump past ZSPAN — spawn depth sits BELOW the reverse
          // wrap threshold, so a recycled card can never ping-pong (the old
          // 0.12/ZSPAN pair trapped cards in an invisible flicker loop)
          z[i] += ZSPAN;
          if (speedNorm > 0.22) shutter(speedNorm);
        } else if (z[i] > ZSPAN + RECYCLE_AT) {
          z[i] -= ZSPAN; // (reverse travel)
        }
      }

      drawFrame(now);

      if (wooshGain && ctx) {
        wooshGain.gain.setTargetAtTime(
          mutedRef.current ? 0 : speedNorm * 0.26,
          ctx.currentTime,
          0.08,
        );
      }

      raf = requestAnimationFrame(frame);
    };

    drawFrame(last); // eager first paint — no blank flash before rAF
    (wrap as HTMLDivElement & { __armAudio?: () => void }).__armAudio = armAudio;
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      for (const tx of textures) if (tx) gl.deleteTexture(tx);
      void ctx?.close();
    };
  }, [reduce]);

  if (reduce) {
    return (
      <div className="mx-auto max-w-5xl columns-2 gap-4 px-6 py-24 sm:columns-3">
        {galleryItems.map((it, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${it.src}${i}`}
            src={it.src}
            alt={it.alt ?? ""}
            className="mb-4 w-full rounded-md"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`fixed inset-0 z-10 touch-none overflow-hidden bg-background ${heroFonts.silk.variable}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* the home page's banknote nav, above the whole field */}
      <div className="absolute inset-x-0 top-0 z-[1200]">
        <BanknoteNav />
      </div>

      <p className="pointer-events-none absolute bottom-6 left-6 z-[1200] font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
        Gallery — scroll to fly
      </p>
      <button
        ref={muteBtnRef}
        onClick={() => {
          (
            wrapRef.current as
              | (HTMLDivElement & { __armAudio?: () => void })
              | null
          )?.__armAudio?.();
          mutedRef.current = !mutedRef.current;
          if (muteBtnRef.current)
            muteBtnRef.current.textContent = mutedRef.current
              ? "sound off"
              : "sound on";
        }}
        className="absolute bottom-6 right-6 z-[1200] font-mono text-[10px] uppercase tracking-[0.25em] text-muted transition-colors hover:text-foreground"
      >
        sound on
      </button>
    </div>
  );
}
