"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import heroDefaults from "../../../content/hero.json";

/*
 * Pixel-reveal hero.
 *
 * A grid of background-coloured cells is painted on a canvas above an
 * underlay image. Hovering injects "reveal energy" into cells within a
 * radius of the cursor (with a per-cell dither threshold, so the radial
 * edge breaks into blocks like the reference); energy decays every frame,
 * which produces the trailing flow. Press-and-hold grows the radius with
 * an ease-out curve; releasing lets the decay close the reveal again.
 *
 * All tunables live in content/hero.json — editable from /studio, which
 * previews changes live via the `overrides` prop.
 */

export interface HeroSettings {
  headline: string;
  cell: number;
  hoverRadius: number;
  holdRadius: number;
  holdGrowMs: number;
  decay: number;
  textureStrength: number;
}

export const heroConfig: HeroSettings = heroDefaults;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

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
  const CELL = Math.max(8, cfg.cell);
  const HOVER_R = cfg.hoverRadius;
  const HOLD_R = cfg.holdRadius;
  const HOLD_GROW_MS = cfg.holdGrowMs;
  const DECAY = Math.min(0.985, Math.max(0.5, cfg.decay));
  const TEXTURE = cfg.textureStrength;

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const imgWrap = imgWrapRef.current;
    if (!section || !canvas || !imgWrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let v: Float32Array = new Float32Array(0); // reveal energy per cell
    let jitter: Float32Array = new Float32Array(0); // stable dither per cell
    let cellFill: string[] = []; // cached per-cell colours
    let seamFill = "";
    let bgKey = "";

    let raf = 0;
    let running = false;
    let px = -1e4;
    let py = -1e4;
    let inside = false;
    let holding = false;
    let holdStart = 0;
    let currentR = HOVER_R;

    const initGrid = () => {
      const w = section.clientWidth;
      const h = section.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      v = new Float32Array(cols * rows);
      jitter = new Float32Array(cols * rows);
      for (let i = 0; i < jitter.length; i++) jitter[i] = Math.random();
      bgKey = ""; // force colour rebuild
    };

    const rebuildColors = () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      if (bg === bgKey) return;
      bgKey = bg;
      const [r, g, b] = parseRgb(bg);
      const light = (r + g + b) / 3 > 128;
      const seamD = light ? -10 : 12;
      seamFill = `rgb(${r + seamD}, ${g + seamD}, ${b + seamD})`;
      cellFill = new Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        // ±2% per-cell tint so the idle surface has the reference's texture
        const t = Math.round((jitter[i] - 0.5) * (light ? -9 : 11) * TEXTURE);
        cellFill[i] = `rgb(${r + t}, ${g + t}, ${b + t})`;
      }
    };

    const render = () => {
      rebuildColors();
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // radius: grows while holding, relaxes back after release
      const targetR = holding
        ? HOVER_R +
          (HOLD_R - HOVER_R) *
            easeOutCubic(Math.min((performance.now() - holdStart) / HOLD_GROW_MS, 1))
        : HOVER_R;
      currentR += (targetR - currentR) * 0.16;

      // inject energy around the pointer
      if (inside) {
        const R = currentR;
        const minCx = Math.max(0, Math.floor((px - R) / CELL));
        const maxCx = Math.min(cols - 1, Math.floor((px + R) / CELL));
        const minCy = Math.max(0, Math.floor((py - R) / CELL));
        const maxCy = Math.min(rows - 1, Math.floor((py + R) / CELL));
        for (let cy = minCy; cy <= maxCy; cy++) {
          for (let cx = minCx; cx <= maxCx; cx++) {
            const i = cy * cols + cx;
            const dx = cx * CELL + CELL / 2 - px;
            const dy = cy * CELL + CELL / 2 - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            // dither: each cell pretends to be a bit further/closer
            const dd = d + (jitter[i] - 0.35) * CELL * 2.6;
            if (dd < R) {
              const e = smooth(1 - dd / R);
              if (e > v[i]) v[i] = e;
            }
          }
        }
      }

      // decay + draw
      let maxV = 0;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          let val = v[i];
          if (val > 0.003) {
            val *= DECAY;
            v[i] = val < 0.003 ? 0 : val;
          } else if (val !== 0) {
            v[i] = 0;
          }
          if (v[i] > maxV) maxV = v[i];

          // cover alpha: 1 = opaque surface, 0 = fully revealed
          let a = 1 - smooth(Math.min(v[i] * 1.15, 1));
          // quantize into steps for a chunkier, pixel feel
          a = Math.round(a * 6) / 6;
          if (a <= 0.001) continue;

          const x = cx * CELL;
          const y = cy * CELL;
          ctx.globalAlpha = a;
          ctx.fillStyle = seamFill;
          ctx.fillRect(x, y, CELL, CELL);
          ctx.fillStyle = cellFill[i];
          ctx.fillRect(x + 0.75, y + 0.75, CELL - 1.5, CELL - 1.5);
        }
      }
      ctx.globalAlpha = 1;

      // sleep when nothing is happening
      if (!inside && !holding && maxV < 0.004) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(render);
    };

    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(render);
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
    const onLeave = () => {
      inside = false;
      holding = false;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      toLocal(e);
      inside = true;
      holding = true;
      holdStart = performance.now();
      wake();
    };
    const onUp = () => {
      holding = false;
      wake();
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerdown", onDown);
    section.addEventListener("pointerup", onUp);
    section.addEventListener("pointercancel", onUp);
    section.addEventListener("pointerleave", onLeave);

    const onResize = () => {
      if (
        section.clientWidth * (Math.min(window.devicePixelRatio || 1, 2)) !==
          canvas.width ||
        section.clientHeight * (Math.min(window.devicePixelRatio || 1, 2)) !==
          canvas.height
      ) {
        initGrid();
        wake();
        render();
      }
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(section);
    // belt & braces — some embedded/virtualized viewports miss RO callbacks
    window.addEventListener("resize", onResize);

    // theme flips re-key the colours on the next painted frame
    const mo = new MutationObserver(() => {
      bgKey = "";
      wake();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    initGrid();
    render(); // paint the full cover synchronously…
    imgWrap.style.opacity = "1"; // …then let the underlay exist beneath it

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointerup", onUp);
      section.removeEventListener("pointercancel", onUp);
      section.removeEventListener("pointerleave", onLeave);
    };
    // Re-init the grid whenever the tunables change (studio live preview).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CELL, HOVER_R, HOLD_R, HOLD_GROW_MS, DECAY, TEXTURE]);

  return (
    <section
      ref={sectionRef}
      className={`relative w-full cursor-crosshair select-none overflow-hidden ${
        compact ? "h-full min-h-[320px]" : "h-[calc(100svh-4rem)] min-h-[540px]"
      }`}
      style={{ touchAction: "pan-y" }}
      aria-label={cfg.headline}
    >
      {/* Underlay — hidden until the cover has painted once */}
      <div
        ref={imgWrapRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        aria-hidden
      >
        <Image
          src="/hero-underlay.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* The cover */}
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />

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
