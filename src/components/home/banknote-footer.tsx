"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
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
 *  · ENGRAVED IN (2s, once, at "top 50%"): the SVGs are inlined only for
 *    the draw. Every mark keeps its exact fill and appears along a sweep —
 *    AUSTIN left to right, columns top down, flourishes outward from the
 *    verse, pegasi outward from the body — in ~40 batches per plate with
 *    hand-jitter. No strokes are added, so nothing thickens and the
 *    hand-back to the <img> is invisible. Monogram draws as a line;
 *    scripts settle last.
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
            data-ground
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill mix-blend-multiply"
            style={{ opacity: o }}
          />
        ) : null,
      )}
    </>
  );
}

/* ---------------- plate pieces ----------------------------------------- */

/* The plates render as plain <img> — the vector exactly as supplied. Only
   for the ~2s draw are the SVGs inlined (fetched once, ids namespaced so
   the seven instances can't clip each other), and the moment the draw
   completes each plate is swapped back to its <img>: no hairline strokes
   left behind, no 3,000 live paths weighing down the scroll. */

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
function namespaceIds(svg: string) {
  const ns = `p${++uid}`;
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${ns}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${ns}-${id})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${ns}-${id}"`);
}

/* how each plate is engraved in: the order its marks appear. Every mark
   keeps its exact fill (no strokes are ever added, so nothing thickens and
   nothing jumps when the draw hands back to the <img>) — the "drawing" is
   the sweep of a hand across the plate. */
type DrawMode = "x" | "y" | "radial";

function Plate({
  src,
  style,
  flip,
  gild,
  alt,
  mode,
  at,
}: {
  src: string;
  style: React.CSSProperties;
  flip?: boolean;
  gild?: boolean;
  alt: string;
  mode: DrawMode;
  at: number; // timeline start, s
}) {
  return (
    <div
      data-plate
      data-src={src}
      data-mode={mode}
      data-at={at}
      className={`absolute ${gild ? "bnf-gild" : ""} ${flip ? "-scale-x-100" : ""}`}
      style={{ "--mask": `url(${src})`, ...style } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the plate as supplied */}
      <img src={src} alt={alt} draggable={false} className="block h-auto w-full select-none" />
    </div>
  );
}

const PLATE_SRCS = [
  "/footer/pegasus.svg",
  "/footer/austin.svg",
  "/footer/colonnade.svg",
  "/footer/flourish.svg",
];

/* ---------------- section ---------------------------------------------- */

