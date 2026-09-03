"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Monogram } from "./monogram";
import { heroFonts, INK } from "./hero-config";
import { footerConfig, type FooterSettings } from "./footer-config";

/*
 * The closing plate — a banknote dedication (from Austin's mock):
 * pegasi over a colonnade, AUSTIN in engraved currency lettering, the
 * verse and "Dedicated to my mother" in script, all over a faint
 * guilloché ground.
 *
 *  · EVERY position/size/script line is Studio-tunable (content/footer.json
 *    → FooterSettings; the Studio passes live overrides). Scripts are sized
 *    in plate units (cqw) so the Studio canvas and the live page agree.
 *  · The guilloché ground is Austin's pattern (2560px WebP, 211KB) drawn
 *    on white, multiplied onto the paper. The plate carries its own paper
 *    background so the blend always has paper to work against — anything
 *    that isolates the plate (a clip, a container, a transform) would
 *    otherwise leave the image's white ground showing.
 *  · DRAWN IN: the plates are inlined SVGs. When the section's top reaches
 *    the viewport's centre, every path gets a hairline stroke in its own
 *    colour and draws itself on (DrawSVG) on its own staggered delay, then
 *    the fills ink in behind — an engraving being cut, not a curtain.
 *  · GOLD ON HOVER lives on the AUSTIN lettering only (the hero's gilding
 *    as CSS: dark gradient gold + a travelling sheen masked to the glyphs).
 */

const GOLD_FILTER = "sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(0.82)";

/* ---------------- guilloché ground ------------------------------------ */

function GuillocheGround({ strength }: { strength: number }) {
  /* 0..1 = opacity; above 1 a second multiply layer stacks the lines darker */
  const layers = [Math.min(1, strength), Math.max(0, Math.min(1, strength - 1))];
  return (
    <>
      {layers.map((o, i) =>
        o > 0 ? (
          /* eslint-disable-next-line @next/next/no-img-element -- static ground plate */
          <img
            key={i}
            src="/footer/guilloche.webp"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill mix-blend-multiply"
            style={{ opacity: o }}
          />
        ) : null,
      )}
    </>
  );
}

/* ---------------- inlined plate pieces --------------------------------- */

const svgCache = new Map<string, Promise<string>>();
function loadSvg(src: string) {
  let p = svgCache.get(src);
  if (!p) {
    p = fetch(src).then((r) => r.text());
    svgCache.set(src, p);
  }
  return p;
}

let uid = 0;
/* svgo minifies ids to "a", "b"… — seven inlined plates would share them
   and clip each other, so every instance gets its own namespace */
function namespaceIds(svg: string) {
  const ns = `p${++uid}`;
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${ns}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${ns}-${id})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${ns}-${id}"`);
}

function Plate({
  src,
  style,
  flip,
  gild,
  label,
  onReady,
}: {
  src: string;
  style: React.CSSProperties;
  flip?: boolean;
  gild?: boolean;
  label?: string;
  onReady: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    loadSvg(src).then((txt) => {
      if (!alive || !ref.current) return;
      ref.current.innerHTML = namespaceIds(txt);
      const svg = ref.current.querySelector("svg");
      if (svg) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("class", "block h-auto w-full");
        if (label) svg.setAttribute("aria-label", label);
        else svg.setAttribute("aria-hidden", "true");
      }
      onReady();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per src
  }, [src]);
  return (
    <div
      ref={ref}
      data-plate
      className={`absolute ${gild ? "bnf-gild" : ""} ${flip ? "-scale-x-100" : ""}`}
      style={{ "--mask": `url(${src})`, ...style } as React.CSSProperties}
    />
  );
}

/* ---------------- section ---------------------------------------------- */

const PLATE_COUNT = 7;

