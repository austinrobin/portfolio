"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CaseMedia, CaseStudy } from "@/lib/case-studies";
import Link from "next/link";
import { BanknoteNav } from "@/components/banknote-nav";
import { Monogram } from "@/components/home/monogram";
import { gsap, ScrollSmoother, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { caseFont } from "./case-font";
import { heroFonts } from "@/components/home/hero-config";

/*
 * Case-study view — the Koto model (reference: koto.com/projects/amazon):
 *
 *  · A fixed LEFT PANEL carries the project's identity — title, one-line
 *    tagline, meta — and a chapter index that tracks the scroll (the
 *    active chapter lights up with a dot) and jumps on click.
 *  · The RIGHT COLUMN is a continuous river of media on Austin's block
 *    system (primary full row · secondary half · tertiary halves stacked
 *    beside a secondary, 8px gutters). Chapter copy sits in the flow — a
 *    small uppercase kicker, a light heading, quiet grey body.
 *  · On the site's own paper — the home page's canvas — with ink type; the
 *    media do the talking. The left panel is PINNED with ScrollTrigger:
 *    position:sticky is dead under ScrollSmoother's transform.
 *
 * Content is untouched: sections / media / impact / result from the
 * Studio-edited JSON; `span` + `w/h` shape the river, `showcase`/`layout`
 * are ignored here (the previous Fantasy layout is tagged
 * checkpoint-case-fantasy).
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------- helpers */

function Rise({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function VideoSources({
  media,
  className,
  loop = true,
  style,
}: {
  media: CaseMedia;
  className: string;
  loop?: boolean;
  style?: React.CSSProperties;
}) {
  /* Lazy: a case page can carry 15MB+ of video, and autoplay makes browsers
     fetch every file on mount regardless of preload. Sources attach only
     when the tile comes within a viewport of the screen; playback follows
     visibility so off-screen loops don't burn CPU. */
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // synchronous first check — the observer's initial callback waits for a
    // rendering frame, so a tile already within a viewport attaches at once
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 2 && r.bottom > -window.innerHeight) setNear(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setNear(true);
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (near && ref.current) ref.current.load();
  }, [near]);
  const common = {
    ref,
    className,
    style,
    poster: media.poster,
    muted: true,
    playsInline: true,
    preload: "none" as const,
    loop,
  };
  if (!near) return <video {...common} />;
  if (!media.srcFallback) {
    return <video {...common} autoPlay src={media.src} />;
  }
  return (
    <video {...common} autoPlay>
      <source src={media.src} type="video/webm" />
      <source src={media.srcFallback} type="video/mp4" />
    </video>
  );
}

/* ---------------------------------------------------------- media river */

/* Austin's block system — three blocks, one rule:
     primary   1342 × 755   full row
     secondary  667 × 834   half
     tertiary   667 × 413   half, only as a stacked pair beside a secondary
   Gutter 8px (667 + 8 + 667 = 1342; 413 + 8 + 413 = 834). Consecutive items
   group into rows: [S,S] → pair, [S,T,T] → secondary left, [T,T,S] →
   secondary right, P → alone. Anything that doesn't fit falls back to a
   lone half so nothing disappears. */

type Block = NonNullable<CaseMedia["block"]>;
const blockOf = (m: CaseMedia): Block => m.block ?? "primary";
/* a custom block behaves like a primary (full row) or a secondary (half)
   for row-building, with its own ratio */
const isFull = (m: CaseMedia) => blockOf(m) === "primary" || (blockOf(m) === "custom" && (m.cols ?? 1) === 1);
const isHalf = (m: CaseMedia) => blockOf(m) === "secondary" || (blockOf(m) === "custom" && m.cols === 2);

type Row =
  | { type: "primary"; items: [CaseMedia] }
  | { type: "pair"; items: [CaseMedia, CaseMedia] }
  | { type: "trio"; secondary: CaseMedia; tertiaries: [CaseMedia, CaseMedia]; secondaryLeft: boolean }
  | { type: "half"; items: [CaseMedia] };

function rowsOf(media: CaseMedia[]): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < media.length) {
    const m = media[i];
    const b = blockOf(m);
    const n1 = media[i + 1];
    const n2 = media[i + 2];
    if (isFull(m)) {
      rows.push({ type: "primary", items: [m] });
      i += 1;
    } else if (isHalf(m)) {
      if (n1 && isHalf(n1)) {
        rows.push({ type: "pair", items: [m, n1] });
        i += 2;
      } else if (b === "secondary" && n1 && n2 && blockOf(n1) === "tertiary" && blockOf(n2) === "tertiary") {
        rows.push({ type: "trio", secondary: m, tertiaries: [n1, n2], secondaryLeft: true });
        i += 3;
      } else {
        rows.push({ type: "half", items: [m] });
        i += 1;
      }
    } else {
      if (n1 && n2 && blockOf(n1) === "tertiary" && blockOf(n2) === "secondary") {
        rows.push({ type: "trio", secondary: n2, tertiaries: [m, n1], secondaryLeft: false });
        i += 3;
      } else {
        rows.push({ type: "half", items: [m] });
        i += 1;
      }
    }
  }
  return rows;
}