export function BanknoteFooter({
  overrides,
}: {
  overrides?: Partial<FooterSettings>;
}) {
  const cfg: FooterSettings = { ...footerConfig, ...overrides };
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const scriptsRef = useRef<(HTMLElement | null)[]>([]);
  const [svgs, setSvgs] = useState<Map<string, string> | null>(null);

  /* fetch the four vectors once, early — the inject happens later */
  useEffect(() => {
    if (reduce) return;
    let alive = true;
    Promise.all(PLATE_SRCS.map((s) => loadSvg(s).then((t) => [s, t] as const))).then(
      (pairs) => {
        if (alive) setSvgs(new Map(pairs));
      },
    );
    return () => {
      alive = false;
    };
  }, [reduce]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !svgs || reduce) return;
      const plates = [...section.querySelectorAll<HTMLElement>("[data-plate]")];
      const scripts = scriptsRef.current.filter(Boolean) as HTMLElement[];
      const mono = section.querySelector<HTMLElement>("[data-monogram]");
      const monoPath = mono?.querySelector<SVGPathElement>("path") ?? null;

      /* until the draw, the plates are held invisible (they're below the
         fold at load, so nothing flashes). The ground remembers its Studio
         strength so it can ease back up to exactly that. */
      const ground = [...section.querySelectorAll<HTMLElement>("[data-ground]")];
      for (const g of ground) g.dataset.o = g.style.opacity || "1";
      gsap.set([...plates, ...scripts, mono, ...ground].filter(Boolean), { opacity: 0 });

      let tl: gsap.core.Timeline | null = null;

      const inject = () => {
        for (const plate of plates) {
          const txt = svgs.get(plate.dataset.src ?? "");
          if (!txt || plate.querySelector("svg")) continue;
          const img = plate.querySelector("img");
          if (img) img.style.display = "none";
          plate.insertAdjacentHTML("beforeend", namespaceIds(txt));
          plate.style.willChange = "transform"; // own layer: repaints stay local to the plate
          const svg = plate.querySelector("svg");
          if (svg) {
            svg.removeAttribute("width");
            svg.removeAttribute("height");
            svg.setAttribute("class", "block h-auto w-full");
            svg.setAttribute("aria-hidden", "true");
          }
        }
      };

      /* the draw finished: hand every plate back to its <img>, untouched */
      const restore = () => {
        for (const plate of plates) {
          const img = plate.querySelector("img");
          if (img) img.style.display = "";
          plate.querySelector("svg")?.remove();
          plate.style.willChange = "";
        }
        if (monoPath) {
          monoPath.style.stroke = "";
          monoPath.style.strokeWidth = "";
          monoPath.style.strokeOpacity = "";
          monoPath.style.fillOpacity = "";
          monoPath.style.strokeDasharray = "";
          monoPath.style.strokeDashoffset = "";
        }
      };

      const build = () => {
        inject();
        tl = gsap.timeline({ paused: true, onComplete: restore });
        gsap.set(plates, { opacity: 1 });

        const BUCKETS = 40;
        const SWEEP = 0.85; // s a single plate takes to engrave in

        /* the guilloché surfaces under the marks — a long ease-out, so it is
           mostly there by the time AUSTIN is cut and settles as the scripts do */
        tl.to(
          ground,
          {
            opacity: (_i: number, el: Element) => parseFloat((el as HTMLElement).dataset.o ?? "1"),
            duration: 1.8,
            ease: "power2.out",
          },
          0,
        );

        for (const plate of plates) {
          const at = parseFloat(plate.dataset.at ?? "0");
          const mode = (plate.dataset.mode ?? "x") as DrawMode;
          const svg = plate.querySelector("svg");
          const paths = [...plate.querySelectorAll<SVGPathElement>("path")].filter(
            (p) => (p.getAttribute("fill") ?? "") !== "none",
          );
          if (!svg || !paths.length) continue;

          /* order the marks along the sweep, with a little hand-jitter */
          const vb = svg.viewBox.baseVal;
          const cx0 = vb.x + vb.width / 2;
          const cy0 = vb.y + vb.height / 2;
          const keyed = paths.map((el) => {
            const b = el.getBBox();
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            const key =
              mode === "x" ? (cx - vb.x) / vb.width
              : mode === "y" ? (cy - vb.y) / vb.height
              : Math.hypot((cx - cx0) / vb.width, (cy - cy0) / vb.height) * 2;
            return { el, key: key + (Math.random() - 0.5) * 0.08 };
          });
          keyed.sort((a, b) => a.key - b.key);
          gsap.set(paths, { opacity: 0 });
          const per = Math.ceil(keyed.length / BUCKETS);
          for (let i = 0; i * per < keyed.length; i++) {
            const bucket = keyed.slice(i * per, (i + 1) * per).map((k) => k.el);
            tl.to(
              bucket,
              { opacity: 1, duration: 0.32, ease: "power1.out" },
              at + (i / BUCKETS) * SWEEP,
            );
          }
        }

        /* the monogram is one hand-drawn line: draw it, ink it, then let the
           drawing stroke dissolve so nothing snaps when it's cleared */
        if (mono && monoPath) {
          monoPath.style.stroke = "currentColor";
          monoPath.style.strokeWidth = "0.5";
          monoPath.style.fillOpacity = "0";
          gsap.set(mono, { opacity: 1 });
          tl.from(monoPath, { drawSVG: "0%", duration: 0.65, ease: "power1.inOut" }, 0.95)
            .to(monoPath, { fillOpacity: 1, duration: 0.3, ease: "power1.out" }, 1.45)
            .to(monoPath, { strokeOpacity: 0, duration: 0.25 }, 1.6);
        }
        tl.fromTo(
          scripts,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", stagger: 0.2 },
          1.25,
        );
        if (process.env.NODE_ENV === "development") {
          (window as Window & { __bnfTl?: gsap.core.Timeline }).__bnfTl = tl;
        }
      };

      if (process.env.NODE_ENV === "development") {
        (window as Window & { __bnfBuild?: () => void }).__bnfBuild = build;
      }

      /* inject + measure one viewport early, so the draw starts clean */
      ScrollTrigger.create({ trigger: section, start: "top 130%", once: true, onEnter: build });
      ScrollTrigger.create({
        trigger: section,
        start: "top 50%",
        once: true,
        onEnter: () => {
          if (!tl) build();
          tl?.play();
        },
      });
    },
    { dependencies: [svgs, reduce] },
  );

  const verseLines = cfg.verseText.split("\n");
  
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
          alt=""
          mode="radial"
          at={0}
          flip
          style={{ left: `${cfg.pegasusX}%`, top: `${cfg.pegasusY}%`, width: `${cfg.pegasusW}%` }}
        />
        <Plate
          src="/footer/pegasus.svg"
          alt=""
          mode="radial"
          at={0}
          style={{ right: `${cfg.pegasusX}%`, top: `${cfg.pegasusY}%`, width: `${cfg.pegasusW}%` }}
        />
        <Plate
          src="/footer/austin.svg"
          alt="Austin"
          mode="x"
          at={0.3}
          gild
          style={{
            left: "50%",
            top: `${cfg.austinY}%`,
            width: `${cfg.austinW}%`,
            transform: "translateX(-50%)",
          }}
        />
        <Plate
          src="/footer/colonnade.svg"
          alt=""
          mode="y"
          at={0.1}
          style={{ left: `${cfg.colonnadeX}%`, bottom: `${cfg.colonnadeBottom}%`, width: `${cfg.colonnadeW}%` }}
        />
        <Plate
          src="/footer/colonnade.svg"
          alt=""
          mode="y"
          at={0.1}
          flip
          style={{ right: `${cfg.colonnadeX}%`, bottom: `${cfg.colonnadeBottom}%`, width: `${cfg.colonnadeW}%` }}
        />
        <Plate
          src="/footer/flourish.svg"
          alt=""
          mode="x"
          at={0.6}
          flip
          style={{ left: `${cfg.flourishX}%`, top: `${cfg.flourishY}%`, width: `${cfg.flourishW}%` }}
        />
        <Plate
          src="/footer/flourish.svg"
          alt=""
          mode="x"
          at={0.6}
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
