"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  heroConfig,
  heroFonts,
  INK,
  PAPER,
  type HeroSettings,
} from "./hero-config";
import { PortraitHero2D } from "./portrait-hero-2d";
import { Monogram } from "./monogram";

export { heroConfig, type HeroSettings } from "./hero-config";

const silk = heroFonts.silk;
const peristiwa = heroFonts.peristiwa;

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
 * Per the banknote design, the art displays UNCROPPED — its baked paper
 * background matches the hero's fixed paper colour — while the reveal is
 * confined to the real portrait's alpha so the tear never punches holes in
 * the paper. Layout, palette and type all come from the Figma reference
 * (1512x982): portrait centered at 48.1% width with a 6.4% bottom bleed,
 * Silk Sans caps + Peristiwa script in ink #101BBC, signature monogram nav.
 *
 * Tunables live in content/hero.json — live-editable from /studio. They are
 * read through a ref inside the frame loop, so a slider drag never rebuilds
 * the GL scene (re-uploading the portraits would cost ~15 MB per tick).
 */

/* Trail field grid. Since the guilloché iteration the field covers the WHOLE
   hero (expressed in portrait-uv via uField), not just the portrait rect, so
   the hover effect reaches the pattern around the portrait too. */
const GW = 224;
const GH = 128;

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
uniform vec4 uX;  // velocity, ready, -, -
uniform vec4 uField; // trail-field rect in portrait-uv: origin.xy, span.zw
uniform vec4 uPat1;  // spacingPx, restAlpha, hoverAlpha, phase
uniform vec4 uPat2;  // fadeIn, fadeOut, wobble, rectness
uniform vec4 uPatC;  // fade centre px.xy, half-extents px.zw
uniform vec3 uInk;   // pattern ink (premultiplied against its alpha)
uniform vec3 uGold;  // hover ink base — the strokes gild where the trail touches

/* Currency gilding: a dark bronze-to-gold gradient across the sheet, with a
   slow band of light traveling the diagonal — foil catching the light. The
   sheen rides the pattern phase (uPat1.w, wraps at 40pi; x1.6 keeps the wrap
   seamless since 64pi is a whole number of turns) so it never degrades on
   mediump and stills under reduced motion. */
vec3 gilded(vec2 px) {
  float t = (px.x + px.y) / (uRes.x + uRes.y);
  vec3 col = mix(uGold * 0.58, uGold * 1.08, t);
  float band = sin((px.x - px.y) * 0.0045 + uPat1.w * 1.6);
  float sheen = smoothstep(0.80, 0.985, band);
  col += vec3(0.50, 0.38, 0.14) * sheen;
  return col;
}

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

/* Guilloché lace — a lightweight spirograph generator, solved implicitly.
 *
 * A strand family is rho(theta) = r0 + A*sin(k*theta + phi_i), with N
 * strands whose phases phi_i are spread evenly over 2pi. Instead of drawing
 * N curves, invert the family at this fragment: u = (r - r0)/A, and if
 * |u| <= 1 the strands passing here have phi = asin(u) - k*theta (plus the
 * pi-asin branch). Distance to the nearest of the N phases draws ALL
 * strands at once; the two branches cross each other, which is what makes
 * the woven lens/petal look of banknote lathe-work. Strands widen where
 * the family runs tangent (sqrt(1-u^2) -> 0), pooling ink at the petal
 * cusps exactly like a real geometric lathe.
 */
float guillocheR(vec2 px) {
  vec2 aq = abs((px - uPatC.xy) / uPatC.zw);
  // p-norm (p=3): rectangular presence, continuously curved corners
  return pow(aq.x * aq.x * aq.x + aq.y * aq.y * aq.y, 0.33333);
}

