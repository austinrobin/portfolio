"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { Monogram } from "./monogram";
import { heroFonts, INK } from "./hero-config";

/*
 * The closing plate — a banknote dedication (from Austin's mock):
 * pegasi over a colonnade, AUSTIN in engraved currency lettering, the
 * verse and "Dedicated to my mother" in script, all over a faint
 * guilloché ground.
 *
 *  · The guilloché is GENERATED here (hypotrochoid rosette + border
 *    chain) — a few KB of inline SVG instead of a heavy asset, printed
 *    at whisper opacity.
 *  · PRINT REVEAL: when the section's top reaches the viewport's centre
 *    it prints once, top to bottom — a clip wipe with a bright shine bar
 *    riding the freshly-inked edge (GSAP ScrollTrigger, works under
 *    ScrollSmoother).
 *  · GOLD ON HOVER (the hero's gilding, in CSS): each object — horses,
 *    lettering, columns, scripts, monogram — turns dark gradient gold
 *    with a travelling sheen. The background guilloché never reacts.
 */

const GOLD_FILTER = "sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(0.82)";

/* ---------------- guilloché ground (deterministic, module-level) ------- */

const VB_W = 2000;
const VB_H = 1240;

/** closed hypotrochoid ring: k integer lobes, sampled fine, 1dp coords */
function ring(cx: number, cy: number, Rr: number, r: number, d: number) {
  const pts: string[] = [];
  const N = 720;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const k = Rr / r;
    const x = cx + Rr * Math.cos(t) + d * Math.cos(k * t);
    const y = cy + Rr * Math.sin(t) - d * Math.sin(k * t);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** sine rail along the top or bottom edge */
function rail(y: number, amp: number, wave: number, phase: number) {
  const pts: string[] = [];
  for (let x = 40; x <= VB_W - 40; x += 12) {
    const yy = y + Math.sin((x / wave) * Math.PI * 2 + phase) * amp;
    pts.push(`${x},${yy.toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

const ROSETTE = [
  ring(VB_W / 2, VB_H * 0.52, 360, 30, 96), // 12-lobe lace
  ring(VB_W / 2, VB_H * 0.52, 280, 35, 120), // 8-lobe
  ring(VB_W / 2, VB_H * 0.52, 180, 36, 70), // 5-lobe core
];
const RAILS = [
  rail(70, 26, 190, 0),
  rail(104, 26, 190, Math.PI),
  rail(VB_H - 70, 26, 190, 0),
  rail(VB_H - 104, 26, 190, Math.PI),
];
/* border chain: overlapping rings marching along both long edges */
const CHAIN: { cx: number; cy: number }[] = [];
for (let x = 90; x <= VB_W - 90; x += 105) {
  CHAIN.push({ cx: x, cy: 87 });
  CHAIN.push({ cx: x, cy: VB_H - 87 });
}
for (let y = 200; y <= VB_H - 200; y += 105) {
  CHAIN.push({ cx: 87, cy: y });
  CHAIN.push({ cx: VB_W - 87, cy: y });
}

function GuillocheGround() {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g stroke={INK} fill="none">
        <path d={ROSETTE[0]} strokeWidth="1.1" opacity="0.085" />
        <path d={ROSETTE[1]} strokeWidth="1" opacity="0.07" />
        <path d={ROSETTE[2]} strokeWidth="1" opacity="0.06" />
        {RAILS.map((d, i) => (
          <path key={i} d={d} strokeWidth="1" opacity="0.08" />
        ))}
        {CHAIN.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r="33" strokeWidth="0.9" opacity="0.065" />
        ))}
      </g>
    </svg>
  );
}

/* ---------------- inked plate pieces ----------------------------------- */

function Plate({
  src,
  className,
  flip,
  alt,
}: {
  src: string;
  className: string;
  flip?: boolean;
  alt: string;
}) {
  return (
    <div
      className={`bnf-piece absolute ${className} ${flip ? "-scale-x-100" : ""}`}
      style={{ "--mask": `url(${src})` } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- optimised engraving plates */}
      <img src={src} alt={alt} draggable={false} className="h-auto w-full select-none" />
    </div>
  );
}

/* ---------------- section ---------------------------------------------- */

export function BanknoteFooter() {
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
      <div ref={plateRef} className="relative mx-auto aspect-[2000/1240] w-full max-w-[2000px]">
        <GuillocheGround />

        {/* pegasi, facing outward from the name */}
        <Plate src="/footer/pegasus.svg" alt="" flip className="left-[6.5%] top-[9%] w-[22%]" />
        <Plate src="/footer/pegasus.svg" alt="" className="right-[6.5%] top-[9%] w-[22%]" />

        {/* AUSTIN — engraved currency lettering */}
        <Plate src="/footer/austin.svg" alt="Austin" className="left-1/2 top-[25%] w-[60%] -translate-x-1/2" />

        {/* colonnades receding at the base */}
        <Plate src="/footer/colonnade.svg" alt="" className="bottom-[3%] left-[2.5%] w-[17%]" />
        <Plate src="/footer/colonnade.svg" alt="" flip className="bottom-[3%] right-[2.5%] w-[17%]" />

        {/* the verse */}
        <p
          className="bnf-script absolute left-1/2 top-[53%] w-full -translate-x-1/2 text-center text-[clamp(18px,2.5vw,44px)] leading-[1.3]"
          style={{ fontFamily: "var(--font-peristiwa)" }}
        >
          Whatever you do,
          <br />
          do it for the Lord.
        </p>

        {/* monogram + dedication */}
        <div className="bnf-script absolute left-1/2 top-[74%] w-[4.5%] min-w-[34px] -translate-x-1/2">
          <Monogram className="h-auto w-full" />
        </div>
        <p
          className="bnf-script absolute left-1/2 top-[83%] w-full -translate-x-1/2 text-center text-[clamp(12px,1.35vw,24px)]"
          style={{ fontFamily: "var(--font-peristiwa)" }}
        >
          Dedicated to my mother
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
