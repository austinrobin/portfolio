"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { pickVideoSources, type VideoSource } from "@/lib/video-sources";
import { mediaUrl } from "@/lib/media-url";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { usePinned, useScrollProgress } from "@/lib/scroll-progress";
import type { ShowcaseItem } from "@/lib/showcase";
import { heroFonts, INK } from "./hero-config";
import { caseFont } from "@/components/case-study/case-font";
import { useRouter } from "next/navigation";

/* Smoothstep — flat near 0 and 1 so cards dwell in their resting states. */
const smooth = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

/*
 * Geometry, re-studied against the Beeyond rolodex reference (2026-09-14):
 * one distant, elevated camera (long perspective, origin above the deck);
 * the featured sheet stands leaning back so its top edge reads narrower;
 * the queue stands behind it at the same lean, each sheet a step higher
 * and a step deeper, so the top strips of the next four or five sheets show
 * in the space above the featured one; a sheet that has been read falls
 * forward past flat and lies on the floor in front, mirrored, holding for
 * a step while the next one is read.
 */
const LEAN = 22; // deg — the standing sheets' lean back
const STEP_UP = 4; // % of card height per queued sheet
const STEP_BACK = 130; // px deeper per queued sheet (the camera distance scales with the sheet: 2.7× its width)
const FLOOR = -80; // deg — fallen, tilted a touch away, so the whole floor sheet stays inside the stage

function DeckCard({
  item,
  index,
  p,
  onActivate,
  playing = true,
}: {
  item: ShowcaseItem;
  index: number;
  p: MotionValue<number>;
  onActivate?: () => void;
  /** featured sheet or its neighbours: the only ones whose reel runs */
  playing?: boolean;
}) {
  const router = useRouter();
  // t < 0: standing in the queue · t 0→1: falling forward · t > 1: the floor
  const t = useTransform(p, (v) => v - index);

  const rotateX = useTransform(t, (v) => {
    if (v <= 0) return LEAN; // queue and featured share one lean
    if (v <= 1) return LEAN + (FLOOR - LEAN) * smooth(v);
    return FLOOR;
  });

  const y = useTransform(t, (v) => {
    if (v < 0) return `${-STEP_UP * Math.min(-v, 6)}%`;
    return "0%";
  });

  const z = useTransform(t, (v) => {
    if (v < 0) return -STEP_BACK * Math.min(-v, 6);
    if (v <= 1) return 0;
    return (v - 1) * 40; // the floor creeps toward the camera as it waits
  });

  /* only the featured sheet takes the click: the fallen ones on the floor
     project over its lower half, and the queue is behind it */
  const pointerEvents = useTransform(t, (v) => (Math.abs(v) < 0.5 ? "auto" : "none"));

  const opacity = useTransform(t, (v) => {
    if (v <= -5.5) return 0;
    if (v < -4.5) return v + 5.5; // deep in the queue, sheets fade in
    // the floor holds under the next sheet's read, then yields as that one falls
    if (v <= 1.55) return 1;
    if (v < 2) return 1 - (v - 1.55) / 0.45;
    return 0;
  });

  return (
    <motion.div
      data-deck-card
      className="absolute inset-0 [transform-style:preserve-3d] will-change-transform"
      style={{ rotateX, y, z, opacity, pointerEvents, transformOrigin: "50% 100%" }}
    >
      <div
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-[0_12px_30px_rgba(26,25,19,0.2)] sm:shadow-[0_30px_80px_rgba(26,25,19,0.22)]"
        style={{ background: item.theme.bg }}
        onClick={() => { if (item.href) router.push(item.href); else onActivate?.(); }}
        aria-hidden
      >
        <Cover item={item} sizes="(max-width: 860px) 92vw, 1240px" playing={playing} />
      </div>
    </motion.div>
  );
}

/* A cover: a looping reel when the path is a video, a still otherwise.
   A reel is poster-only until the deck comes within a viewport of the
   screen, then attaches the lightest source the browser decodes (AV1 /
   HEVC / H.264) and plays muted on loop — the home page never downloads
   the reels ahead of the visitor reaching the folder. */
