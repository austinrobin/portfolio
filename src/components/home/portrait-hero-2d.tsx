"use client";

/* These <img> elements are deliberate: they are positioned to match the
   shader's portrait rect and act as the pre-paint / no-JS rendering, neither
   of which next/image supports. */
/* eslint-disable @next/next/no-img-element */

import { useRef, useSyncExternalStore } from "react";
import {
  heroConfig,
  heroFonts,
  INK,
  PAPER,
  type HeroSettings,
} from "./hero-config";

/*
 * No-WebGL fallback for the banknote hero.
 *
 * Tier 2: the currency art, with the real face revealed through a CSS radial
 * mask that follows the pointer. No canvas, no rAF — pointermove just writes
 * two custom properties.
 * Tier 3 (no CSS mask support, or reduced motion): the art alone. A still
 * banknote portrait is a complete hero; we don't approximate the shader.
 */

const noopSubscribe = () => () => {};
const probeMask = () => {
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supported =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    (CSS.supports("mask-image", "radial-gradient(circle, #000, transparent)") ||
      CSS.supports(
        "-webkit-mask-image",
        "radial-gradient(circle, #000, transparent)",
      ));
  return supported && !reduced;
};

export function PortraitHero2D({
  overrides,
  compact = false,
}: {
  overrides?: Partial<HeroSettings>;
  compact?: boolean;
}) {
  const cfg: HeroSettings = { ...heroConfig, ...overrides };
  const wrapRef = useRef<HTMLDivElement>(null);
  const canMask = useSyncExternalStore(noopSubscribe, probeMask, () => false);

  return (
    <section
      className={`relative w-full select-none overflow-hidden ${heroFonts.silk.variable} ${heroFonts.peristiwa.variable} ${
        compact ? "h-full min-h-[320px]" : "min-h-[560px] h-svh"
      }`}
      style={{ background: PAPER, color: INK }}
      onPointerMove={(e) => {
        const el = wrapRef.current;
        if (!el || !canMask) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        el.style.setProperty("--mo", "1");
      }}
      onPointerLeave={() => {
        wrapRef.current?.style.setProperty("--mo", "0");
      }}
    >
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
      {!compact && (
        <p
          className="pointer-events-none absolute left-[70.74%] top-[45.2svh] z-10 w-[24.5vw] max-md:w-auto text-[clamp(24px,2.65vw,40px)] leading-[1.175] max-md:hidden"
          style={{ fontFamily: "var(--font-peristiwa)" }}
        >
          {cfg.sub}
        </p>
      )}

      <div ref={wrapRef} className="absolute inset-0" style={{ ["--mo" as string]: "0" }}>
        <img
          src="/hero-art.png"
          alt=""
          aria-hidden
          className="absolute bottom-[-5.6%] left-1/2 h-[88.3%] w-auto -translate-x-1/2"
        />
        {canMask && (
          <img
            src="/hero-face.png"
            alt=""
            aria-hidden
            className="absolute bottom-[-5.6%] left-1/2 h-[88.3%] w-auto -translate-x-1/2 opacity-[var(--mo)] transition-opacity duration-300"
            style={{
              maskImage:
                "radial-gradient(circle 150px at var(--mx, -999px) var(--my, -999px), #000 40%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(circle 150px at var(--mx, -999px) var(--my, -999px), #000 40%, transparent 72%)",
            }}
          />
        )}
      </div>
    </section>
  );
}
