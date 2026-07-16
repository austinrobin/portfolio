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

/* Smoothstep — flat near 0 and 1 so cards dwell in their resting states. */
const smooth = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

/*
 * Stack offset in % of card height. A card leaning back 62° projects to
 * ~cos(62°) ≈ 47% of its height, so to make each queued card peek above the
 * one in front of it, its bottom edge must rise by ~(1 - cos62°) of a card
 * plus a visible strip (~5%) per extra depth.
 */
const stackYPct = (d: number) => {
  const dd = Math.min(d, 6);
  if (dd <= 1) return -58 * smooth(dd);
  return -(58 + 5.5 * (dd - 1));
};

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
  // t < 0: waiting in the stack · t 0→1: falling to the floor · t > 1: on the floor
  const t = useTransform(p, (v) => v - index);

  const rotateX = useTransform(t, (v) => {
    if (v <= -1) return 62;
    if (v < 0) return 62 * smooth(-v);
    if (v <= 1) return -95 * smooth(v);
    return -95 - Math.min((v - 1) * 4, 6);
  });

  const y = useTransform(t, (v) => {
    if (v < 0) return `${stackYPct(-v)}%`;
    if (v <= 1) return `${9 * smooth(v)}%`;
    return `${9 + (v - 1) * 7}%`;
  });

  const z = useTransform(t, (v) => {
    if (v < 0) return -60 * Math.min(-v, 6);
    if (v <= 1) return 36 * smooth(v);
    return 36 - (v - 1) * 60;
  });

  const opacity = useTransform(t, (v) => {
    if (v <= -5.5) return 0;
    if (v < -4.5) return v + 5.5; // fade in deep stack
    if (v <= 1.15) return 1;
    if (v < 2.2) return 1 - (v - 1.15) / 1.05; // fade out on the floor
    return 0;
  });

  return (
    <motion.div
      className="absolute inset-0 [transform-style:preserve-3d] will-change-transform"
      style={{ rotateX, y, z, opacity, transformOrigin: "50% 100%" }}
    >
      <div
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-lg border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
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

  useMotionValueEvent(p, "change", (v) => {
    const idx = Math.min(Math.max(Math.round(v), 0), n - 1);
    if (idx !== active) setActive(idx);
  });

  /* Reduced motion: a simple, honest list — no pinning, no 3D. */
  if (reduce) {
    return (
      <div className="space-y-6">
        {items.map((item) => (
          <CardShellStatic key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const current = items[active];

  return (
    <div ref={wrapRef} style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden">
        {/* 3D stage */}
        <div
          className="w-[min(88vw,760px)]"
          style={{ perspective: 1300, perspectiveOrigin: "50% 16%" }}
        >
          <div className="relative aspect-[16/10] [transform-style:preserve-3d]">
            {items.map((item, i) => (
              <DeckCard key={item.id} item={item} index={i} p={p} />
            ))}
          </div>
        </div>

        {/* Caption row — z-lifted so falling cards sweep behind it */}
        <div className="relative z-10 mt-10 flex w-[min(88vw,760px)] items-end justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="truncate text-xl font-semibold tracking-tight text-white">
                {current.title}
              </p>
              <p className="hidden truncate text-sm text-white/50 sm:block">
                {current.subtitle}
              </p>
            </div>
          </div>
          {current.href ? (
            <Link
              href={current.href}
              className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
            >
              View case study →
            </Link>
          ) : (
            <span className="shrink-0 rounded-full border border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white/40">
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardShellStatic({ item }: { item: ShowcaseItem }) {
  const inner = (
    <div className="overflow-hidden rounded-lg border border-white/10">
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
