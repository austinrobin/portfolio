"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { ShowcaseItem } from "@/lib/showcase";
import { heroFonts, INK } from "./hero-config";

/* Smoothstep — flat near 0 and 1 so cards dwell in their resting states. */
const smooth = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

/*
 * Stack offset in % of card height. Reference (Beeyond rolodex): the queued
 * sheets fan up and back behind the featured card — each deeper sheet sits
 * a tight strip higher AND leans flatter, like pages draped over a bar.
 */
const stackYPct = (d: number) => {
  const dd = Math.min(d, 6);
  if (dd <= 1) return -58 * smooth(dd);
  return -(58 + 5 * (dd - 1));
};

/* Deeper sheets lean flatter: 62° for the next card, approaching ~86°. */
const stackAngle = (d: number) => Math.min(62 + Math.max(d - 1, 0) * 8, 86);

function DeckCard({
  item,
  index,
  p,
  onActivate,
}: {
  item: ShowcaseItem;
  index: number;
  p: MotionValue<number>;
  onActivate?: () => void;
}) {
  // t < 0: waiting in the fan · t 0→1: falling flat · t > 1: the mirrored floor
  const t = useTransform(p, (v) => v - index);

  const rotateX = useTransform(t, (v) => {
    if (v < 0) {
      const d = -v;
      // unfolds 62 -> 0 on approach; deeper sheets fan flatter behind
      return d <= 1 ? 62 * smooth(d) : stackAngle(d);
    }
    if (v <= 1) return -96 * smooth(v);
    return -96 - Math.min((v - 1) * 3, 4);
  });

  const y = useTransform(t, (v) => {
    if (v < 0) return `${stackYPct(-v)}%`;
    if (v <= 1) return `${8 * smooth(v)}%`;
    return `${8 + (v - 1) * 6}%`;
  });

  /* After landing the flat card keeps coming TOWARD the camera — that is
     what projects it down into the lower third as the mirrored floor
     (pushing y instead just shoves it out of the stage). */
  const z = useTransform(t, (v) => {
    if (v < 0) return -60 * Math.min(-v, 6);
    if (v <= 1) return 60 * smooth(v);
    return 60 + (v - 1) * 70;
  });

  const opacity = useTransform(t, (v) => {
    if (v <= -5.5) return 0;
    if (v < -4.5) return v + 5.5; // fade in deep in the fan
    // the mirrored floor HOLDS for a full step, then yields to the next
    if (v <= 1.9) return 1;
    if (v < 2.35) return 1 - (v - 1.9) / 0.45;
    return 0;
  });

  return (
    <motion.div
      className="absolute inset-0 [transform-style:preserve-3d] will-change-transform"
      style={{ rotateX, y, z, opacity, transformOrigin: "50% 100%" }}
    >
      <div
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-[0_30px_80px_rgba(26,25,19,0.22)]"
        style={{ background: item.theme.bg }}
        onClick={onActivate}
      >
        {item.cover ? (
          <Image
            src={item.cover}
            alt={item.title}
            fill
            sizes="(max-width: 860px) 92vw, 780px"
            className="object-cover"
          />
        ) : (
          <PlaceholderCover item={item} />
        )}
      </div>
    </motion.div>
  );
}

/* Styled stand-in until real project visuals land (item.cover). */
function PlaceholderCover({ item }: { item: ShowcaseItem }) {
  return (
    <div
      className="relative flex h-full w-full flex-col justify-between p-7"
      style={{
        background: `radial-gradient(ellipse 90% 70% at 50% 0%, ${item.theme.accent}22 0%, transparent 60%), ${item.theme.bg}`,
        color: item.theme.fg,
      }}
    >
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
        <span>{item.year}</span>
        <span>Replace with cover</span>
      </div>
      <div>
        <p
          className="text-4xl font-extrabold tracking-tight sm:text-6xl"
          style={{ color: item.theme.accent }}
        >
          {item.title}
        </p>
        <p className="mt-2 text-sm opacity-70 sm:text-base">{item.subtitle}</p>
      </div>
      <div
        className="h-1 w-16 rounded-full"
        style={{ background: item.theme.accent }}
      />
    </div>
  );
}

