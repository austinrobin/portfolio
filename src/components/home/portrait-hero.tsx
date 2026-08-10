"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { heroConfig, type HeroSettings } from "./hero-config";
import { PortraitHero2D } from "./portrait-hero-2d";

export { heroConfig, type HeroSettings } from "./hero-config";

/*
 * Portrait glitch-reveal hero.
 *
 * Two pixel-aligned portraits of the same head — currency/banknote engraving
 * art (A) and the real face (B) — composited in a fragment shader. A pointer
 * trail is accumulated into a small CPU field grid, uploaded as a texture,
 * then domain-warped by fbm and HARD-thresholded, so the reveal boundary
 * tears rather than fading. Horizontal bands near the boundary displace their
 * sampling to give the datamosh smear. When no pointer is present an
 * auto-scan pointer drifts across the head (this is what drives touch
 * devices); a real pointer takes over via a crossfaded stamp weight, so
 * handover never jumps.
 *
 * The real portrait's alpha is the shared silhouette. The art may ship with
 * a baked background (it is authored against the light page colour); that is
 * detected at load and the art is cropped into the silhouette, so the
 * background is never drawn and the hero stays correct in either theme.
 * Canvas is premultiplied-alpha and composites over the page background.
 *
 * Tunables live in content/hero.json — live-editable from /studio. They are
 * read through a ref inside the frame loop, so a slider drag never rebuilds
 * the GL scene (re-uploading the portraits would cost ~15 MB per tick).
 */

const GW = 128; // trail field grid — fixed, in portrait-normalized space
const GH = 160;

const isTouchDevice = () =>
  typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

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

uniform vec2 uRes;       // canvas box, css px
uniform vec4 uPortrait;  // x, y, w, h — box-local css px, y-down
uniform vec4 uTexRect;   // sub-rect of the textures holding the portrait

uniform sampler2D uTexA; // currency-engraving art (default view)
uniform sampler2D uTexB; // real face (revealed)
uniform sampler2D uMask; // trail field, LUMINANCE

/* packed to stay far under MAX_FRAGMENT_UNIFORM_VECTORS (spec min is 16) */
uniform vec4 uM1; // threshold, edgeSoft, tearScale, tearAmp
uniform vec4 uM2; // tearPhase, crumbScale, crumbAmp, time
uniform vec4 uB1; // bandPx, bandSeed, bandDensity, smearPx
uniform vec4 uB2; // edgeBand, maskSmearMix, rgbSplitPx, edgeGlow
uniform vec4 uX;  // velocity, ready, artOpaque, -

#define TH        uM1.x
#define EDGESOFT  uM1.y
#define TEARSCALE uM1.z
#define TEARAMP   uM1.w
#define TEARPHASE uM2.x
#define CRUMBSC   uM2.y
#define CRUMBAMP  uM2.z
#define BANDPX    uB1.x
#define BANDSEED  uB1.y
#define BANDDENS  uB1.z
#define SMEARPX   uB1.w
#define EDGEBAND  uB2.x
#define MASKSMEAR uB2.y
#define RGBSPLIT  uB2.z
#define EDGEGLOW  uB2.w
#define VEL       uX.x
#define READY     uX.y
#define ARTOPAQUE uX.z

