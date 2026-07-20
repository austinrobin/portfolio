"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { heroConfig, type HeroSettings } from "./hero-config";
import { CanvasHero2D } from "./canvas-hero-2d";

export { heroConfig, type HeroSettings } from "./hero-config";

/*
 * LED-matrix imprint hero.
 *
 * The surface is a lattice of rounded tiles. Around the cursor the underlay
 * image is IMPRINTED onto the tiles (one colour per tile, mosaic style)
 * rather than revealed through a window. Tiles ease in/out with a random
 * per-tile response lag (trail), the near zone gets randomly animated
 * white "elevation" sparkles (tech/glitch shine), the far zone is colour
 * only, and every active tile breathes its opacity so the field feels
 * alive. Clicks send a ripple ring of activation through the tiles.
 *
 * Per-tile easing runs on the CPU (a small state grid uploaded as a
 * texture each frame — this is what gives true ease-in/out with random
 * delay); all visual treatment happens in the fragment shader. Falls back
 * to the Canvas-2D version when WebGL is unavailable.
 *
 * Tunables live in content/hero.json — live-editable from /studio.
 */

const RIPPLE_N = 10;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;

uniform vec2 uRes;        // css px
uniform vec3 uBg;
uniform vec3 uSeam;
uniform float uTexture;   // idle surface texture strength
uniform float uCell;      // tile size, css px
uniform float uTime;      // seconds
uniform vec2 uPointer;    // css px (last known)
uniform float uNearR;     // shine zone radius, css px
uniform float uShine;     // elevation/shine intensity
uniform sampler2D uImage;
uniform vec2 uImageSize;
uniform float uImageReady;
uniform sampler2D uState; // per-tile activation, NEAREST
uniform vec2 uGrid;       // cols, rows

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  // y-down pixel coords, matching pointer math
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;

  vec2 cellId = floor(px / uCell);
  vec2 cellUv = fract(px / uCell);
  vec2 cellCenter = (cellId + 0.5) * uCell;

  /* ---- per-tile eased activation from the CPU sim ---- */
  float a = texture2D(uState, (cellId + 0.5) / uGrid).r;
  a = smoothstep(0.0, 1.0, a); // S-curve → ease-in-out feel
  a *= uImageReady;

  /* ---- static per-tile randomness ---- */
  float h1 = hash(cellId);
  float h2 = hash(cellId + 57.31);

  /* ---- cluster patchiness (reference look): coarse groups, drifting ---- */
  float c1 = hash(floor(cellId / 3.0));
  float c2 = hash(floor(cellId / 6.0) + 21.7);
  float drift = 0.5 + 0.5 * sin(uTime * (0.25 + 0.6 * c1) + c1 * 6.2831);
  float cluster = 0.62 + 0.38 * mix(c2, drift, 0.6);
  float A = a * cluster;

  /* ---- lively opacity variance on active tiles ---- */
  float breathe = 0.82 + 0.18 * sin(uTime * (1.1 + 2.2 * h2) + h2 * 6.2831);
  A *= breathe;

  /* ---- imprint colour: image sampled once per tile (mosaic) ---- */
  float scale = max(uRes.x / uImageSize.x, uRes.y / uImageSize.y);
  vec2 imgPx = (cellCenter - 0.5 * uRes) / scale + 0.5 * uImageSize;
  vec2 imgUv = clamp(imgPx / uImageSize, 0.0, 1.0);
  vec3 img = texture2D(uImage, imgUv).rgb;

  /* ---- near-zone: randomly animated elevation shine ---- */
  float dNow = distance(cellCenter, uPointer);
  float near = 1.0 - smoothstep(uNearR * 0.35, uNearR, dNow);
  float flick = 0.5 + 0.5 * sin(uTime * (2.0 + 7.0 * h1) + h1 * 40.0);
  float spark = step(0.955, fract(h1 * 9.13 + uTime * (0.35 + 0.9 * h2)));
  float shine = near * a * uShine * (0.18 * flick + 0.85 * spark * (0.4 + 0.6 * flick));

  /* ---- tile shape: rounded LED tile with dark grout when active ---- */
  vec2 q = abs(cellUv - 0.5);
  float inset = 0.075;
  float edge = max(q.x, q.y);
  float tileMask = 1.0 - smoothstep(0.5 - inset - 0.06, 0.5 - inset, edge);

  /* ---- idle cover surface ---- */
  float tint = (h1 - 0.5) * 0.045 * uTexture;
  vec3 cover = uBg + tint;
  float idleSeam = 1.0 - smoothstep(0.0, 0.10, min(0.5 - q.x, 0.5 - q.y));
  cover = mix(cover, uSeam, idleSeam * 0.65);

  /* ---- composite: imprint the image onto the tile face ---- */
  vec3 grout = mix(cover, uBg * 0.25 + vec3(0.02), min(a * 1.4, 1.0));
  vec3 lit = mix(cover, img, A);
  lit = mix(lit, vec3(1.0), clamp(shine, 0.0, 1.0) * 0.9);
  lit += img * shine * 0.35;

  vec3 col = mix(grout, lit, tileMask);
  gl_FragColor = vec4(col, 1.0);
}`;

function parseRgb(s: string): [number, number, number] {
  const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [250, 249, 247];
}

export function CanvasHero({
  overrides,
  compact = false,
}: {
  overrides?: Partial<HeroSettings>;
  compact?: boolean;
}) {
  const cfg: HeroSettings = { ...heroConfig, ...overrides };
  const [noWebgl, setNoWebgl] = useState(false);
  const [glEpoch, setGlEpoch] = useState(0); // bumped to rebuild after context restore

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // remount the GL scene when tunables change (studio live preview)
  const cfgKey = `${cfg.cell}|${cfg.hoverRadius}|${cfg.holdRadius}|${cfg.holdGrowMs}|${cfg.decay}|${cfg.textureStrength}|${cfg.rippleStrength}|${cfg.nearRatio}|${cfg.shine}`;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const gl =
      canvas.getContext("webgl", {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      }) ?? canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      setNoWebgl(true);
      return;
    }

    // capture this render's settings — the effect re-runs via cfgKey whenever
    // any sim-relevant field changes, so this never goes stale
    const c = cfg;
    const CELL = Math.max(6, c.cell);
    const HOVER_R = c.hoverRadius;
    const HOLD_R = c.holdRadius;
    const HOLD_GROW_MS = Math.max(1, c.holdGrowMs);
    const DECAY = Math.min(0.98, Math.max(0.7, c.decay));
    // fall speed: persistence slider → slower fade for longer trails
    const FALL_K = 14.0 - ((DECAY - 0.7) / 0.28) * 11.5; // 14 → 2.5 (1/s)
    const RISE_K = 16.0;

    /* ---------- program ---------- */
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) ?? "shader compile failed");
      }
      return sh;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) ?? "link failed");
      }
    } catch {
      setNoWebgl(true);
      return;
    }
    gl.useProgram(prog);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = U("uRes");
    const uBg = U("uBg");
    const uSeam = U("uSeam");
    const uTexture = U("uTexture");
    const uCellU = U("uCell");
    const uTime = U("uTime");
    const uPointer = U("uPointer");
    const uNearR = U("uNearR");
    const uShine = U("uShine");
    const uImageSize = U("uImageSize");
    const uImageReady = U("uImageReady");
    const uGrid = U("uGrid");

    gl.uniform1f(uCellU, CELL);
    gl.uniform1f(uTexture, c.textureStrength);
    gl.uniform1f(uShine, c.shine);
    gl.uniform1i(U("uImage"), 0);
    gl.uniform1i(U("uState"), 1);

    /* ---------- image texture (unit 0) ---------- */
    const imgTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      1,
      1,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      new Uint8Array([250, 249, 247]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform2f(uImageSize, 1, 1);
    gl.uniform1f(uImageReady, 0);

    let disposed = false;
    const img = new window.Image();
    img.src = "/hero-underlay.jpg";
    img.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.uniform2f(uImageSize, img.naturalWidth, img.naturalHeight);
      gl.uniform1f(uImageReady, 1);
      wake();
    };
    img.onerror = () => {
      console.warn("hero underlay failed to load — imprint stays dormant");
    };

    /* ---------- per-tile state (unit 1) ---------- */
    const stateTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, stateTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    let cols = 0;
    let rows = 0;
    let v: Float32Array = new Float32Array(0); // activation per tile
    let rate: Float32Array = new Float32Array(0); // random response factor
    let bytes: Uint8Array = new Uint8Array(0);

    const ripples = new Float32Array(RIPPLE_N * 3).fill(-1);
    let rippleHead = 0;
    let px = -1e4;
    let py = -1e4;
    let inside = false;
    let holding = false;
    let holdStart = 0;
    let currentR = HOVER_R;
    const start = performance.now();
    let last = start;
    let raf = 0;
    let running = false;
    let colorsDirty = true;
    let maxV = 0;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const initGrid = () => {
      const nCols = Math.max(1, Math.ceil(section.clientWidth / CELL));
      const nRows = Math.max(1, Math.ceil(section.clientHeight / CELL));
      // keep live tile state across no-op resize events
      if (nCols === cols && nRows === rows) return;
      cols = nCols;
      rows = nRows;
      v = new Float32Array(cols * rows);
      rate = new Float32Array(cols * rows);
      for (let i = 0; i < rate.length; i++) rate[i] = 0.35 + 1.35 * Math.random();
      bytes = new Uint8Array(cols * rows);
      gl.uniform2f(uGrid, cols, rows);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, stateTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE,
        cols,
        rows,
        0,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        bytes,
      );
    };

    const syncColors = () => {
      if (!colorsDirty) return;
      colorsDirty = false;
      const bg = getComputedStyle(document.body).backgroundColor;
      const [r, g, b] = parseRgb(bg);
      const light = (r + g + b) / 3 > 128;
      const sd = light ? -11 : 13;
      gl.uniform3f(uBg, r / 255, g / 255, b / 255);
      gl.uniform3f(uSeam, (r + sd) / 255, (g + sd) / 255, (b + sd) / 255);
    };

    const resize = () => {
      const w = section.clientWidth;
      const hgt = section.clientHeight;
      if (w === 0 || hgt === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(w * dpr);
      const bh = Math.round(hgt * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${hgt}px`;
      }
      gl.viewport(0, 0, bw, bh);
      gl.uniform2f(uRes, w, hgt);
      initGrid();
    };

    const anyRipple = () => {
      for (let i = 0; i < RIPPLE_N; i++) {
        if (ripples[i * 3 + 2] >= 0) return true;
      }
      return false;
    };

    const simulate = (dt: number) => {
      // hold growth (dt-based so feel is refresh-rate independent)
      const now = performance.now();
      const targetR = holding
        ? HOVER_R +
          (HOLD_R - HOVER_R) *
            easeOutCubic(Math.min((now - holdStart) / HOLD_GROW_MS, 1))
        : HOVER_R;
      currentR += (targetR - currentR) * (1 - Math.exp(-11 * dt));

      // age ripples (retired once their envelope is imperceptible)
      for (let i = 0; i < RIPPLE_N; i++) {
        const a = ripples[i * 3 + 2];
        if (a >= 0) {
          const na = a + dt;
          ripples[i * 3 + 2] = na > 3.0 ? -1 : na;
        }
      }

      const R = currentR;
      const innerR = R * 0.15;
      maxV = 0;
      for (let cy = 0; cy < rows; cy++) {
        const cyPx = (cy + 0.5) * CELL;
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          const cxPx = (cx + 0.5) * CELL;

          // target from cursor proximity
          let T = 0;
          if (inside) {
            const dx = cxPx - px;
            const dy = cyPx - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < R) {
              const t = Math.min(Math.max((R - d) / (R - innerR), 0), 1);
              T = t * t * (3 - 2 * t);
            }
          }
          // ripple rings push activation through the field
          for (let ri = 0; ri < RIPPLE_N; ri++) {
            const age = ripples[ri * 3 + 2];
            if (age < 0) continue;
            const dx = cxPx - ripples[ri * 3];
            const dy = cyPx - ripples[ri * 3 + 1];
            const d = Math.sqrt(dx * dx + dy * dy);
            const front = 300 * age;
            const band = Math.exp(-Math.abs(d - front) * 0.02);
            const ring =
              band * Math.exp(-age * 1.0) * c.rippleStrength;
            if (ring > T) T = ring;
          }

          // eased approach with per-tile random response (delay + trail)
          const k = (T > v[i] ? RISE_K : FALL_K) * rate[i];
          v[i] += (T - v[i]) * (1 - Math.exp(-k * dt));
          if (v[i] >= 1) v[i] = 1; // clamp before Uint8 quantise (no wraparound)
          else if (v[i] < 0.004) v[i] = 0;
          if (v[i] > maxV) maxV = v[i];
          bytes[i] = (v[i] * 255) | 0;
        }
      }

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, stateTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        cols,
        rows,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        bytes,
      );
    };

    const frame = () => {
      // dead-man guards: no zombie loops after unmount or context loss
      if (disposed || gl.isContextLost()) {
        running = false;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      syncColors();
      simulate(dt);

      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uPointer, px, py);
      gl.uniform1f(uNearR, currentR * c.nearRatio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!inside && !holding && maxV === 0 && !anyRipple()) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const toLocal = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    };
    const onMove = (e: PointerEvent) => {
      toLocal(e);
      inside = true;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      toLocal(e);
      inside = true;
      holding = true;
      holdStart = performance.now();
      ripples[rippleHead * 3] = px;
      ripples[rippleHead * 3 + 1] = py;
      ripples[rippleHead * 3 + 2] = 0;
      rippleHead = (rippleHead + 1) % RIPPLE_N;
      wake();
    };
    const onUp = () => {
      holding = false;
      wake();
    };
    const onLeave = () => {
      inside = false;
      holding = false;
      wake();
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerdown", onDown);
    section.addEventListener("pointerup", onUp);
    section.addEventListener("pointercancel", onUp);
    section.addEventListener("pointerleave", onLeave);

    const onResize = () => {
      resize();
      if (running) return; // active loop picks the new size up next frame
      // repaint once without starting a competing rAF chain
      syncColors();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(section);
    window.addEventListener("resize", onResize);

    const mo = new MutationObserver(() => {
      colorsDirty = true;
      wake();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // opt into restoration on loss and rebuild the scene once restored
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      running = false;
    };
    const onRestored = () => setGlEpoch((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    resize();
    syncColors();
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uPointer, -1e4, -1e4);
    gl.uniform1f(uNearR, HOVER_R * c.nearRatio);
    gl.drawArrays(gl.TRIANGLES, 0, 3); // first paint: idle cover

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointerup", onUp);
      section.removeEventListener("pointercancel", onUp);
      section.removeEventListener("pointerleave", onLeave);
      // free resources but keep the context usable — the effect re-runs on
      // the SAME canvas for studio tweaks/StrictMode, and getContext would
      // hand back a context killed by loseContext() forever.
      gl.deleteProgram(prog);
      gl.deleteBuffer(quad);
      gl.deleteTexture(imgTex);
      gl.deleteTexture(stateTex);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey, noWebgl, glEpoch]);

  if (noWebgl) {
    return <CanvasHero2D overrides={overrides} compact={compact} />;
  }

  return (
    <section
      ref={sectionRef}
      className={`relative w-full cursor-crosshair select-none overflow-hidden ${
        compact ? "h-full min-h-[320px]" : "h-[calc(100svh-4rem)] min-h-[540px]"
      }`}
      style={{ touchAction: "pan-y" }}
      aria-label={cfg.headline}
    >
      {/* Painted cover + imprint effect, all on the GPU */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 bg-background"
        aria-hidden
      />

      {/* Centre text */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
        <h1
          className={`text-center font-display leading-none tracking-tight ${
            compact ? "text-3xl" : "text-6xl sm:text-8xl"
          }`}
        >
          {cfg.headline}
        </h1>
      </div>
    </section>
  );
}