float strandSet(float u, float phaseCoord, float N, float wBase) {
  float au = abs(u);
  if (au >= 0.995) return 0.0;
  float a = asin(clamp(u, -0.995, 0.995));
  float w = wBase / (sqrt(1.0 - u * u) + 0.22);
  float p1 = (a + phaseCoord) * N * 0.15915494; // /2pi
  float s = 1.0 - smoothstep(w * 0.55, w, abs(fract(p1) - 0.5));
  float p2 = (3.14159265 - a + phaseCoord) * N * 0.15915494;
  s = max(s, 1.0 - smoothstep(w * 0.55, w, abs(fract(p2) - 0.5)));
  // soften towards the band's envelope so bands blend, not clip
  return s * (1.0 - smoothstep(0.85, 0.995, au));
}

float guillocheLine(vec2 px) {
  vec2 q = (px - uPatC.xy) / uPatC.zw;
  float ph = uPat1.w;
  float W = uPat2.z; // loop depth
  float dens = 26.0 * 13.0 / max(uPat1.x, 4.0); // strand count from slider

  float s = 0.0;

  /* border weave on the rounded-rect metric — two counter-phased
     families; waves mirrored about the vertical centre line */
  float rr = guillocheR(px);
  float angM = atan(q.y, abs(q.x));
  float u1 = (rr - 0.92) / (0.14 + 0.10 * W);
  s = max(s, strandSet(u1, angM * 5.0 + ph * 0.9, dens, 0.085));
  float u1b = (rr - 0.90) / (0.18 + 0.12 * W);
  s = max(s, 0.9 * strandSet(u1b, -angM * 7.0 - ph * 0.6, dens * 0.75, 0.08));

  /* inner rosette — a true rotating spirograph around the portrait */
  float rc = length(q);
  float th = atan(q.y, q.x);
  float u2 = (rc - 0.56) / (0.17 + 0.13 * W);
  s = max(s, strandSet(u2, th * 6.0 + ph * 0.5, dens * 1.15, 0.09));
  float u3 = (rc - 0.52) / (0.22 + 0.15 * W);
  s = max(s, 0.85 * strandSet(u3, -th * 4.0 + ph * 0.35, dens * 0.9, 0.085));

  return min(s, 1.0);
}

/* Resting visibility: floored at 0.2 near the portrait (the clear zone
   whispers instead of emptying), full at the edges. The torn hover mask
   overrides this so strokes ink the pattern even mid-zone. Everything is
   dissolved over the hero's last stretch so the lace melts into the paper
   at the section boundary instead of clipping. */
