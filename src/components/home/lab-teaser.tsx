"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";
import { heroFonts, INK, PAPER } from "./hero-config";
import { labConfig, type LabCascadeSettings } from "./lab-config";

/*
 * The Lab — teaser cards as a diagonal cover cascade (stellium reference).
 * Every number that shapes the spread lives in content/lab.json and is
 * tunable from /studio: placement (pane size, diagonal steps), angle
 * (rotY/rotX/perspective), surface (radius, shadows) and the active state
 * (slide, scale, angle). Hover slides a cover out of the stack to reveal
 * its face; the tilt is held unless activeRotY says otherwise.
 */

const experiments = [
  {
    tag: "The Gift",
    title: "Something you take with you",
    blurb: "A genuinely useful tool anyone who lands here can pick up and keep.",
    glow: "20% 15%",
  },
  {
    tag: "The Daily",
    title: "The tab you keep open",
    blurb:
      "One small, overlooked problem — solved so cleanly it earns a spot in your workflow.",
    glow: "75% 20%",
  },
  {
    tag: "The Craft",
    title: "Product thinking, refined",
    blurb: "A considered build that shows how I think about products end to end.",
    glow: "40% 80%",
  },
];

export function LabTeaser({
  overrides,
}: {
  overrides?: Partial<LabCascadeSettings>;
}) {
  const cfg: LabCascadeSettings = { ...labConfig, ...overrides };
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const n = experiments.length;

  /* geometry, all in % of the stage width */
  const paneH = cfg.paneWidth * cfg.paneAspect;
  const groupW = cfg.paneWidth + (n - 1) * cfg.stepX;
  const offsetX = Math.max(0, (100 - groupW) / 2);
  const totalH = paneH + (n - 1) * cfg.stepY;
  const tilt = reduce ? {} : { rotateY: cfg.rotY, rotateX: cfg.rotX };

  return (
    <section
      className={`mx-auto max-w-6xl overflow-hidden px-6 py-20 ${heroFonts.silk.variable} ${heroFonts.peristiwa.variable}`}
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            <span className="size-2 rounded-full bg-accent" />
            The Lab
          </p>
          <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            Things I built that you can actually use.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            Small products, made with AI — each one an argument. That I can spot
            a problem, and that I can ship the fix.
          </p>
        </Reveal>
      </div>

      {/* ---- the cascade — sized to the works stage ---- */}
      <div className="mt-10 flex justify-center">
        <div
          className="relative w-[min(92vw,990px)]"
          style={{ perspective: cfg.perspective, aspectRatio: `100 / ${totalH}` }}
        >
          {experiments.map((x, i) => {
            const isHover = hovered === i;
            return (
              <motion.div
                key={x.tag}
                className="absolute cursor-pointer"
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
                <motion.div
                  className="w-full overflow-hidden"
                  animate={
                    reduce
                      ? undefined
                      : isHover
                        ? {
                            x: `${cfg.slide}%`,
                            scale: cfg.activeScale,
                            rotateY: cfg.activeRotY,
                            rotateX: cfg.rotX,
                            boxShadow: `0 18px 44px rgba(26,25,19,${cfg.shadowHover})`,
                          }
                        : {
                            x: "0%",
                            scale: 1,
                            rotateY: cfg.rotY,
                            rotateX: cfg.rotX,
                            boxShadow: `0 12px 32px rgba(26,25,19,${cfg.shadowRest})`,
                          }
                  }
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    aspectRatio: `1 / ${cfg.paneAspect}`,
                    borderRadius: cfg.radius,
                    ...tilt,
                    background: `radial-gradient(ellipse 90% 80% at ${x.glow}, rgba(249,247,241,0.16) 0%, transparent 55%), ${INK}`,
                    color: PAPER,
                  }}
                >
                  <div className="flex h-full flex-col justify-between p-6 sm:p-9">
                    <span className="font-mono text-[clamp(9px,0.8vw,11px)] uppercase tracking-[0.25em] opacity-70">
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
                        <span className="mt-3 inline-block font-mono text-[clamp(8px,0.7vw,10px)] uppercase tracking-[0.3em] opacity-60">
                          Coming soon
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
