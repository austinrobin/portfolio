"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion";
import { heroFonts, INK, PAPER } from "./hero-config";

/*
 * The Lab — teaser cards as a diagonal 3D cascade (reference: stellium's
 * project wall, 4-7s of Austin's capture). The panes share one strong
 * perspective tilt and step up the diagonal, overlapping like standing
 * glass. Hovering a pane pops it toward the camera: it straightens,
 * scales, takes the top of the stack and reveals its blurb. With three
 * products the spread stays centred and deliberate.
 */

const experiments = [
  {
    tag: "The Gift",
    title: "Something you take with you",
    blurb: "A genuinely useful tool anyone who lands here can pick up and keep.",
    /** highlight position for the pane's sheen */
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

/* Diagonal layout: even steps along an up-right axis, later cards behind. */
const STEP_X = 220;
const STEP_Y = -96;
const TILT = { rotateY: -34, rotateX: 7 };

export function LabTeaser() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const n = experiments.length;

  return (
    <section
      className={`mx-auto max-w-5xl overflow-hidden px-6 py-20 ${heroFonts.silk.variable} ${heroFonts.peristiwa.variable}`}
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

      {/* ---- the cascade ---- */}
      <div className="mt-4 flex justify-center">
        <div
          className="relative h-[440px] w-full max-w-4xl scale-[0.52] sm:scale-75 lg:scale-100"
          style={{ perspective: 1300 }}
        >
          {experiments.map((x, i) => {
            const c = (n - 1) / 2;
            const dx = (i - c) * STEP_X;
            const dy = (i - c) * STEP_Y;
            const isHover = hovered === i;
            return (
              <motion.div
                key={x.tag}
                className="absolute left-1/2 top-1/2 w-[320px] cursor-pointer"
                style={{
                  marginLeft: -160,
                  marginTop: -110,
                  x: dx,
                  y: dy,
                  zIndex: isHover ? 40 : n - i,
                  transformStyle: "preserve-3d",
                }}
                initial={
                  reduce
                    ? false
                    : { opacity: 0, x: dx + 160, y: dy - 120 }
                }
                whileInView={{ opacity: 1, x: dx, y: dy }}
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
                  className="aspect-[16/11] w-full overflow-hidden rounded-xl"
                  animate={
                    reduce
                      ? undefined
                      : isHover
                        ? {
                            rotateY: -4,
                            rotateX: 1,
                            scale: 1.16,
                            boxShadow: "0 42px 90px rgba(16,27,188,0.42)",
                          }
                        : {
                            ...TILT,
                            scale: 1,
                            boxShadow: "0 24px 60px rgba(26,25,19,0.22)",
                          }
                  }
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: `radial-gradient(ellipse 90% 80% at ${x.glow}, rgba(249,247,241,0.16) 0%, transparent 55%), ${INK}`,
                    color: PAPER,
                    ...(reduce ? {} : TILT),
                  }}
                >
                  <div className="flex h-full flex-col justify-between p-6">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-70">
                      {x.tag}
                    </span>
                    <div>
                      <p
                        className="text-[26px] leading-tight"
                        style={{ fontFamily: "var(--font-peristiwa)" }}
                      >
                        {x.title}
                      </p>
                      {/* blurb + status reveal on pop, like the reference */}
                      <motion.div
                        animate={{ opacity: isHover ? 1 : 0 }}
                        transition={{ duration: 0.35 }}
                        className="mt-3"
                      >
                        <p className="text-[13px] leading-relaxed opacity-80">
                          {x.blurb}
                        </p>
                        <span className="mt-3 inline-block font-mono text-[9px] uppercase tracking-[0.3em] opacity-60">
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