export function ProjectDeck({ items }: { items: ShowcaseItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const n = items.length;

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  const p = useTransform(scrollYProgress, (v) => v * (n - 1));

  /* Entrance choreography, complete BEFORE the section top pins: while the
     section rides up from the viewport bottom, the big script is the
     highlight; the folder then rises into place over it as the script
     recedes to 16%, and the project title fades up once the folder lands. */
  const { scrollYProgress: approach } = useScroll({
    target: wrapRef,
    offset: ["start end", "start start"],
  });
  const titleOpacity = useTransform(approach, [0, 0.8], [1, 0]);
  const deckY = useTransform(approach, [0.35, 0.9], ["26svh", "0svh"]);
  const capOpacity = useTransform(approach, [0.72, 0.92], [0, 1]);

  useMotionValueEvent(p, "change", (v) => {
    const idx = Math.min(Math.max(Math.round(v), 0), n - 1);
    if (idx !== active) setActive(idx);
  });

  const fontVars = `${heroFonts.silk.variable} ${heroFonts.peristiwa.variable}`;

  /* Reduced motion: a simple, honest list — no pinning, no 3D. */
  if (reduce) {
    return (
      <div className={fontVars}>
        <p
          className="px-6 pb-10 text-center text-[clamp(48px,9vw,140px)] leading-none"
          style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
        >
          Select Works
        </p>
        <div className="space-y-6">
          {items.map((item) => (
            <CardShellStatic key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }

  const current = items[active];

  return (
    <div ref={wrapRef} className={fontVars} style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden">
        {/* The section's name — a huge script watermark. Starts as the
            highlight, recedes behind the folder as it lands. */}
        <motion.p
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[27svh] z-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[clamp(77px,15vw,240px)] leading-none"
          style={{
            fontFamily: "var(--font-peristiwa)",
            color: INK,
            opacity: titleOpacity,
          }}
        >
          Select Works
        </motion.p>

        {/* Project name + details, inked like the design */}
        <motion.div
          className="relative z-10 mb-[60px] flex w-[min(92vw,990px)] items-end justify-between gap-4"
          style={{ opacity: capOpacity, color: INK }}
        >
          <div className="min-w-0">
            <p
              className="truncate text-[clamp(26px,2.54vw,38px)] font-bold uppercase tracking-[0.04em]"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {current.title}
            </p>
            <p
              className="mt-1 truncate text-[clamp(26px,2.54vw,38px)] leading-tight"
              style={{ fontFamily: "var(--font-peristiwa)" }}
            >
              {current.subtitle}
            </p>
          </div>
          {current.href ? (
            <Link
              href={current.href}
              className="shrink-0 rounded-full border border-[#101BBC]/35 px-4 py-2 text-sm transition-colors hover:bg-[#101BBC]/5"
            >
              View case study →
            </Link>
          ) : (
            <span className="shrink-0 rounded-full border border-[#101BBC]/25 px-4 py-2 font-mono text-[11px] uppercase tracking-wider opacity-70">
              Coming soon
            </span>
          )}
        </motion.div>

        {/* 3D stage — the works folder; rises into place over the script */}
        <motion.div
          className="z-10 w-[min(92vw,990px)]"
          style={{ perspective: 1050, perspectiveOrigin: "50% 16%", y: deckY }}
        >
          <div className="relative aspect-[16/10] [transform-style:preserve-3d]">
            {items.map((item, i) => (
              <DeckCard key={item.id} item={item} index={i} p={p} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CardShellStatic({ item }: { item: ShowcaseItem }) {
  const inner = (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="relative aspect-[16/10]">
        {item.cover ? (
          <Image src={item.cover} alt={item.title} fill className="object-cover" />
        ) : (
          <PlaceholderCover item={item} />
        )}
      </div>
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