/* mediump-safe hash: every intermediate is re-fract'd back into [0,1) */
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i),                  hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.0 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return s * 1.142857;
}

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;   // y-down css px

  /* early-out well outside the portrait (expanded by the smear reach) */
  float pad = SMEARPX + 2.0;
  if (px.x < uPortrait.x - pad || px.x > uPortrait.x + uPortrait.z + pad ||
      px.y < uPortrait.y       || px.y > uPortrait.y + uPortrait.w) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 pUv = (px - uPortrait.xy) / uPortrait.zw;   // portrait-local 0..1

  /* ---- torn mask ---------------------------------------------------- */
  // aspect-correct the noise domain so tears aren't stretched
  vec2 nUv = pUv * vec2(uPortrait.z / uPortrait.w, 1.0);

  vec2 warp = vec2(
    fbm(nUv * TEARSCALE + vec2(0.0, TEARPHASE)),
    fbm(nUv * TEARSCALE + vec2(11.3, -TEARPHASE) + 4.7)
  ) - 0.5;

  vec2 fUv = pUv + warp * TEARAMP;
  float field0 = texture2D(uMask, clamp(fUv, 0.0, 1.0)).r;

  /* ---- datamosh: row-quantized bands near the mask boundary ---------- */
  float band = floor(px.y / max(BANDPX, 1.0));
  float bh  = hash21(vec2(band, BANDSEED));
  float bh2 = hash21(vec2(band, BANDSEED + 0.371));

  float edgeProx = 1.0 - smoothstep(0.0, EDGEBAND, abs(field0 - TH));
  float gate = step(1.0 - BANDDENS * (0.35 + 0.65 * VEL), bh);
  float offPx = gate * edgeProx * (bh2 * 2.0 - 1.0)
              * SMEARPX * (0.25 + 0.75 * VEL);
  float off = offPx / uPortrait.z;

  // the mask boundary itself smears — this is what makes the rectangular tabs
  float field = field0;
  if (MASKSMEAR > 0.001) {
    field = texture2D(uMask, clamp(fUv + vec2(off * MASKSMEAR, 0.0), 0.0, 1.0)).r;
  }

  float crumb = (vnoise(nUv * CRUMBSC) - 0.5) * CRUMBAMP;
  float mask = smoothstep(TH - EDGESOFT + crumb, TH + EDGESOFT + crumb, field);
  mask *= READY;

  /* ---- sample both portraits (do NOT branch — the boundary is the
          highest-frequency thing on screen) ------------------------------ */
  vec2 tA = uTexRect.xy + (pUv + vec2(off * 0.45, 0.0)) * uTexRect.zw;
  vec2 tB = uTexRect.xy + (pUv + vec2(off, 0.0)) * uTexRect.zw;

  vec4 A = texture2D(uTexA, tA);
  vec4 B = texture2D(uTexB, tB);

  if (RGBSPLIT > 0.001) {
    float cs = RGBSPLIT * (0.3 + 0.7 * VEL) * edgeProx / uPortrait.z * uTexRect.z;
    B.r = texture2D(uTexB, tB + vec2( cs, 0.0)).r;
    B.b = texture2D(uTexB, tB + vec2(-cs, 0.0)).b;
    B.rgb = min(B.rgb, vec3(B.a));   // keep the premultiplied invariant
  }

  /* The real portrait (B) carries the shared silhouette. When the art ships
     with a baked background (ARTOPAQUE = 1) it is cropped into that
     silhouette, so its background is never drawn — which also keeps the hero
     correct in either theme. When the art has its own matching matte the
     expression collapses to A, with no double-premultiply. */
  float silh = B.a;
  vec4 Ac = mix(A, vec4(A.rgb * silh, silh), ARTOPAQUE);

  vec4 s = mix(Ac, B, mask);

  // bright fringe along the tear
  float fringe = (1.0 - smoothstep(0.0, 0.35, abs(mask - 0.5))) * EDGEGLOW * s.a;
  s.rgb += fringe;
  s.rgb = min(s.rgb, vec3(s.a));

  gl_FragColor = s;
}`;

export function PortraitHero({
  overrides,
  compact = false,
}: {
  overrides?: Partial<HeroSettings>;
  compact?: boolean;
}) {
  const cfg = useMemo<HeroSettings>(
    () => ({ ...heroConfig, ...overrides }),
    [overrides],
  );

  const [noWebgl, setNoWebgl] = useState(false);
  const [glEpoch, setGlEpoch] = useState(0);
  const [painted, setPainted] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);

  const cfgRef = useRef(cfg);
  const wakeRef = useRef<(() => void) | null>(null);

  // config changes never rebuild the GL scene — just repaint
  useEffect(() => {
    cfgRef.current = cfg;
    wakeRef.current?.();
  }, [cfg]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const imgA = imgARef.current;
    const imgB = imgBRef.current;
    if (!section || !canvas || !imgA || !imgB) return;

    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      }) ?? canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      setNoWebgl(true);
      return;
    }

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

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes");
    const uPortrait = U("uPortrait");
    const uTexRect = U("uTexRect");
    const uM1 = U("uM1");
    const uM2 = U("uM2");
    const uB1 = U("uB1");
    const uB2 = U("uB2");
    const uX = U("uX");

    gl.uniform1i(U("uTexA"), 0);
    gl.uniform1i(U("uTexB"), 1);
    gl.uniform1i(U("uMask"), 2);
    gl.uniform4f(uTexRect, 0, 0, 1, 1);

    /* ---------- textures ---------- */
    const mkPortraitTex = (unit: number) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0]),
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };
    const texA = mkPortraitTex(0);
    const texB = mkPortraitTex(1);

    const maskTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const field = new Float32Array(GW * GH);
    const bytes = new Uint8Array(GW * GH);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      GW,
      GH,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      bytes,
    );

    let disposed = false;
    let imgW = 1200;
    let imgH = 1600;
    let loadedA = false;
    let loadedB = false;
    let artOpaque = 0;

    /* Does the art ship with a baked background? Read one corner pixel.
       Falls back to 0 (treat as already-matted) if the canvas is tainted. */
    const detectOpaque = (img: HTMLImageElement) => {
      try {
        const probe = document.createElement("canvas");
        probe.width = 1;
        probe.height = 1;
        const p2d = probe.getContext("2d");
        if (!p2d) return 0;
        p2d.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        return p2d.getImageData(0, 0, 1, 1).data[3] > 250 ? 1 : 0;
      } catch {
        return 0;
      }
    };

    const upload = (img: HTMLImageElement, tex: WebGLTexture, unit: number) => {
      if (disposed || !img.naturalWidth) return;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    };

    const onA = () => {
      if (disposed || !imgA.naturalWidth) return;
      imgW = imgA.naturalWidth;
      imgH = imgA.naturalHeight;
      artOpaque = detectOpaque(imgA);
      upload(imgA, texA!, 0);
      loadedA = true;
      resize();
      wake();
    };
    const onB = () => {
      if (disposed || !imgB.naturalWidth) return;
      upload(imgB, texB!, 1);
      loadedB = true;
      wake();
    };

    /* ---------- state ---------- */
    let boxW = 0;
    let boxH = 0;
    let rect = { x: 0, y: 0, w: 1, h: 1 };
    const dprCap = isTouchDevice() ? 1.5 : 2;

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    const start = last;

    // pointer
    let realX = 0;
    let realY = 0;
    let prevRealX = 0;
    let prevRealY = 0;
    let realActive = false;
    let lastRealAt = -1e9;
    let hasReal = false;
    // virtual (auto-scan)
    let virtX = 0.5;
    let virtY = 0.42;
    let prevVirtX = 0.5;
    let prevVirtY = 0.42;
    let handover = 0;
    let wasReal = false;

    let velocity = 0;
    let bandSeed = 0.137;
    let lastTick = 0;
    let maxV = 0;

    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reduced = mq?.matches ?? false;

    const isTouch = isTouchDevice();

    const computeRect = () => {
      const c = cfgRef.current;
      const narrow = boxW < 760;
      // narrow: portrait fills the width in the lower band; text sits above
      const slotX = narrow ? 0 : boxW * (1 - c.slotWidthFrac);
      const slotW = narrow ? boxW : boxW * c.slotWidthFrac;
      const slotY = narrow ? boxH * 0.34 : 0;
      const slotH = narrow ? boxH * 0.66 : boxH;
      const s =
        Math.min(slotW / imgW, slotH / imgH) * Math.max(c.portraitScale, 0.1);
      const w = imgW * s;
      const h = imgH * s;
      const ax = narrow ? 0.5 : c.anchorX;
      rect = {
        x: slotX + (slotW - w) * ax,
        y: slotY + (slotH - h) * c.anchorY,
        w,
        h,
      };
    };

    const resize = () => {
      const w = section.clientWidth;
      const h = section.clientHeight;
      if (w === 0 || h === 0) return;
      boxW = w;
      boxH = h;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      gl.viewport(0, 0, bw, bh);
      gl.uniform2f(uRes, w, h);
      computeRect();
      gl.uniform4f(uPortrait, rect.x, rect.y, rect.w, rect.h);
      // keep the placeholder <img> exactly where the shader will draw it
      imgA.style.left = `${rect.x}px`;
      imgA.style.top = `${rect.y}px`;
      imgA.style.width = `${rect.w}px`;
      imgA.style.height = `${rect.h}px`;
    };

    /* ---------- trail stamping ---------- */
    const stampCapsule = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      weight: number,
    ) => {
      if (weight <= 0.001) return;
      const c = cfgRef.current;
      const rx = c.brushRadius / Math.max(rect.w, 1);
      const ry = c.brushRadius / Math.max(rect.h, 1);
      const minX = Math.max(0, Math.floor((Math.min(x0, x1) - rx) * GW));
      const maxX = Math.min(GW - 1, Math.ceil((Math.max(x0, x1) + rx) * GW));
      const minY = Math.max(0, Math.floor((Math.min(y0, y1) - ry) * GH));
      const maxY = Math.min(GH - 1, Math.ceil((Math.max(y0, y1) + ry) * GH));
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len2 = dx * dx + dy * dy;
      for (let gy = minY; gy <= maxY; gy++) {
        const cy = (gy + 0.5) / GH;
        for (let gx = minX; gx <= maxX; gx++) {
          const cx = (gx + 0.5) / GW;
          const t =
            len2 > 0
              ? Math.min(
                  1,
                  Math.max(0, ((cx - x0) * dx + (cy - y0) * dy) / len2),
                )
              : 0;
          const qx = (cx - (x0 + t * dx)) / rx;
          const qy = (cy - (y0 + t * dy)) / ry;
          const d = Math.sqrt(qx * qx + qy * qy);
          if (d >= 1) continue;
          const u = 1 - d;
          const e = u * u * (3 - 2 * u) * weight;
          const i = gy * GW + gx;
          if (e > field[i]) field[i] = e;
        }
      }
    };

    const ambientActive = () => {
      const c = cfgRef.current;
      return (
        c.autoScan && visible && !reduced && (isTouch || c.autoScanDesktop)
      );
    };

    /* ---------- frame ---------- */
    const frame = () => {
      if (disposed || gl.isContextLost()) {
        running = false;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const c = cfgRef.current;
      const elapsed = (now - start) / 1000;

      /* pointer / auto-scan handover */
      const wantsReal = realActive || now - lastRealAt < c.idleMs;
      handover += ((wantsReal ? 1 : 0) - handover) * (1 - Math.exp(-6 * dt));
      if (wasReal && !wantsReal && hasReal) {
        // seed the virtual pointer where the cursor left, so it never jumps
        virtX = realX;
        virtY = realY;
        prevVirtX = realX;
        prevVirtY = realY;
      }
      wasReal = wantsReal;

      const amb = ambientActive();
      if (amb) {
        const t = elapsed * c.scanSpeed;
        const tx =
          c.scanCenterX +
          c.scanRadiusX * (Math.sin(t * 0.37) + 0.18 * Math.sin(t * 1.31));
        const ty = c.scanCenterY + c.scanRadiusY * Math.sin(t * 0.53 + 1.7);
        const kv = 1 - Math.exp(-2.5 * dt);
        prevVirtX = virtX;
        prevVirtY = virtY;
        virtX += (tx - virtX) * kv;
        virtY += (ty - virtY) * kv;
      }

      /* velocity (portrait-uv per second, smoothed) */
      const movedX = hasReal ? realX - prevRealX : virtX - prevVirtX;
      const movedY = hasReal ? realY - prevRealY : virtY - prevVirtY;
      const speed = Math.sqrt(movedX * movedX + movedY * movedY) / Math.max(dt, 1e-3);
      velocity += (Math.min(speed / 1.6, 1) - velocity) * (1 - Math.exp(-8 * dt));

      /* stamp */
      if (handover > 0.001 && hasReal) {
        stampCapsule(prevRealX, prevRealY, realX, realY, handover);
      }
      if (handover < 0.999 && amb) {
        stampCapsule(prevVirtX, prevVirtY, virtX, virtY, 1 - handover);
      }
      prevRealX = realX;
      prevRealY = realY;

      /* decay (frame-rate independent) + upload */
      const k = 12.0 - ((c.trailPersistence - 0.5) / 0.48) * 10.5;
      const mul = Math.exp(-Math.max(k, 0.5) * dt);
      maxV = 0;
      for (let i = 0; i < field.length; i++) {
        const v = field[i] * mul;
        field[i] = v < 0.004 ? 0 : v;
        if (field[i] > maxV) maxV = field[i];
        bytes[i] = (field[i] * 255) | 0;
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        GW,
        GH,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        bytes,
      );

      /* band seed — computed here so mediump never sees a large float */
      const rate = reduced ? 0 : c.bandRate;
      if (rate > 0) {
        const tick = Math.floor(elapsed * rate);
        if (tick !== lastTick) {
          lastTick = tick;
          bandSeed = (bandSeed + 0.6180339887) % 1;
        }
      }

      const ready = loadedA && loadedB ? 1 : 0;
      gl.uniform4f(
        uM1,
        c.threshold,
        Math.max(reduced ? 0.06 : c.edgeSoft, 0.001),
        c.tearScale,
        c.tearAmp,
      );
      gl.uniform4f(
        uM2,
        reduced ? 0 : elapsed * c.tearDrift,
        c.crumbScale,
        c.crumbAmp,
        elapsed,
      );
      gl.uniform4f(uB1, c.bandPx, bandSeed, c.bandDensity, c.smearPx);
      gl.uniform4f(uB2, c.edgeBand, c.maskSmearMix, c.rgbSplitPx, c.edgeGlow);
      gl.uniform4f(uX, velocity, ready, artOpaque, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (ready && !disposed) setPainted(true);

      if (!amb && !realActive && maxV === 0 && handover < 0.002) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!running && !disposed && visible) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;

    /* ---------- pointer ---------- */
    const toUv = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      const lx = e.clientX - r.left;
      const ly = e.clientY - r.top;
      const nx = (lx - rect.x) / Math.max(rect.w, 1);
      const ny = (ly - rect.y) / Math.max(rect.h, 1);
      if (!hasReal) {
        prevRealX = nx;
        prevRealY = ny;
        hasReal = true;
      }
      realX = nx;
      realY = ny;
      lastRealAt = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      toUv(e);
      realActive = true;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      toUv(e);
      realActive = true;
      wake();
    };
    const onUp = () => {
      realActive = false;
      lastRealAt = performance.now();
      wake();
    };
    const onLeave = () => {
      realActive = false;
      wake();
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerdown", onDown);
    section.addEventListener("pointerup", onUp);
    section.addEventListener("pointercancel", onUp);
    section.addEventListener("pointerleave", onLeave);

    /* ---------- observers ---------- */
    const onResize = () => {
      resize();
      if (running) return;
      wake();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(section);
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (!visible) {
          cancelAnimationFrame(raf);
          running = false;
        } else {
          wake();
        }
      },
      { threshold: 0 },
    );
    io.observe(section);

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        wake();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const onReduced = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      wake();
    };
    mq?.addEventListener?.("change", onReduced);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      running = false;
    };
    const onRestored = () => setGlEpoch((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    /* ---------- boot ---------- */
    imgA.addEventListener("load", onA);
    imgB.addEventListener("load", onB);
    if (imgA.complete) onA();
    if (imgB.complete) onB();

    resize();
    gl.uniform4f(uX, 0, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    wake();

    return () => {
      disposed = true;
      wakeRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mq?.removeEventListener?.("change", onReduced);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      imgA.removeEventListener("load", onA);
      imgB.removeEventListener("load", onB);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointerup", onUp);
      section.removeEventListener("pointercancel", onUp);
      section.removeEventListener("pointerleave", onLeave);
      // free resources but keep the context usable — the effect can re-run
      // on the same canvas, and getContext would hand back a killed context.
      gl.deleteProgram(prog);
      gl.deleteBuffer(quad);
      gl.deleteTexture(texA);
      gl.deleteTexture(texB);
      gl.deleteTexture(maskTex);
    };
  }, [noWebgl, glEpoch]);

  if (noWebgl) {
    return <PortraitHero2D overrides={overrides} compact={compact} />;
  }

  return (
    <section
      ref={sectionRef}
      className={`relative w-full select-none overflow-hidden ${
        compact ? "h-full min-h-[320px]" : "min-h-[560px] h-[calc(100svh-4rem)]"
      }`}
      style={{ touchAction: "pan-y" }}
    >
      {/* Editorial column — real DOM, so this is the LCP element */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-6xl flex-col justify-center px-6 ${
          compact ? "" : "md:justify-center"
        }`}
      >
        <div className="max-w-lg">
          <h1
            className={`font-display leading-[0.95] tracking-tight ${
              compact ? "text-2xl" : "text-5xl sm:text-6xl md:text-7xl"
            }`}
          >
            {cfg.headline}
          </h1>
          {!compact && cfg.sub && (
            <p className="mt-5 max-w-sm text-base leading-relaxed text-muted">
              {cfg.sub}
            </p>
          )}
        </div>
      </div>

      {/* Bust, shown until the GL scene has painted (no empty-hero flash) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgARef}
        src="/hero-art.png"
        alt=""
        aria-hidden
        decoding="async"
        className={`pointer-events-none absolute select-none transition-opacity duration-300 ${
          painted ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgBRef}
        src="/hero-face.png"
        alt=""
        aria-hidden
        decoding="async"
        className="pointer-events-none absolute size-px opacity-0"
      />

      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
    </section>
  );
}
