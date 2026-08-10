"use client";

/* These <img> elements are deliberate: they are positioned by JS to match the
   shader's portrait rect and act as the pre-paint / no-JS rendering, neither of
   which next/image supports. */
/* eslint-disable @next/next/no-img-element */

import { useRef, useSyncExternalStore } from "react";
import { heroConfig, type HeroSettings } from "./hero-config";

/*
 * No-WebGL fallback for the portrait hero.
 *
 * Tier 2: the marble bust, with the real face revealed through a CSS radial
 * mask that follows the pointer. No canvas, no rAF — pointermove just writes
 * two custom properties.
 * Tier 3 (no CSS mask support, or reduced motion): the bust alone. A still
 * portrait is a complete hero; we don't try to approximate the shader.
 */

/* Client-only capability probe. useSyncExternalStore keeps SSR at `false`
   and avoids a setState-in-effect. */
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
      className={`relative w-full select-none overflow-hidden ${
        compact ? "h-full min-h-[320px]" : "min-h-[560px] h-[calc(100svh-4rem)]"
      }`}
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
      <div className="pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-6xl flex-col justify-center px-6">
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

      <div
        ref={wrapRef}
        className="absolute inset-0"
        style={{ ["--mo" as string]: "0" }}
      >
        <img
          src="/hero-art.png"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-contain object-bottom md:object-right-bottom"
        />
        {canMask && (
          <img
            src="/hero-face.png"
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-contain object-bottom opacity-[var(--mo)] transition-opacity duration-300 md:object-right-bottom"
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
