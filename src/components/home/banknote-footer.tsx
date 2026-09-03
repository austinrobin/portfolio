"use client";

import { useRef } from "react";
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
 *    → FooterSettings; the Studio passes live overrides).
 *  · The guilloché ground is Austin's pattern, re-encoded light (see
 *    GuillocheGround) and multiplied onto the paper.
 *  · PRINT REVEAL: when the section's top reaches the viewport's centre
 *    it prints once, top to bottom — a clip wipe with a bright shine bar
 *    riding the freshly-inked edge (GSAP ScrollTrigger, works under
 *    ScrollSmoother).
 *  · GOLD ON HOVER (the hero's gilding, in CSS): each object — horses,
 *    lettering, columns, scripts, monogram — turns dark gradient gold
 *    with a travelling sheen. The background guilloché never reacts.
 */

const GOLD_FILTER = "sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(0.82)";

/* ---------------- guilloché ground ------------------------------------ */

/* Austin's own pattern (public/footer/guilloche.webp — 6048px source
   re-encoded to 2560px WebP q90, 28MB -> 211KB, lines verified intact at
   1:1). It is drawn on a white ground, so it multiplies onto the paper:
   white vanishes, only the lines ink. Strength 0..1 = opacity; above 1 a
   second multiply layer stacks the lines darker (multiply is the only
   filter-free way to deepen lines without tinting the paper). */
function GuillocheGround({ strength }: { strength: number }) {
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

/* ---------------- inked plate pieces ----------------------------------- */

function Plate({
  src,
  style,
  flip,
  alt,
}: {
  src: string;
  style: React.CSSProperties;
  flip?: boolean;
  alt: string;
}) {
  return (
    <div
      className={`bnf-piece absolute ${flip ? "-scale-x-100" : ""}`}
      style={{ "--mask": `url(${src})`, ...style } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- optimised engraving plates */}
      <img src={src} alt={alt} draggable={false} className="h-auto w-full select-none" />
    </div>
  );
}

/* ---------------- section ---------------------------------------------- */

export function BanknoteFooter({
  overrides,
}: {
  overrides?: Partial<FooterSettings>;
}) {
  const cfg: FooterSettings = { ...footerConfig, ...overrides };
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (reduce) return;
    const section = sectionRef.current;
    const plate = plateRef.current;
    const shine = shineRef.current;
    if (!section || !plate || !shine) return;

    gsap.set(plate, { clipPath: "inset(0% 0% 100% 0%)" });
    gsap.set(shine, { top: "-16%", opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 50%", once: true },
      defaults: { duration: 2.8, ease: "power2.inOut" },
    });
    tl.to(plate, { clipPath: "inset(0% 0% 0% 0%)" }, 0)
      .to(shine, { top: "104%" }, 0)
      .to(shine, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0)
      .to(shine, { opacity: 0, duration: 0.6, ease: "power1.in" }, 2.2);

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === section) st.kill();
      });
    };
  }, []);

  const verseLines = cfg.verseText.split("\n");

  return (
    <section
      ref={sectionRef}
      aria-label="Dedication"
      className={`relative overflow-hidden bg-background ${heroFonts.peristiwa.variable}`}
    >
      <style>{`
        .bnf-piece { transition: filter 0.45s ease; }
        .bnf-piece:hover { filter: ${GOLD_FILTER}; }
        .bnf-piece::after {
          content: ""; position: absolute; inset: 0; opacity: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 38%, rgba(255,226,150,0.95) 50%, transparent 62%);
          background-size: 260% 100%; background-position: 130% 0;
          -webkit-mask: var(--mask) center / contain no-repeat;
          mask: var(--mask) center / contain no-repeat;
          mix-blend-mode: screen;
        }
        .bnf-piece:hover::after { opacity: 1; animation: bnfSheen 1.7s ease-in-out infinite; }
        .bnf-script { color: ${INK}; transition: color 0.45s ease; }
        .bnf-script:hover {
          background: linear-gradient(100deg, #5e3c06, #8F5B08 40%, #D9A33C 50%, #8F5B08 60%, #5e3c06);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: bnfSheen 1.8s linear infinite;
        }
        @keyframes bnfSheen {
          from { background-position: 130% 0; }
          to { background-position: -30% 0; }
        }
      `}</style>

      {/* the printed plate — everything inside is revealed by the wipe */}
      <div
        ref={plateRef}
        className="relative mx-auto w-full max-w-[2000px]"
        style={{ aspectRatio: `100 / ${cfg.plateHeight}` }}
      >
        {cfg.showGuilloche ? (
          <GuillocheGround strength={cfg.guillocheOpacity} />
        ) : null}

        {/* pegasi, facing outward from the name (asset faces right) */}
        <Plate
          src="/footer/pegasus.svg"
          alt=""
          flip
          style={{ left: `${cfg.pegasusX}%`, top: `${cfg.pegasusY}%`, width: `${cfg.pegasusW}%` }}
        />
        <Plate
          src="/footer/pegasus.svg"
          alt=""
          style={{ right: `${cfg.pegasusX}%`, top: `${cfg.pegasusY}%`, width: `${cfg.pegasusW}%` }}
        />

        {/* AUSTIN — engraved currency lettering, always centred */}
        <Plate
          src="/footer/austin.svg"
          alt="Austin"
          style={{
            left: "50%",
            top: `${cfg.austinY}%`,
            width: `${cfg.austinW}%`,
            transform: "translateX(-50%)",
          }}
        />

        {/* colonnades receding at the base */}
        <Plate
          src="/footer/colonnade.svg"
          alt=""
          style={{ left: `${cfg.colonnadeX}%`, bottom: `${cfg.colonnadeBottom}%`, width: `${cfg.colonnadeW}%` }}
        />
        <Plate
          src="/footer/colonnade.svg"
          alt=""
          flip
          style={{ right: `${cfg.colonnadeX}%`, bottom: `${cfg.colonnadeBottom}%`, width: `${cfg.colonnadeW}%` }}
        />

        {/* the verse */}
        <p
          className="bnf-script absolute left-1/2 w-full -translate-x-1/2 text-center leading-[1.3]"
          style={{
            top: `${cfg.verseY}%`,
            fontSize: `clamp(16px, ${cfg.verseSize}vw, ${cfg.verseSize * 18}px)`,
            fontFamily: "var(--font-peristiwa)",
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
          className="bnf-script absolute left-1/2 min-w-[34px] -translate-x-1/2"
          style={{ top: `${cfg.monogramY}%`, width: `${cfg.monogramW}%` }}
        >
          <Monogram className="h-auto w-full" />
        </div>
        <p
          className="bnf-script absolute left-1/2 w-full -translate-x-1/2 text-center"
          style={{
            top: `${cfg.dedicationY}%`,
            fontSize: `clamp(11px, ${cfg.dedicationSize}vw, ${cfg.dedicationSize * 18}px)`,
            fontFamily: "var(--font-peristiwa)",
          }}
        >
          {cfg.dedicationText}
        </p>
      </div>

      {/* the press light riding the freshly printed edge */}
      <div
        ref={shineRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-16%] h-[16%] opacity-0 mix-blend-screen"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(255,238,190,0.55) 42%, rgba(255,215,120,0.85) 50%, rgba(255,238,190,0.55) 58%, transparent 100%)",
          filter: "blur(6px)",
        }}
      />
    </section>
  );
}