function Cover({ item, sizes, playing = true }: { item: ShowcaseItem; sizes: string; playing?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sources, setSources] = useState<VideoSource[] | null>(null);
  const isVideo = !!item.cover && item.cover.endsWith(".mp4");
  useEffect(() => {
    const el = ref.current;
    if (!el || !isVideo || !item.cover) return;
    // a phone downloads and decodes only the reel that is playing
    if (!playing && window.matchMedia("(max-width: 767px)").matches) return;
    const attach = () => setSources((s) => s ?? pickVideoSources(item.cover!));
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > -window.innerHeight) attach();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) attach();
      },
      { rootMargin: "60% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isVideo, item.cover, playing]);
  // the queue behind the featured sheet holds its poster — five reels
  // decoding at once is what made the folder stutter on laptops
  useEffect(() => {
    const el = ref.current;
    if (!sources || !el) return;
    if (el.readyState === 0) el.load();
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing, sources]);
  if (!item.cover) return <PlaceholderCover item={item} />;
  if (isVideo) {
    return (
      <video
        ref={ref}
        poster={sources && item.coverPoster ? mediaUrl(item.coverPoster) : undefined}
        muted
        loop
        playsInline
        preload={sources ? "metadata" : "none"}
        aria-label={item.title}
        className="absolute inset-0 h-full w-full object-cover"
      >
        {sources?.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
    );
  }
  return <Image src={item.cover} alt={item.title} fill sizes={sizes} className="object-cover" />;
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
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const n = items.length;
  /* a phone decodes one reel: the featured sheet's; laptops warm the neighbours too */
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* GSAP spine (ScrollTrigger progress + pin) — CSS sticky and motion's
     useScroll both break under ScrollSmoother; the choreography below is
     unchanged, it just reads a GSAP-fed MotionValue now. */
  const scrollYProgress = useScrollProgress(wrapRef, "top top", "bottom bottom");
  usePinned(wrapRef, stageRef);
  /* the last sheet holds for a tail of TAIL screens before the stage lets go,
     so it can be read and opened like the others */
  const TAIL = 0.6;
  const p = useTransform(scrollYProgress, (v) => Math.min(v * (n - 1 + TAIL), n - 1));

  /* Entrance choreography, complete BEFORE the section top pins: while the
     section rides up from the viewport bottom, the big script is the
     highlight; the folder then rises into place over it as the script
     recedes to 16%, and the project title fades up once the folder lands. */
  const approach = useScrollProgress(wrapRef, "top bottom", "top top");
  const titleOpacity = useTransform(approach, [0, 0.8], [1, 0]);
  const deckY = useTransform(approach, [0.35, 0.9], ["26svh", "0svh"]);
  const capOpacity = useTransform(approach, [0.72, 0.92], [0, 1]);
  /* The queue's strips shrink as sheets are read; the caption follows them
     down so it always sits just above the top strip rather than stranded at
     the headroom's top (1 strip = STEP_UP% of the sheet height = deck-w/1.6). */
  const capY = useTransform(p, (v) => {
    const remaining = Math.max(0, Math.min(n - 1 - v, 5));
    const empty = 5 - remaining; // strips of headroom with nothing in them
    // a strip projects to ~57% of its nominal height (lean + distance)
    return `calc(var(--deck-w) * ${((empty * STEP_UP * 0.57) / 100 / 1.6).toFixed(4)})`;
  });

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
    <div ref={wrapRef} className={fontVars} style={{ height: `${(n + 0.6) * 100}vh` }}>
      <div
        ref={stageRef}
        className="flex h-svh flex-col items-center justify-center overflow-hidden pt-[12svh]"
        style={{ ["--deck-w" as string]: "min(92vw, 1370px, calc((100svh - 160px) * 1.14))" }}
      >
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
          className="relative z-20 mb-[16px] flex w-[var(--deck-w)] flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
          style={{ opacity: capOpacity, color: INK, y: capY }}
        >
          <div className="min-w-0">
            <p
              className="truncate text-[clamp(28px,2.75vw,42px)] font-bold uppercase leading-none tracking-[0.04em]"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {current.title}
            </p>
            <p
              className={`mt-2 line-clamp-2 text-[clamp(14px,1.1vw,17px)] leading-snug opacity-70 sm:line-clamp-none sm:truncate ${caseFont.variable} font-[family-name:var(--font-case)]`}
            >
              {current.subtitle}
            </p>
          </div>
          {current.href ? (
            <Link
              href={current.href}
              className={`group inline-flex min-h-[44px] shrink-0 items-center gap-2.5 border border-[#101BBC] px-4 py-2 text-sm transition-colors hover:bg-[#101BBC] hover:text-[#F9F7F1] lg:min-h-0 ${caseFont.variable} font-[family-name:var(--font-case)]`}
            >
              View case study
              {/* a vintage swash arrow */}
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M1 6H18.5" />
                <path d="M13.5 1.5L18.5 6l-5 4.5" />
              </svg>
            </Link>
          ) : (
            <span className="shrink-0 border border-[#101BBC]/40 px-4 py-2 font-mono text-[11px] uppercase tracking-wider opacity-70">
              Coming soon
            </span>
          )}
        </motion.div>

        {/* 3D stage — the works folder; rises into place over the script.
            The box is the featured sheet; the strips take ~12% of its width
            above it and the floor projects ~39% of its height below (half of
            that is reserved so the composition centres on it), so the sheet
            is sized to the viewport with that headroom (max 1240px wide). */}
        {/* the box and its stage plane take no clicks: a sheet leaning back
            has its top half behind the stage's plane in 3D, and real input
            hit-testing would hand those clicks to the (transparent) stage.
            Only the featured sheet opts back in. */}
        <motion.div
          ref={boxRef}
          className="pointer-events-none relative z-10 w-[var(--deck-w)] pt-[calc(var(--deck-w)*0.078)] pb-[calc(var(--deck-w)*0.16)]"
          style={{ perspective: "calc(var(--deck-w) * 2.7)", perspectiveOrigin: "50% 0%", y: deckY }}
        >
          <ClickLayer boxRef={boxRef} href={current.href} title={current.title} />
          <div className="pointer-events-none relative aspect-[16/10] [transform-style:preserve-3d]">
            {items.map((item, i) => (
              <DeckCard key={item.id} item={item} index={i} p={p} playing={phone ? i === active : Math.abs(i - active) <= 1} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* A flat, invisible layer over the featured sheet's on-screen box. Every
   featured sheet shares one geometry (it stands at the same lean), so one
   measured rectangle serves them all; it opens whichever project is current.
   Browsers disagree on hit-testing inside a 3D stage; a 2D layer above it
   does not depend on any of that. */
function ClickLayer({ boxRef, href, title }: { boxRef: React.RefObject<HTMLDivElement | null>; href?: string; title: string }) {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useEffect(() => {
    const host = boxRef.current;
    if (!host) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // the featured sheet is the one taking pointer events; at rest they all stand at the same lean
        const card = host.querySelector<HTMLElement>('[data-deck-card][style*="pointer-events: auto"] > div') ?? host.querySelector<HTMLElement>("[data-deck-card] > div");
        const hr = host.getBoundingClientRect();
        const r = card?.getBoundingClientRect();
        if (!r || r.width < 40) return;
        setBox({ left: r.left - hr.left, top: r.top - hr.top, width: r.width, height: r.height });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [boxRef]);
  if (!box || !href) return null;
  // a real link: every browser knows what to do with one, and so do middle-clicks
  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      data-deck-click
      data-track="case_open"
      data-track-label={title}
      className="pointer-events-auto absolute z-30 block cursor-pointer"
      style={box}
    />
  );
}

function CardShellStatic({ item }: { item: ShowcaseItem }) {
  const inner = (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="relative aspect-[16/10]">
        <Cover item={item} sizes="100vw" />
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
