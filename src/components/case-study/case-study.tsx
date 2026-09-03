"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CaseMedia, CaseStudy } from "@/lib/case-studies";
import { BanknoteNav } from "@/components/banknote-nav";
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
}: {
  media: CaseMedia;
  className: string;
  loop?: boolean;
}) {
  const common = {
    className,
    poster: media.poster,
    autoPlay: true,
    muted: true,
    playsInline: true,
    preload: "metadata" as const,
  };
  if (!media.srcFallback) {
    return <video {...common} src={media.src} loop={loop} />;
  }
  return (
    <video {...common} loop={loop}>
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
    if (b === "primary") {
      rows.push({ type: "primary", items: [m] });
      i += 1;
    } else if (b === "secondary") {
      if (n1 && blockOf(n1) === "secondary") {
        rows.push({ type: "pair", items: [m, n1] });
        i += 2;
      } else if (n1 && n2 && blockOf(n1) === "tertiary" && blockOf(n2) === "tertiary") {
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

function Tile({
  media,
  alt,
  frame,
  loop = true,
  eager = false,
  className = "",
}: {
  media: CaseMedia;
  alt: string;
  /** a fixed frame, or "fill" to take the height the row gives it */
  frame: keyof typeof FRAME | "fill";
  loop?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative overflow-hidden rounded-[10px] bg-subtle ${frame === "fill" ? "h-full min-h-0" : ""} ${className}`}
      style={frame === "fill" ? undefined : { aspectRatio: FRAME[frame] }}
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
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- assets are
             optimised on entry (studio-compressed or hand-encoded) */
          <img
            src={media.src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>{alt}</span>
          <span>media slot — add in studio</span>
        </div>
      )}
    </motion.div>
  );
}

function River({ media, alt }: { media: CaseMedia[]; alt: string }) {
  if (!media.length) return null;
  const rows = rowsOf(media);
  return (
    <div className="mt-10 flex flex-col gap-2 sm:mt-12">
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
              <Tile media={row.items[0]} alt={row.items[0].caption || alt} frame={blockOf(row.items[0]) === "tertiary" ? "tertiary" : "secondary"} />
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
    <section id={id} data-chapter={id} className="scroll-mt-[12svh] pt-20 sm:pt-28">
      <Rise className="max-w-[50ch]">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
          {kicker}
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,1.8vw,26px)] font-light leading-[1.18] tracking-[-0.01em]">
          {heading}
        </h2>
        {body?.length ? (
          <div className="mt-5 space-y-3 text-[14.5px] leading-[1.45] text-muted sm:text-[15px]">
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}
        {statement ? (
          <p className="mt-6 text-[clamp(18px,1.45vw,22px)] font-light leading-[1.25] tracking-[-0.01em]">
            {statement}
          </p>
        ) : null}
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
      className={horizontal ? "flex gap-x-5 overflow-x-auto pb-1" : "flex flex-col gap-y-3"}
    >
      {chapters.map((c) => {
        const on = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onJump(c.id)}
            className={`group relative whitespace-nowrap text-left text-[15px] font-light leading-none transition-colors sm:text-[16px] ${
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
      });
      return () => mm.revert();
    },
    { dependencies: [cs.slug] },
  );

  const chapters = [
    ...cs.sections.map((s) => ({ id: s.id, label: s.kicker })),
    { id: "impact", label: "In numbers" },
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
      <BanknoteNav />

      <div
        ref={rowRef}
        className="flex gap-x-[clamp(12px,1.6vw,32px)] px-[clamp(8px,1.1vw,22px)] pb-28 pt-[13svh]"
      >
        {/* ---- left panel (pinned for the article's whole run) ---- */}
        <aside className="hidden w-[296px] shrink-0 md:block lg:w-[316px]">
          <div ref={panelRef}>
            <h1 className="text-[24px] font-light leading-[1.2] tracking-[-0.01em]">
              {cs.title}
            </h1>
            <p className="mt-1 text-[24px] font-light leading-[1.2] tracking-[-0.01em] text-muted">
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
          <div className="mb-8 md:hidden">
            <h1 className="text-[22px] font-light leading-[1.2]">{cs.title}</h1>
            <p className="mt-1 text-[22px] font-light leading-[1.2] text-muted">
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

          {/* ---- in numbers ---- */}
          <Chapter id="impact" kicker="In numbers" heading={cs.impact.title}>
            <Rise className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-border pt-10 sm:mt-12 md:grid-cols-3">
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