const FRAME = { primary: 1342 / 755, secondary: 667 / 834, tertiary: 667 / 413 };
/* the frame an asset takes: its preset, or its own ratio when custom */
function frameRatio(m: CaseMedia, fallback: keyof typeof FRAME) {
  if (blockOf(m) === "custom") return m.ratio && m.ratio > 0 ? m.ratio : 1.5; // Studio's default too
  return FRAME[blockOf(m) as keyof typeof FRAME] ?? FRAME[fallback];
}
const focus = (m: CaseMedia) => `${m.focusX ?? 50}% ${m.focusY ?? 50}%`;
/* zoom scales the cover-fit asset around its focal point; the frame clips */
const fit = (m: CaseMedia): React.CSSProperties => {
  const z = m.zoom ?? 1;
  const pos = focus(m);
  return z === 1
    ? { objectPosition: pos }
    : { objectPosition: pos, transform: `scale(${z})`, transformOrigin: pos };
};

function Tile({
  media,
  alt,
  frame,
  loop = true,
  eager = false,
  className = "",
  fadeTop = false,
}: {
  media: CaseMedia;
  alt: string;
  /** the role in its row (sets the preset frame), or "fill" to take the
      height the row gives it; a custom asset overrides the ratio */
  frame: keyof typeof FRAME | "fill";
  loop?: boolean;
  eager?: boolean;
  className?: string;
  /** the hero sits under the nav: its top fades up from paper so the ink
      links read over any image */
  fadeTop?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative overflow-hidden rounded-[10px] bg-subtle ${frame === "fill" ? "h-full min-h-0" : ""} ${className}`}
      style={frame === "fill" ? undefined : { aspectRatio: frameRatio(media, frame) }}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6%" }}
      transition={{ duration: 0.85, ease: EASE }}
    >
      {media.src ? (
        media.kind === "video" ? (
          <VideoSources
            media={media}
            loop={loop}
            className="absolute inset-0 h-full w-full object-cover"
            style={fit(media)}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- assets are
             optimised on entry (studio-compressed or hand-encoded) */
          <img
            src={media.src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover"
            style={fit(media)}
          />
        )
      ) : (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>{alt}</span>
          <span>media slot — add in studio</span>
        </div>
      )}
      {fadeTop ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[16svh]"
          style={{
            background:
              "linear-gradient(to bottom, var(--background) 0%, color-mix(in srgb, var(--background) 70%, transparent) 45%, transparent 100%)",
          }}
        />
      ) : null}
    </motion.div>
  );
}

function River({ media, alt }: { media: CaseMedia[]; alt: string }) {
  if (!media.length) return null;
  const rows = rowsOf(media);
  return (
    <div className="mt-[35px] flex flex-col gap-2 sm:mt-10">
      {rows.map((row, r) => {
        if (row.type === "primary") {
          return <Tile key={r} media={row.items[0]} alt={row.items[0].caption || alt} frame="primary" />;
        }
        if (row.type === "pair") {
          return (
            <div key={r} className="grid grid-cols-2 gap-2">
              {row.items.map((m, i) => (
                <Tile key={i} media={m} alt={m.caption || alt} frame="secondary" />
              ))}
            </div>
          );
        }
        if (row.type === "half") {
          return (
            <div key={r} className="grid grid-cols-2 gap-2">
              <Tile
                media={row.items[0]}
                alt={row.items[0].caption || alt}
                frame={blockOf(row.items[0]) === "tertiary" ? "tertiary" : "secondary"}
              />
            </div>
          );
        }
        /* trio: the secondary sets the row's height; the two tertiaries split
           it with the same 8px gutter, so their edges always meet */
        return (
          <div key={r} className="grid grid-cols-2 grid-rows-2 gap-2">
            {/* every cell is placed explicitly — auto-placement would push
                the second tertiary into a phantom third row when the
                secondary sits on the right */}
            <Tile
              media={row.secondary}
              alt={row.secondary.caption || alt}
              frame="secondary"
              className={`row-start-1 row-span-2 ${row.secondaryLeft ? "col-start-1" : "col-start-2"}`}
            />
            {row.tertiaries.map((m, i) => (
              <Tile
                key={i}
                media={m}
                alt={m.caption || alt}
                frame="fill"
                className={`${i === 0 ? "row-start-1" : "row-start-2"} ${row.secondaryLeft ? "col-start-2" : "col-start-1"}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- chapter */

function Chapter({
  id,
  kicker,
  heading,
  body,
  statement,
  children,
}: {
  id: string;
  kicker: string;
  heading: string;
  body?: string[];
  statement?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-chapter={id}
      className="mt-2 scroll-mt-[12svh] border-t border-border pt-6 sm:mt-2 sm:pt-6"
    >
      {/* a hairline opens the chapter; only its name sits on the left — the
          heading and copy are one block pushed to the viewport's right edge */}
      <Rise className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted md:pt-1.5">
          {kicker}
        </p>
        <div className="max-w-[50ch] md:justify-self-end">
          <h2 className="text-[clamp(21px,1.8vw,26px)] font-light leading-[1.18] tracking-[-0.01em]">
            {heading}
          </h2>
          {body?.length ? (
            <div className="mt-4 space-y-2 text-[14.5px] leading-[1.45] text-muted sm:text-[15px]">
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}
          {statement ? (
            <p className="mt-5 text-[clamp(18px,1.45vw,22px)] font-light leading-[1.25] tracking-[-0.01em]">
              {statement}
            </p>
          ) : null}
        </div>
      </Rise>
      {children}
    </section>
  );
}

/* --------------------------------------------------------- chapter index */

function ChapterIndex({
  chapters,
  active,
  onJump,
  horizontal = false,
}: {
  chapters: { id: string; label: string }[];
  active: string;
  onJump: (id: string) => void;
  horizontal?: boolean;
}) {
  return (
    <nav
      aria-label="Chapters"
      className={horizontal ? "flex gap-x-5 overflow-x-auto pb-1" : "flex flex-col gap-y-[18px]"}
    >
      {chapters.map((c) => {
        const on = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onJump(c.id)}
            className={`group relative whitespace-nowrap text-left text-[14px] font-medium leading-none transition-colors sm:text-[15px] ${
              on ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {!horizontal ? (
              <span
                aria-hidden
                className={`absolute -left-3.5 top-1/2 size-1 -translate-y-1/2 rounded-full bg-foreground transition-opacity ${
                  on ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : null}
            {c.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ----------------------------------------------------------------- view */

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  const rootRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const monoRef = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string>(cs.sections[0]?.id ?? "");

  /* pin the panel from 12% down the viewport until the river runs out —
     desktop only (the aside is hidden below md) */
  useGSAP(
    () => {
      const row = rowRef.current;
      const panel = panelRef.current;
      if (!row || !panel) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        ScrollTrigger.create({
          trigger: panel,
          start: "top 12%",
          endTrigger: row,
          end: "bottom bottom",
          pin: panel,
          pinSpacing: false,
        });

        /* NAV CHOREOGRAPHY — scrolling down: the banknote nav slides up and
           away while the monogram slides in from the left to sit above the
           title, at the nav's own level, still the way home. Scrolling up
           (or back at the top): it all reverses. */
        const mono = monoRef.current;
        if (!mono || reduce) return;
        const nav = () => document.querySelector<HTMLElement>("[data-banknote-nav]");
        gsap.set(mono, { x: -40, autoAlpha: 0 });
        let tucked = false;
        const tuck = () => {
          if (tucked) return;
          tucked = true;
          const n = nav();
          /* the header itself is 0px tall (its links are absolute), so a
             percentage slide moves nothing — travel a viewport distance */
          if (n) gsap.to(n, { y: "-16vh", duration: 0.5, ease: "power2.inOut", overwrite: true });
          gsap.to(mono, { x: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out", overwrite: true });
        };
        const restore = () => {
          if (!tucked) return;
          tucked = false;
          const n = nav();
          if (n) gsap.to(n, { y: 0, duration: 0.5, ease: "power2.out", overwrite: true });
          gsap.to(mono, { x: -40, autoAlpha: 0, duration: 0.4, ease: "power2.in", overwrite: true });
        };
        /* hysteresis: inertia can end with a micro-reversal that would read
           as "scrolling up" — the nav only reacts to real travel */
        let lastY = 0;
        let down = 0;
        let up = 0;
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            const y = self.scroll();
            const dy = y - lastY;
            lastY = y;
            if (y < 40) {
              down = up = 0;
              restore();
              return;
            }
            if (dy > 0) {
              up = 0;
              down += dy;
              if (down > 40) tuck();
            } else if (dy < 0) {
              down = 0;
              up -= dy;
              if (up > 28) restore();
            }
          },
        });
        if (process.env.NODE_ENV === "development") {
          (window as Window & { __caseNav?: { tuck: () => void; restore: () => void } }).__caseNav = {
            tuck,
            restore,
          };
        }
      });
      return () => mm.revert();
    },
    { dependencies: [cs.slug, reduce] },
  );

  const chapters = [
    ...cs.sections.map((s) => ({ id: s.id, label: s.kicker })),
    ...(cs.impact.stats.length > 0 ? [{ id: "impact", label: "In numbers" }] : []),
    { id: "result", label: "Outcome" },
  ];

  /* the index follows the scroll: whichever chapter owns the upper third
     of the viewport is the active one */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = root.querySelectorAll<HTMLElement>("[data-chapter]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.getAttribute("data-chapter") ?? "");
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [cs.slug]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.scrollTo(el, true, "top 12%");
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const meta = [cs.tags[0], cs.year].filter(Boolean).join(" · ");

  return (
    <article
      ref={rootRef}
      className={`relative min-h-screen bg-background text-foreground ${caseFont.variable} ${heroFonts.silk.variable} font-[family-name:var(--font-case)]`}
    >
      <BanknoteNav blend fixed />

      <div
        ref={rowRef}
        className="flex gap-x-[clamp(12px,1.6vw,32px)] px-[clamp(8px,1.1vw,22px)] pb-28 pt-[clamp(8px,1.1vw,22px)]"
      >
        {/* ---- left panel (pinned for the article's whole run) ---- */}
        <aside className="hidden w-[296px] shrink-0 pt-[13svh] md:block lg:w-[316px]">
          <div ref={panelRef} className="relative">
            {/* the home monogram, at the nav's level, revealed once the nav tucks away */}
            <Link
              ref={monoRef}
              href="/"
              aria-label="Austin Moras — home"
              className="absolute left-0 top-[-8.4svh] block h-[6.2svh] min-h-10 opacity-0"
            >
              <Monogram className="h-full w-auto" />
            </Link>
            <h1
              className="text-[26px] font-medium uppercase leading-none tracking-[0.02em]"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {cs.title}
            </h1>
            <p className="mt-1 text-[19px] font-medium leading-[1.25] tracking-[-0.01em] text-muted">
              {cs.tagline}
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {meta}
            </p>
            <div className="mt-12 pl-3.5">
              <ChapterIndex chapters={chapters} active={active} onJump={jump} />
            </div>
          </div>
        </aside>

        {/* ---- media river ---- */}
        <div className="min-w-0 flex-1">
          {/* narrow screens: identity + index above the river */}
          <div className="mb-8 pt-[12svh] md:hidden">
            <h1
              className="text-[22px] font-medium uppercase leading-none tracking-[0.02em]"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {cs.title}
            </h1>
            <p className="mt-1 text-[18px] font-medium leading-[1.25] text-muted">
              {cs.tagline}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {meta}
            </p>
            <div className="mt-6">
              <ChapterIndex chapters={chapters} active={active} onJump={jump} horizontal />
            </div>
          </div>

          {cs.heroMedia?.src ? (
            <Tile media={cs.heroMedia} alt={cs.title} frame="primary" loop={false} eager />
          ) : null}

          {cs.sections.map((s) => (
            <Chapter
              key={s.id}
              id={s.id}
              kicker={s.kicker}
              heading={s.heading}
              body={s.body}
              statement={s.statement}
            >
              <River media={s.media} alt={s.kicker} />
            </Chapter>
          ))}

          {/* ---- in numbers — only when the case has stats ---- */}
          {cs.impact.stats.length > 0 ? (
          <Chapter id="impact" kicker="In numbers" heading={cs.impact.title}>
            <Rise className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:mt-[50px] md:grid-cols-3">
              {cs.impact.stats.map((stat, i) => {
                const placeholder = /^x+$/i.test(stat.value.replace(/[^a-z]/gi, ""));
                return (
                  <div key={i}>
                    <p
                      className={`text-[clamp(40px,4.2vw,64px)] font-light leading-none tracking-[-0.03em] ${
                        placeholder ? "text-muted" : ""
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-3 max-w-[26ch] text-[14px] leading-snug text-muted">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </Rise>
          </Chapter>
          ) : null}

          {/* ---- outcome ---- */}
          <Chapter
            id="result"
            kicker="Outcome"
            heading={cs.result.heading}
            body={cs.result.body}
            statement={cs.result.statement}
          />
        </div>
      </div>
    </article>
  );
}
