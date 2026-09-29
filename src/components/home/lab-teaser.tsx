"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";
import { heroFonts, INK, PAPER } from "./hero-config";
import { labConfig, type LabCascadeSettings } from "./lab-config";
import { mediaUrl, fallbackToOrigin } from "@/lib/media-url";

/*
 * The Lab — teaser cards as a diagonal cover cascade (stellium reference).
 * Every number that shapes the spread lives in content/lab.json and is
 * tunable from /studio: placement (pane size, diagonal steps), angle
 * (rotY/rotX/perspective), surface (radius, shadows) and the active state
 * (slide, scale, angle). Hover slides a cover out of the stack to reveal
 * its face; the tilt is held unless activeRotY says otherwise.
 */

/* the covers come from content/lab.json (Studio: Lab — cascade) */

export function LabTeaser({
  overrides,
}: {
  overrides?: Partial<LabCascadeSettings>;
}) {
  const cfg: LabCascadeSettings = { ...labConfig, ...overrides };
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const experiments = cfg.experiments;
  const n = experiments.length;
  const foot = (x: LabCascadeSettings["experiments"][number]) => (x.href ? `Open ↗${x.tool ? ` · Built with ${x.tool}` : ""}` : "Coming soon");
  const glow = (x: LabCascadeSettings["experiments"][number]) => `radial-gradient(ellipse 90% 80% at ${x.glow ?? "50% 20%"}, rgba(249,247,241,0.16) 0%, transparent 55%), ${INK}`;

  /* geometry, all in % of the stage width */
  const paneH = cfg.paneWidth * cfg.paneAspect;
  const groupW = cfg.paneWidth + (n - 1) * cfg.stepX;
  const offsetX = Math.max(0, (100 - groupW) / 2);
  const totalH = paneH + (n - 1) * cfg.stepY;
  /* a hovered pane slides right by `slide`% of its width; the last one can
     poke past the stage by this much (in stage %). The stage is kept narrow
     enough — as a share of the viewport — that the overhang never crosses
     the viewport edge, where the page clips */
  const overhang = Math.max(0, (cfg.slide * cfg.paneWidth) / 100 - offsetX) + 1;
  const stageVw = Math.floor(100 / (1 + (2 * overhang) / 100));
  const stageWidth = `min(92vw, max(${stageVw}vw, 560px), 990px)`;
  const tilt = reduce ? {} : { rotateY: cfg.rotY, rotateX: cfg.rotX };

  return (
    <section
      className={`py-20 ${heroFonts.silk.variable} ${heroFonts.peristiwa.variable}`}
    >
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Reveal>
          <p className="flex items-center justify-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            <span className="size-2 rounded-full bg-accent" />
            The Lab
          </p>
          <h2
            className="mt-5 flex items-center justify-center gap-[0.45em] text-[clamp(30px,3vw,46px)] leading-none"
            style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
          >
            <GuillocheMark />
            <span>AI exploration</span>
          </h2>
        </Reveal>
      </div>

      {/* ---- phones and small tablets: the three covers, stacked, everything shown ---- */}
      <div className="mx-auto mt-10 flex w-[min(88vw,420px)] flex-col gap-8 lg:hidden">
        {experiments.map((x) => (
          <div key={x.tag}>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em]" style={{ fontFamily: "var(--font-silk)", color: INK }}>
              {x.name}
            </p>
            <div
              className="relative flex flex-col justify-between overflow-hidden p-6"
              style={{ aspectRatio: "4 / 3", borderRadius: cfg.radius, background: glow(x), color: PAPER, boxShadow: `0 12px 32px rgba(26,25,19,${cfg.shadowRest})` }}
            >
              {x.cover ? (
                <Cover src={x.cover} />
              ) : (
                <>
                  <span className="relative font-mono text-[11px] uppercase tracking-[0.25em] opacity-70">{x.tag}</span>
                  <div className="relative">
                    <p className="text-[26px] leading-tight" style={{ fontFamily: "var(--font-peristiwa)" }}>
                      {x.title}
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed opacity-80">{x.blurb}</p>
                    <span className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">{foot(x)}</span>
                  </div>
                </>
              )}
              {x.href ? <a href={x.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${x.name}`} className="absolute inset-0 z-10" /> : null}
            </div>
            {x.cover ? <Caption x={x} /> : null}
          </div>
        ))}
      </div>

      {/* ---- the cascade — sized to the works stage ---- */}
      <div className="mt-10 hidden justify-center lg:flex">
        <div
          className="relative"
          style={{ width: stageWidth, perspective: cfg.perspective, aspectRatio: `100 / ${totalH}` }}
        >
          {experiments.map((x, i) => {
            const isHover = hovered === i;
            return (
              <motion.div
                key={x.tag}
                /* the wrapper's flat plane would catch clicks in front of the tilted cover — let them through to the card */
                className="pointer-events-none absolute"
                style={{
                  width: `${cfg.paneWidth}%`,
                  left: `${offsetX + i * cfg.stepX}%`,
                  top: `${(n - 1 - i) * cfg.stepY}%`,
                  zIndex: n - i,
                  transformStyle: "preserve-3d",
                }}
                initial={reduce ? false : { opacity: 0, x: "30%", y: -60 }}
                whileInView={{ opacity: 1, x: "0%", y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onHoverStart={() => setHovered(i)}
                onHoverEnd={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              >
                {/* the project's name, on a line dropped down to the cover */}
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 flex -translate-x-1/2 flex-col items-center pb-2"
                  style={{ opacity: isHover ? 1 : 0, transition: "opacity 250ms ease-out" }}
                >
                  <span
                    className="whitespace-nowrap text-[clamp(12px,1.05vw,15px)] font-medium uppercase tracking-[0.06em]"
                    style={{ fontFamily: "var(--font-silk)", color: INK, transform: isHover ? "translateY(0)" : "translateY(6px)", transition: "transform 350ms cubic-bezier(0.16,1,0.3,1)" }}
                  >
                    {x.name}
                  </span>
                  <span
                    className="mt-1.5 block w-px origin-top"
                    style={{ height: "clamp(28px,4vw,56px)", background: INK, transform: isHover ? "scaleY(1)" : "scaleY(0)", transition: "transform 350ms cubic-bezier(0.16,1,0.3,1)" }}
                  />
                </div>
                {/* the slide, scale and turn on the mover; the sheet and its shadow inside, so a
                    caption under an image cover travels with it */}
                <motion.div
                  className="pointer-events-auto relative w-full cursor-pointer"
                  animate={
                    reduce
                      ? undefined
                      : isHover
                        ? { x: `${cfg.slide}%`, scale: cfg.activeScale, rotateY: cfg.activeRotY, rotateX: cfg.rotX }
                        : { x: "0%", scale: 1, rotateY: cfg.rotY, rotateX: cfg.rotX }
                  }
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={tilt}
                >
                <motion.div
                  className="relative w-full overflow-hidden"
                  animate={{ boxShadow: isHover ? `0 18px 44px rgba(26,25,19,${cfg.shadowHover})` : `0 12px 32px rgba(26,25,19,${cfg.shadowRest})` }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    aspectRatio: `1 / ${cfg.paneAspect}`,
                    borderRadius: cfg.radius,
                    background: glow(x),
                    color: PAPER,
                  }}
                >
                  {x.cover ? <Cover src={x.cover} /> : null}
                  {x.href ? <a href={x.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${x.name}`} className="absolute inset-0 z-10" /> : null}
                  {x.cover ? null : (
                  <div className="relative flex h-full flex-col justify-between p-6 sm:p-9">
                    <span className="font-mono text-[clamp(11px,0.8vw,12px)] uppercase tracking-[0.25em] opacity-70">
                      {x.tag}
                    </span>
                    <div>
                      <p
                        className="text-[clamp(22px,2.6vw,34px)] leading-tight"
                        style={{ fontFamily: "var(--font-peristiwa)" }}
                      >
                        {x.title}
                      </p>
                      <motion.div
                        animate={{ opacity: isHover ? 1 : 0 }}
                        transition={{ duration: 0.35 }}
                        className="mt-3 max-w-[80%]"
                      >
                        <p className="text-[clamp(12px,1.05vw,15px)] leading-relaxed opacity-80">
                          {x.blurb}
                        </p>
                        <span className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">
                          {foot(x)}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                  )}
                </motion.div>
                {x.cover ? <Caption x={x} /> : null}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* the app's own share image as the cover — nothing is written over it */
function Cover({ src }: { src: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a cover at its own size */}
      <img src={mediaUrl(src)} onError={fallbackToOrigin} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" draggable={false} />
    </>
  );
}

/* under a cover that is an image: only the credit line, nothing on the image */
function Caption({ x, className = "" }: { x: LabCascadeSettings["experiments"][number]; className?: string }) {
  return (
    <div className={`mt-3 flex justify-center ${className}`}>
      {x.href ? (
        <a href={x.href} target="_blank" rel="noopener noreferrer" className="shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 transition-opacity hover:opacity-100" style={{ color: INK }}>
          Open ↗{x.tool ? ` · Built with ${x.tool}` : ""}
        </a>
      ) : (
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] opacity-60" style={{ color: INK }}>{x.tool ? `Built with ${x.tool}` : "Coming soon"}</span>
      )}
    </div>
  );
}

/* a small guilloché rosette, turning — the lathe at work beside the title */
function GuillocheMark() {
  const ring = (n: number, rx: number, ry: number, cls: string, w: number) => (
    <g className={cls} style={{ transformOrigin: "50% 50%" }} fill="none" stroke="currentColor" strokeWidth={w}>
      {Array.from({ length: n }, (_, i) => (
        <ellipse key={i} cx="50" cy="50" rx={rx} ry={ry} transform={`rotate(${(180 / n) * i} 50 50)`} />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-[0.95em] w-[0.95em] shrink-0 overflow-visible" style={{ color: INK }}>
      {ring(9, 47, 17, "lab-lathe-a", 0.9)}
      {ring(7, 30, 11, "lab-lathe-b", 0.9)}
      <circle cx="50" cy="50" r="3" fill="currentColor" />
    </svg>
  );
}