export function BanknoteFooter({
  overrides,
}: {
  overrides?: Partial<FooterSettings>;
}) {
  const cfg: FooterSettings = { ...footerConfig, ...overrides };
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const scriptsRef = useRef<(HTMLElement | null)[]>([]);
  const [ready, setReady] = useState(0);
  const allReady = ready >= PLATE_COUNT;

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !allReady || reduce) return;
      const plates = [...section.querySelectorAll<HTMLElement>("[data-plate]")];
      const scripts = scriptsRef.current.filter(Boolean) as HTMLElement[];
      const monoPath = section.querySelector<SVGPathElement>("[data-monogram] path");

      /* prime: fills hidden, every path stroked in its own colour */
      const groups = plates.map((plate) => {
        const paths = [...plate.querySelectorAll<SVGPathElement>("path")].filter(
          (p) => (p.getAttribute("fill") ?? "") !== "none",
        );
        for (const p of paths) {
          const f = p.getAttribute("fill") ?? INK;
          const white = /^(#fff(fff)?|white)$/i.test(f);
          p.style.stroke = white ? "transparent" : f;
          p.style.strokeWidth = "0.7";
          p.style.strokeLinejoin = "round";
          p.style.fillOpacity = "0";
        }
        return paths;
      });
      gsap.set(scripts, { opacity: 0, y: 10 });
      if (monoPath) {
        monoPath.style.stroke = "currentColor";
        monoPath.style.strokeWidth = "0.6";
        monoPath.style.fillOpacity = "0";
      }

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top 50%", once: true },
      });

      /* each plate is a sketch: strokes appear on their own delays, then
         the ink floods in. Pegasi + columns lead, the name lands over them,
         the flourishes flick in, the scripts settle last. */
      const startAt = [0, 0, 1.1, 0.35, 0.35, 1.9, 1.9]; // = plate order below
      groups.forEach((paths, i) => {
        const t0 = startAt[i];
        tl.from(
          paths,
          {
            drawSVG: "0%",
            duration: 1.1,
            ease: "power1.inOut",
            stagger: { amount: 1.6, from: "random" },
          },
          t0,
        ).to(
          paths,
          {
            fillOpacity: 1,
            duration: 0.9,
            ease: "power2.out",
            stagger: { amount: 1.2, from: "random" },
          },
          t0 + 1.2,
        );
      });
      if (monoPath) {
        tl.from(monoPath, { drawSVG: "0%", duration: 1.6, ease: "power1.inOut" }, 2.8).to(
          monoPath,
          { fillOpacity: 1, duration: 0.6 },
          3.9,
        );
      }
      tl.to(
        scripts,
        { opacity: 1, y: 0, duration: 1.1, ease: "power2.out", stagger: 0.35 },
        3.1,
      );
      if (process.env.NODE_ENV === "development") {
        // dev-only: lets the timeline be scrubbed from devtools (__bnfTl.progress(0.4))
        (window as Window & { __bnfTl?: gsap.core.Timeline }).__bnfTl = tl;
      }
    },
    { dependencies: [allReady, reduce] },
  );

  const verseLines = cfg.verseText.split("\n");
  const onReady = () => setReady((n) => n + 1);

  return (
    <section
      ref={sectionRef}
      aria-label="Dedication"
      className={`relative overflow-hidden bg-background ${heroFonts.peristiwa.variable}`}
    >
      <style>{`
        .bnf-gild { transition: filter 0.45s ease; }
        .bnf-gild:hover { filter: ${GOLD_FILTER}; }
        .bnf-gild::after {
          content: ""; position: absolute; inset: 0; opacity: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 38%, rgba(255,226,150,0.95) 50%, transparent 62%);
          background-size: 260% 100%; background-position: 130% 0;
          -webkit-mask: var(--mask) center / contain no-repeat;
          mask: var(--mask) center / contain no-repeat;
          mix-blend-mode: screen;
        }
        .bnf-gild:hover::after { opacity: 1; animation: bnfSheen 1.7s ease-in-out infinite; }
        @keyframes bnfSheen {
          from { background-position: 130% 0; }
          to { background-position: -30% 0; }
        }
      `}</style>

      {/* the plate paints its own paper so the ground's multiply blend
          always has paper beneath it, however the plate gets isolated */}
      <div
        className="relative mx-auto w-full max-w-[2000px] bg-background"
        style={{ aspectRatio: `100 / ${cfg.plateHeight}`, containerType: "inline-size" }}
      >
        {cfg.showGuilloche ? (
          <GuillocheGround strength={cfg.guillocheOpacity} />
        ) : null}

        {/* plate order = animation order (see startAt) */}
        <Plate
          src="/footer/pegasus.svg"
          flip
          onReady={onReady}
          style={{ left: `${cfg.pegasusX}%`, top: `${cfg.pegasusY}%`, width: `${cfg.pegasusW}%` }}
        />
        <Plate
          src="/footer/pegasus.svg"
          onReady={onReady}
          style={{ right: `${cfg.pegasusX}%`, top: `${cfg.pegasusY}%`, width: `${cfg.pegasusW}%` }}
        />
        <Plate
          src="/footer/austin.svg"
          gild
          label="Austin"
          onReady={onReady}
          style={{
            left: "50%",
            top: `${cfg.austinY}%`,
            width: `${cfg.austinW}%`,
            transform: "translateX(-50%)",
          }}
        />
        <Plate
          src="/footer/colonnade.svg"
          onReady={onReady}
          style={{ left: `${cfg.colonnadeX}%`, bottom: `${cfg.colonnadeBottom}%`, width: `${cfg.colonnadeW}%` }}
        />
        <Plate
          src="/footer/colonnade.svg"
          flip
          onReady={onReady}
          style={{ right: `${cfg.colonnadeX}%`, bottom: `${cfg.colonnadeBottom}%`, width: `${cfg.colonnadeW}%` }}
        />
        <Plate
          src="/footer/flourish.svg"
          flip
          onReady={onReady}
          style={{ left: `${cfg.flourishX}%`, top: `${cfg.flourishY}%`, width: `${cfg.flourishW}%` }}
        />
        <Plate
          src="/footer/flourish.svg"
          onReady={onReady}
          style={{ right: `${cfg.flourishX}%`, top: `${cfg.flourishY}%`, width: `${cfg.flourishW}%` }}
        />

        {/* the verse */}
        <p
          ref={(el) => {
            scriptsRef.current[0] = el;
          }}
          className="absolute left-1/2 w-max -translate-x-1/2 text-center leading-[1.3]"
          style={{
            top: `${cfg.verseY}%`,
            fontSize: `clamp(16px, ${cfg.verseSize}cqw, ${cfg.verseSize * 20}px)`,
            fontFamily: "var(--font-peristiwa)",
            color: INK,
          }}
        >
          {verseLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < verseLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>

        {/* monogram + dedication */}
        <div
          data-monogram
          className="absolute left-1/2 min-w-[34px] -translate-x-1/2"
          style={{ top: `${cfg.monogramY}%`, width: `${cfg.monogramW}%`, color: INK }}
        >
          <Monogram className="h-auto w-full" />
        </div>
        <p
          ref={(el) => {
            scriptsRef.current[1] = el;
          }}
          className="absolute left-1/2 w-max -translate-x-1/2 text-center"
          style={{
            top: `${cfg.dedicationY}%`,
            fontSize: `clamp(11px, ${cfg.dedicationSize}cqw, ${cfg.dedicationSize * 20}px)`,
            fontFamily: "var(--font-peristiwa)",
            color: INK,
          }}
        >
          {cfg.dedicationText}
        </p>
      </div>
    </section>
  );
}
