"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { heroConfig, type HeroSettings } from "./hero-config";
import { CanvasHero2D } from "./canvas-hero-2d";

export { heroConfig, type HeroSettings } from "./hero-config";

/*
 * WebGL pixel-reveal hero.
 *
 * A fragment shader composites a background-coloured pixel lattice over the
 * underlay image. A trail of recent pointer positions (uniform ring buffer)
 * carves a fluid reveal whose mosaic resolves from coarse blocks to fine
 * detail; press-and-hold grows the reveal radius. Clicks spawn damped
 * water ripples that displace the lattice and refract the image, fading
 * out over a few seconds. Falls back to the Canvas-2D version without WebGL.
 *
 * Tunables live in content/hero.json — live-editable from /studio.
 */

const TRAIL_N = 16;
const RIPPLE_N = 10;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;

uniform vec2 uRes;          // css px
uniform vec3 uBg;
uniform vec3 uSeam;
uniform float uTexture;     // idle surface texture strength
uniform float uCell;        // lattice size, css px
uniform float uDeform;      // lattice deformation amount
uniform float uRippleStrength;
uniform float uTrailLambda; // trail fade rate (1/s)
uniform sampler2D uImage;
uniform vec2 uImageSize;
uniform float uImageReady;
uniform vec4 uTrail[${TRAIL_N}];   // x, y, age(s), radius(px); age < 0 = inactive
uniform vec3 uRipples[${RIPPLE_N}]; // x, y, age(s); age < 0 = inactive

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  // y-down pixel coords, matching pointer math
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;

  /* ---- water ripples: height + gradient (for displacement) ---- */
  float h = 0.0;
  vec2 grad = vec2(0.0);
  for (int i = 0; i < ${RIPPLE_N}; i++) {
    vec3 r = uRipples[i];
    if (r.z < 0.0) continue;
    float age = r.z;
    vec2 dv = px - r.xy;
    float d = length(dv) + 1e-4;
    float front = 300.0 * age;               // wavefront distance
    float band = exp(-abs(d - front) * 0.014);
    float damp = exp(-age * 1.5) * uRippleStrength;
    float phase = 0.10 * (d - front);
    float w = sin(phase) * band * damp;
    h += w;
    grad += (dv / d) * cos(phase) * band * damp;
  }

  /* ---- fluid reveal energy from the pointer trail ---- */
  float m = 0.0;
  for (int i = 0; i < ${TRAIL_N}; i++) {
    vec4 t = uTrail[i];
    if (t.z < 0.0) continue;
    float d = distance(px, t.xy);
    float fall = 1.0 - smoothstep(t.w * 0.15, t.w, d);
    float life = exp(-t.z * uTrailLambda);
    m = max(m, fall * life);
  }
  // ripples briefly reveal a shimmer of the world
  m = clamp(m + abs(h) * 0.30, 0.0, 1.0);
  m *= uImageReady;

  /* ---- deform the lattice with the ripple field ---- */
  vec2 warp = grad * 9.0 * uDeform;
  vec2 pw = px + warp;

  vec2 cellId = floor(pw / uCell);
  vec2 cellUv = fract(pw / uCell);
  float jitter = hash(cellId);

  // dithered per-cell threshold keeps a pixel feel at the fringe,
  // blended with the smooth field so the motion stays fluid
  float mq = clamp(m + (jitter - 0.5) * 0.22 * (1.0 - m), 0.0, 1.0);
  float mask = mix(mq, m, 0.45);
  mask = smoothstep(0.06, 0.94, mask);

  /* ---- cover: bg with per-cell tint + seams, fading with reveal ---- */
  float tint = (jitter - 0.5) * 0.045 * uTexture;
  vec3 cover = uBg + tint;
  vec2 seamD = min(cellUv, 1.0 - cellUv);
  float seam = 1.0 - smoothstep(0.0, 0.10, min(seamD.x, seamD.y));
  cover = mix(cover, uSeam, seam * 0.65);
  // faint ripple sheen on the cover itself
  cover += h * 0.035;

  /* ---- image: cover-fit, mosaic resolving with the mask, refracted ---- */
  float scale = max(uRes.x / uImageSize.x, uRes.y / uImageSize.y);
  vec2 imgPx = (px + warp * 1.6 - 0.5 * uRes) / scale + 0.5 * uImageSize;
  float mos = mix(uCell * 1.25, 1.5, mask) / scale;
  vec2 mosPx = (floor(imgPx / mos) + 0.5) * mos;
  vec2 imgUv = clamp(mosPx / uImageSize, 0.0, 1.0);
  vec3 img = texture2D(uImage, imgUv).rgb;
  img += h * 0.05; // water light

  gl_FragColor = vec4(mix(cover, img, mask), 1.0);
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

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // remount the GL scene when tunables change (studio live preview)
  const cfgKey = `${cfg.cell}|${cfg.hoverRadius}|${cfg.holdRadius}|${cfg.holdGrowMs}|${cfg.decay}|${cfg.textureStrength}|${cfg.rippleStrength}|${cfg.deform}`;

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

    const c = cfgRef.current;
    const HOVER_R = c.hoverRadius;
    const HOLD_R = c.holdRadius;
    const HOLD_GROW_MS = c.holdGrowMs;
    const DECAY = Math.min(0.98, Math.max(0.7, c.decay));
    // slider 0.7 → fast fade, 0.98 → long lingering trail
    const TRAIL_LAMBDA = 7.0 - ((DECAY - 0.7) / 0.28) * 5.8;

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
    const uCell = U("uCell");
    const uDeform = U("uDeform");
    const uRippleStrength = U("uRippleStrength");
    const uTrailLambda = U("uTrailLambda");
    const uImageSize = U("uImageSize");
    const uImageReady = U("uImageReady");
    const uTrail = U("uTrail");
    const uRipples = U("uRipples");

    gl.uniform1f(uCell, Math.max(4, c.cell));
    gl.uniform1f(uTexture, c.textureStrength);
    gl.uniform1f(uDeform, c.deform);
    gl.uniform1f(uRippleStrength, c.rippleStrength);
    gl.uniform1f(uTrailLambda, TRAIL_LAMBDA);
    gl.uniform1i(U("uImage"), 0);

    /* ---------- image texture ---------- */
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
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
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.uniform2f(uImageSize, img.naturalWidth, img.naturalHeight);
      gl.uniform1f(uImageReady, 1);
      wake();
    };

    /* ---------- state ---------- */
    const trail = new Float32Array(TRAIL_N * 4).fill(-1);
    const ripples = new Float32Array(RIPPLE_N * 3).fill(-1);
    let trailHead = 0;
    let rippleHead = 0;
    let px = -1e4;
    let py = -1e4;
    let inside = false;
    let holding = false;
    let holdStart = 0;
    let currentR = HOVER_R;
    let last = performance.now();
    let raf = 0;
    let running = false;
    let bgKey = "";

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const syncColors = () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      if (bg === bgKey) return;
      bgKey = bg;
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
    };

    const anythingAlive = () => {
      for (let i = 0; i < TRAIL_N; i++) {
        if (trail[i * 4 + 2] >= 0) return true;
      }
      for (let i = 0; i < RIPPLE_N; i++) {
        if (ripples[i * 3 + 2] >= 0) return true;
      }
      return false;
    };

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      syncColors();

      // hold growth
      const targetR = holding
        ? HOVER_R +
          (HOLD_R - HOVER_R) *
            easeOutCubic(Math.min((now - holdStart) / HOLD_GROW_MS, 1))
        : HOVER_R;
      currentR += (targetR - currentR) * 0.16;

      // age everything
      for (let i = 0; i < TRAIL_N; i++) {
        const a = trail[i * 4 + 2];
        if (a >= 0) {
          const na = a + dt;
          trail[i * 4 + 2] = na > 2.5 ? -1 : na;
        }
      }
      for (let i = 0; i < RIPPLE_N; i++) {
        const a = ripples[i * 3 + 2];
        if (a >= 0) {
          const na = a + dt;
          ripples[i * 3 + 2] = na > 4 ? -1 : na;
        }
      }

      // write the current pointer into the ring
      if (inside) {
        trail[trailHead * 4] = px;
        trail[trailHead * 4 + 1] = py;
        trail[trailHead * 4 + 2] = 0;
        trail[trailHead * 4 + 3] = currentR;
        trailHead = (trailHead + 1) % TRAIL_N;
      }

      gl.uniform4fv(uTrail, trail);
      gl.uniform3fv(uRipples, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!inside && !holding && !anythingAlive()) {
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
      // spawn a water ripple
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
      wake();
      frame();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(section);
    window.addEventListener("resize", onResize);

    const mo = new MutationObserver(() => {
      bgKey = "";
      wake();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const onLost = (e: Event) => e.preventDefault();
    const onRestored = () => setNoWebgl(true); // simplest safe path: fall back
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    resize();
    syncColors();
    gl.drawArrays(gl.TRIANGLES, 0, 3); // first paint: full cover

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
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey, noWebgl]);

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
      {/* Painted cover + underlay + effect, all on the GPU */}
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