float guillocheVis(vec2 px, float hoverMask) {
  float fade = mix(0.2, 1.0, smoothstep(uPat2.x, uPat2.y, guillocheR(px)));
  float bottomFade = 1.0 - smoothstep(uRes.y * 0.80, uRes.y * 0.985, px.y);
  return max(fade, hoverMask * 0.9) * bottomFade;
}

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;   // y-down css px

  vec2 pUv = (px - uPortrait.xy) / uPortrait.zw;   // portrait-local (can exceed 0..1)

  /* ---- outside the portrait: guilloché with the same torn hover mask ---- */
  float pad = SMEARPX + 2.0;
  if (px.x < uPortrait.x - pad || px.x > uPortrait.x + uPortrait.z + pad ||
      px.y < uPortrait.y       || px.y > uPortrait.y + uPortrait.w) {
    // noise in the portrait's physical scale so tears match the reveal's
    vec2 nUvH = px / uPortrait.w;
    vec2 warpH = vec2(
      fbm(nUvH * TEARSCALE + vec2(0.0, TEARPHASE)),
      fbm(nUvH * TEARSCALE + vec2(11.3, -TEARPHASE) + 4.7)
    ) - 0.5;
    vec2 gUvH = (pUv + warpH * TEARAMP - uField.xy) / uField.zw;
    float fieldH = texture2D(uMask, clamp(gUvH, 0.0, 1.0)).r;
    float crumbH = (vnoise(nUvH * CRUMBSC) - 0.5) * CRUMBAMP;
    float mh = smoothstep(TH - EDGESOFT + crumbH, TH + EDGESOFT + crumbH, fieldH);
    float alpha =
      guillocheLine(px) * guillocheVis(px, mh) * mix(uPat1.y, uPat1.z, mh);
    vec3 pcol = mix(uInk, gilded(px), mh);
    gl_FragColor = vec4(pcol * alpha, alpha);
    return;
  }

  /* ---- torn mask ---------------------------------------------------- */
  // aspect-correct the noise domain so tears aren't stretched
  vec2 nUv = pUv * vec2(uPortrait.z / uPortrait.w, 1.0);

  vec2 warp = vec2(
    fbm(nUv * TEARSCALE + vec2(0.0, TEARPHASE)),
    fbm(nUv * TEARSCALE + vec2(11.3, -TEARPHASE) + 4.7)
  ) - 0.5;

  vec2 fUv = (pUv + warp * TEARAMP - uField.xy) / uField.zw;
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
  // (offset is portrait-uv, so divide by the field's x-span for grid space)
  float field = field0;
  if (MASKSMEAR > 0.001) {
    field = texture2D(
      uMask,
      clamp(fUv + vec2(off * MASKSMEAR / uField.z, 0.0), 0.0, 1.0)
    ).r;
  }

  float crumb = (vnoise(nUv * CRUMBSC) - 0.5) * CRUMBAMP;
  float mask = smoothstep(TH - EDGESOFT + crumb, TH + EDGESOFT + crumb, field);
  mask *= READY;

  /* The art displays UNCROPPED — its paper background matches the page
     (by design; both are ~#F9F7F1). The reveal, though, is confined to the
     real portrait's silhouette so the tear never punches holes in the
     paper outside the face. */

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

  float faceCover = smoothstep(0.02, 0.35, B.a);
  mask *= faceCover;

  vec4 s = mix(A, B, mask);

  // bright fringe along the tear
  float fringe = (1.0 - smoothstep(0.0, 0.35, abs(mask - 0.5))) * EDGEGLOW * s.a;
  s.rgb += fringe;

  /* Continue the guilloché across the art's paper margins so the pattern
     never shows a rectangular seam at the art's bounds. It stays off the
     engraved head and the revealed face (faceCover), and inks up under the
     same torn hover mask as everywhere else. */
  float mSurf = smoothstep(TH - EDGESOFT + crumb, TH + EDGESOFT + crumb, field);
  float line = guillocheLine(px);
  float vis = guillocheVis(px, mSurf);
  float ink = mix(uPat1.y, uPat1.z, mSurf);

  // pattern over the art's paper margins (kept off the face and the reveal)
  vec3 pcol = mix(uInk, gilded(px), mSurf);
  float pOver = line * vis * ink * (1.0 - faceCover);
  s.rgb = mix(s.rgb, pcol * s.a, pOver);

  /* The design's right-edge paper fade, now in-shader and applied to the
     portrait only — no DOM overlay, so the pattern and its hover ink are
     never washed out by a paper-coloured patch. */
  float edgeFade = 1.0 - smoothstep(0.851, 1.0, pUv.x);
  s *= edgeFade;

  // where the portrait faded out, the pattern shows through from behind
  float pUnder = line * vis * ink;
  s.rgb += pcol * pUnder * (1.0 - s.a);
  s.a += pUnder * (1.0 - s.a);

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
    const uField = U("uField");
    const uPat1 = U("uPat1");
    const uPat2 = U("uPat2");
    const uPatC = U("uPatC");
    gl.uniform3f(U("uInk"), 16 / 255, 27 / 255, 188 / 255); // #101BBC
    gl.uniform3f(U("uGold"), 143 / 255, 91 / 255, 8 / 255); // #8F5B08 — darker gilding base

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
    let imgW = 1124;
    let imgH = 1340;
    let loadedA = false;
    let loadedB = false;

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
    // trail-field rect (portrait-uv): origin + span, kept in sync by resize()
    let fOx = 0;
    let fOy = 0;
    let fSx = 1;
    let fSy = 1;
    let patPhase = 0;
    let idleThrottle = false;
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
      // Design spec (1512x982): portrait width = 48.1% of the hero, exactly
      // centered, bottom-anchored with 6.4% of its height bleeding below
      // the fold. Narrow screens widen the portrait and keep the bleed.
      // narrow screens size by height so the portrait fills the lower band
      const wideW = boxW * c.slotWidthFrac * Math.max(c.portraitScale, 0.1);
      const narrowW = Math.min(boxW * 0.94, boxH * 0.68 * (imgW / imgH));
      const w = narrow ? narrowW : wideW;
      const h = w * (imgH / imgW);
      const bleed = h * Math.max(0, Math.min(c.bleedFrac, 0.3));
      rect = {
        x: (boxW - w) * (narrow ? 0.5 : c.anchorX),
        y: boxH - h + bleed,
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
      // trail field covers the whole hero, expressed in portrait-uv
      fOx = -rect.x / rect.w;
      fOy = -rect.y / rect.h;
      fSx = w / rect.w;
      fSy = h / rect.h;
      gl.uniform4f(uField, fOx, fOy, fSx, fSy);
      // guilloché fade centre sits on the face, half-extents span the hero
      gl.uniform4f(
        uPatC,
        rect.x + rect.w / 2,
        rect.y + rect.h * 0.42,
        w / 2,
        h / 2,
      );
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
      widen = 1,
    ) => {
      if (weight <= 0.001) return;
      const c = cfgRef.current;
      const rx = (c.brushRadius * widen) / Math.max(rect.w, 1);
      const ry = (c.brushRadius * widen) / Math.max(rect.h, 1);
      // portrait-uv ↔ extended-field-grid transforms
      const toGx = (u: number) => ((u - fOx) / fSx) * GW;
      const toGy = (v: number) => ((v - fOy) / fSy) * GH;
      const minX = Math.max(0, Math.floor(toGx(Math.min(x0, x1) - rx)));
      const maxX = Math.min(GW - 1, Math.ceil(toGx(Math.max(x0, x1) + rx)));
      const minY = Math.max(0, Math.floor(toGy(Math.min(y0, y1) - ry)));
      const maxY = Math.min(GH - 1, Math.ceil(toGy(Math.max(y0, y1) + ry)));
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len2 = dx * dx + dy * dy;
      for (let gy = minY; gy <= maxY; gy++) {
        const cy = fOy + ((gy + 0.5) / GH) * fSy;
        for (let gx = minX; gx <= maxX; gx++) {
          const cx = fOx + ((gx + 0.5) / GW) * fSx;
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
      // idle = only the pattern drifting: half the cadence
      if (idleThrottle && now - last < 30) {
        raf = requestAnimationFrame(frame);
        return;
      }
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

      /* stamp — ONLY while the pointer is actually moving. A still cursor
         stops feeding the field, so the reveal decays back to the engraving
         (the effect exists in motion, per the design direction). Faster
         strokes stamp wider, which keeps the shape fluid rather than round. */
      const realDist = Math.hypot(realX - prevRealX, realY - prevRealY);
      const widen = 1 + velocity * 0.55;
      if (handover > 0.001 && hasReal && realDist > 0.0012) {
        stampCapsule(prevRealX, prevRealY, realX, realY, handover, widen);
      }
      if (handover < 0.999 && amb) {
        stampCapsule(prevVirtX, prevVirtY, virtX, virtY, 1 - handover, widen);
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
      gl.uniform4f(uX, velocity, ready, 0, 0);

      // guilloché: ordered lathe drift, still under reduced motion
      const patSpeed = reduced ? 0 : c.patternSpeed;
      // all shader drift rates are k*0.05, so 40pi wraps every term by exactly 2pi*k
      patPhase = (patPhase + patSpeed * dt) % (40 * Math.PI);
      gl.uniform4f(uPat1, c.patternSpacing, c.patternOpacity, c.patternHover, patPhase);
      gl.uniform4f(uPat2, c.patternFadeIn, c.patternFadeOut, c.patternWobble, 0.3);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (ready && !disposed) setPainted(true);

      // With movement-gated stamping a resting cursor drains the field to
      // zero. If the pattern is still (speed 0 / reduced motion) we can
      // sleep entirely; otherwise keep animating, but drop the idle state
      // to ~30fps — visibility/intersection gates stop us off-screen.
      const idle = !amb && maxV === 0 && realDist <= 0.0012;
      if (idle && patSpeed <= 0.0001) {
        running = false;
        return;
      }
      idleThrottle = idle;
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

  /* Design-canvas fractions (1512x982 Figma frame) */
  const navLinks = [
    { label: "Work", href: "/work", left: "6.61%" },
    { label: "About", href: "/about", left: "21.9%" },
    { label: "Writing", href: "/writing", left: "64.9%" },
    { label: "Contact", href: "/contact", left: "80.4%" },
  ];

  return (
    <section
      ref={sectionRef}
      className={`relative w-full select-none overflow-hidden ${silk.variable} ${peristiwa.variable} ${
        compact ? "h-full min-h-[320px]" : "min-h-[560px] h-svh"
      }`}
      style={{ touchAction: "pan-y", background: PAPER, color: INK }}
    >
      {/* ---- banknote nav: links flanking the signature monogram ---- */}
      {!compact && (
        <header className="absolute inset-x-0 top-0 z-20">
          <Link
            href="/"
            aria-label="Austin Moras — home"
            className="absolute left-1/2 top-[3.6svh] block h-[6.2svh] min-h-10 -translate-x-1/2"
          >
            <Monogram className="h-full w-auto" />
          </Link>
          <nav className="hidden md:block">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="absolute top-[5.9svh] text-[clamp(11px,1.06vw,16px)] font-medium uppercase tracking-[0.02em] transition-opacity hover:opacity-60"
                style={{ left: l.left, fontFamily: "var(--font-silk)" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {/* narrow: two links each side of the monogram */}
          <nav className="flex items-center justify-between px-5 pt-[4.2svh] md:hidden">
            <div className="flex gap-4">
              {navLinks.slice(0, 2).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[11px] font-medium uppercase"
                  style={{ fontFamily: "var(--font-silk)" }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="flex gap-4">
              {navLinks.slice(2).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[11px] font-medium uppercase"
                  style={{ fontFamily: "var(--font-silk)" }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
      )}

      {/* ---- portrait layers ---- */}
      {/* Art, shown until the GL scene has painted (no empty-hero flash) */}
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

      {/* ---- editorial text (real DOM = the LCP element) ---- */}
      {compact ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 px-5">
          <h1
            className="text-xl font-bold tracking-[-0.04em]"
            style={{ fontFamily: "var(--font-silk)" }}
          >
            {cfg.headline}
          </h1>
        </div>
      ) : (
        <>
          {/* left block — name + role (design: x 6.61%, baselines 466/532) */}
          <div className="pointer-events-none absolute left-[6.61%] top-[44.4svh] z-10 max-md:left-5 max-md:top-[12svh]">
            <h1
              className="text-[clamp(26px,2.65vw,40px)] font-bold leading-none tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {cfg.headline}
            </h1>
            <p
              className="mt-[3.4svh] text-[clamp(24px,2.65vw,40px)] leading-none"
              style={{ fontFamily: "var(--font-peristiwa)" }}
            >
              {cfg.role}
            </p>
          </div>

          {/* right block — script tagline (design: x 70.7%, baseline 474) */}
          <p
            className="pointer-events-none absolute left-[70.74%] top-[45.2svh] z-10 w-[24.5vw] max-md:w-auto text-[clamp(24px,2.65vw,40px)] leading-[1.175] max-md:hidden"
            style={{ fontFamily: "var(--font-peristiwa)" }}
          >
            {cfg.sub}
          </p>
        </>
      )}
    </section>
  );
}
