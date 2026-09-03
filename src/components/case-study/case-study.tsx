"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { usePinned, useScrollProgress } from "@/lib/scroll-progress";
import type { CaseMedia, CaseSection, CaseStudy } from "@/lib/case-studies";
import { BanknoteNav } from "@/components/banknote-nav";
import { caseFont } from "./case-font";
import { heroFonts } from "@/components/home/hero-config";

/*
 * Case-study view — the Fantasy language (reference:
 * fantasy.co/services/product-innovation + Austin's interaction capture):
 *
 *  · COLOUR ZONES — the page's own background morphs as you cross sections
 *    (paper → StockBee dark → paper). Implemented by animating the site's
 *    CSS variables on the article, so every token-driven utility inside
 *    (text-muted, border-border…) recolours with the zone in one motion.
 *  · WORD-FILL HEADLINES — big text starts ghosted + blurred and fills
 *    word by word, scroll-linked (scrub back and it un-fills).
 *  · Media bands settle with parallax + a slight perspective tilt; in dark
 *    zones they run edge-to-edge like the reference's immersive chapters.
 *  · Numbered chapters, sparse type, generous air.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

interface Zone {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  subtle: string;
}

const PAPER: Zone = {
  bg: "#f9f7f1",
  fg: "#1a1913",
  muted: "#6b675c",
  border: "#e4e0d2",
  subtle: "#f1eee4",
};

const STOCKBEE_DARK: Zone = {
  bg: "#060906",
  fg: "#E8F2E8",
  muted: "#93A093",
  border: "rgba(232,242,232,0.16)",
  subtle: "rgba(232,242,232,0.07)",
};

/** Sections that pull the page into StockBee's own environment. */
/* Dark zones are the pinned-showcase chapters — derived per case study,
   never hardcoded to one project's section ids. */
const darkSectionIds = (cs: CaseStudy) =>
  new Set(cs.sections.filter((s) => s.showcase).map((s) => s.id));

/* ------------------------------------------------------------- reveals */

function Rise({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* Scroll-linked word fill: each word ramps opacity + sheds blur across its
   own slice of the container's entry into the viewport. */

function FillWord({
  word,
  progress,
  from,
  to,
}: {
  word: string;
  progress: MotionValue<number>;
  from: number;
  to: number;
}) {
  const opacity = useTransform(progress, [from, to], [0.16, 1]);
  const b = useTransform(progress, [from, to], [6, 0]);
  const filter = useMotionTemplate`blur(${b}px)`;
  return (
    <motion.span style={{ opacity, filter }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  );
}

function WordFill({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const scrollYProgress = useScrollProgress(ref, "top 92%", "top 40%");
  const words = text.split(/\s+/).filter(Boolean);

  if (reduce) {
    return <p className={className}>{text}</p>;
  }
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => {
          const from = (i / words.length) * 0.85;
          return (
            <FillWord
              key={i}
              word={w}
              progress={scrollYProgress}
              from={from}
              to={from + 0.15}
            />
          );
        })}
      </span>
    </p>
  );
}

/* One video, two sources: WebM/VP9 where supported, H.264 everywhere else
   (notably iOS Safari before 17.4). Falls back to a plain src when the
   media only carries one file. */
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

/* ------------------------------------------------------------ media band */

/* Each is its namesake ratio with ~15% of the height taken out — enough to
   read as a band rather than a block, without slicing the subject. */
const ASPECT: Record<NonNullable<CaseMedia["aspect"]>, string> = {
  wide: "aspect-[11/4]",
  screen: "aspect-[17/9]",
  tall: "aspect-[17/18]",
};

function MediaBand({
  media,
  sectionKicker,
  variant,
}: {
  media: CaseMedia;
  sectionKicker: string;
  variant: "contained" | "flush" | "pair";
}) {
  const flush = variant !== "contained";
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const scrollYProgress = useScrollProgress(ref, "top bottom", "bottom top");
  const scale = useTransform(scrollYProgress, [0, 0.45], [1.05, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.4], [7, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [28, -28]);

  const aspect =
    variant === "pair" ? "aspect-[4/3]" : ASPECT[media.aspect ?? "wide"];

  return (
    <div
      ref={ref}
      className={
        variant === "pair"
          ? "w-full"
          : variant === "flush"
            ? "mt-14 w-full sm:mt-20"
            : "mx-auto mt-14 w-[min(96vw,1500px)] sm:mt-20"
      }
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={reduce ? undefined : { scale, y, rotateX, transformOrigin: "50% 100%" }}
        className={`relative overflow-hidden ${flush ? "" : "rounded-2xl"} ${aspect} bg-[#0B0F0B]`}
      >
        {media.src ? (
          media.kind === "video" ? (
            <VideoSources
              media={media}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- studio
               uploads are pre-compressed to their display size */
            <img
              src={media.src}
              alt={media.caption || sectionKicker}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          /* Placeholder slot — StockBee's stage until real work lands */
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(182,255,61,0.09) 0%, transparent 60%), linear-gradient(180deg, #0B0F0B 0%, #060906 100%)",
              }}
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
              <span>{sectionKicker}</span>
              <span>media slot — add in studio</span>
            </div>
            <div className="absolute bottom-6 left-6 h-1 w-14 rounded-full bg-[#B6FF3D]/70" />
          </div>
        )}
      </motion.div>
      {media.caption ? (
        <p
          className={`mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted ${flush ? "px-6" : ""}`}
        >
          {media.caption}
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------- pinned showcase */
/*
 * The reference's 01/02/03 feature chapter (video @6-9s): the section pins
 * to the viewport, the media stage holds the left and swaps per step, and
 * the numbered feature text rides the right column. Scroll drives both —
 * scrub back and the sequence rewinds.
 */

function StepMedia({
  media,
  kicker,
  index,
  count,
  progress,
}: {
  media?: CaseMedia;
  kicker: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
}) {
  const lo = index / count;
  const hi = (index + 1) / count;
  /* a long cross-dissolve — the assets blend over half a step so the swap
     reads as a fade-through, never a cut */
  const fade = 0.5 / count;
  const opacity = useTransform(
    progress,
    index === 0
      ? [lo, lo, hi - fade, hi]
      : index === count - 1
        ? [lo - fade, lo, hi, hi]
        : [lo - fade, lo, hi - fade, hi],
    index === 0 ? [1, 1, 1, 0] : index === count - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
  );
  const scale = useTransform(progress, [lo - fade, lo + 0.5 / count], [1.06, 1]);

  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0 bg-[#0B0F0B]">
      {media?.src ? (
        media.kind === "video" ? (
          <VideoSources
            media={media}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- studio
             uploads are pre-compressed to their display size */
          <img
            src={media.src}
            alt={media.caption || kicker}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(182,255,61,0.09) 0%, transparent 60%), linear-gradient(180deg, #0B0F0B 0%, #060906 100%)",
            }}
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
            <span>{kicker}</span>
            <span>media slot — add in studio</span>
          </div>
          <div className="absolute bottom-6 left-6 h-1 w-14 rounded-full bg-[#B6FF3D]/70" />
        </div>
      )}
    </motion.div>
  );
}

/* Each feature's text is a pure function of scroll: it rides up from below,
   dwells while its media is on, and keeps rising as the next one arrives.
   No state, no swap — scrub the wheel and the stack tracks it exactly. */
function StepText({
  s,
  label,
  index,
  count,
  progress,
}: {
  s: CaseSection;
  label: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
}) {
  const span = 1 / count;
  const centre = (index + 0.5) * span;
  const first = index === 0;
  const last = index === count - 1;

  /* Travel exceeds a block's own height (~440px) so that at the hand-over
     the outgoing and incoming blocks are clear of each other — otherwise
     they cross-dissolve on top of one another and read as mush. */
  const TRAVEL = 460;

  const y = useTransform(
    progress,
    first
      ? [0, centre, centre + span]
      : last
        ? [centre - span, centre, 1]
        : [centre - span, centre, centre + span],
    first
      ? [0, 0, -TRAVEL]
      : last
        ? [TRAVEL, 0, 0]
        : [TRAVEL, 0, -TRAVEL],
  );

  const opacity = useTransform(
    progress,
    first
      ? [0, centre + 0.32 * span, centre + 0.62 * span]
      : last
        ? [centre - 0.62 * span, centre - 0.32 * span, 1]
        : [
            centre - 0.62 * span,
            centre - 0.32 * span,
            centre + 0.32 * span,
            centre + 0.62 * span,
          ],
    first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0],
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-end max-md:items-end">
      <motion.div
        style={{ y, opacity }}
        className="w-full max-w-md p-8 text-[#EDF3ED] sm:p-14"
      >
        <p className="font-mono text-xs tracking-[0.25em] text-[#B6FF3D]">
          {label}
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-case)] text-[clamp(26px,2.6vw,40px)] font-bold leading-[1.06] tracking-[-0.02em]">
          {s.heading}
        </h2>
        <div className="mt-5 space-y-4">
          {s.body.map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-[#EDF3ED]/70">
              {p}
            </p>
          ))}
        </div>
        {s.statement ? (
          <p className="mt-6 font-[family-name:var(--font-case)] text-[clamp(20px,1.8vw,28px)] font-semibold leading-snug tracking-[-0.015em]">
            {s.statement}
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}

function RailSegment({
  index,
  count,
  progress,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
}) {
  const span = 1 / count;
  const scaleX = useTransform(
    progress,
    [index * span, (index + 1) * span],
    [0, 1],
  );
  return (
    <span className="relative h-1 w-8 overflow-hidden rounded-full bg-white/25">
      <motion.span
        style={{ scaleX }}
        className="absolute inset-0 origin-left rounded-full bg-[#B6FF3D]/80"
      />
    </span>
  );
}

function PinnedShowcase({
  items,
  startIndex,
}: {
  items: CaseSection[];
  startIndex: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const n = items.length;
  const scrollYProgress = useScrollProgress(wrapRef, "top top", "bottom bottom");
  usePinned(wrapRef, pinRef);

  /* No React state anywhere in here — every moving part reads scroll
     directly, so there is nothing to re-render and nothing to snap. */

  return (
    <div
      ref={wrapRef}
      data-zone-id={items[0].id}
      style={{ height: `${n * 118 + 30}vh` }}
    >
      <div
        ref={pinRef}
        className="flex h-svh items-center justify-center overflow-hidden"
      >
        {/* the asset IS the section: a near-fullscreen inset frame, hero-text
            wide, media swapping per step behind an overlay */}
        <div className="relative h-[92svh] w-[min(92vw,1400px)]">
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {items.map((item, i) => (
              <StepMedia
                key={item.id}
                media={item.media[0]}
                kicker={item.kicker}
                index={i}
                count={n}
                progress={scrollYProgress}
              />
            ))}
            {/* scrim so the overlay text reads on any asset */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_42%,rgba(4,6,4,0.66)_100%)] max-md:bg-[linear-gradient(to_top,rgba(4,6,4,0.78)_0%,rgba(4,6,4,0.25)_45%,transparent_65%)]" />
          </div>

          {/* feature text — scroll-linked stack, each block riding up */}
          {items.map((item, i) => (
            <StepText
              key={item.id}
              s={item}
              label={String(startIndex + i + 1).padStart(2, "0")}
              index={i}
              count={n}
              progress={scrollYProgress}
            />
          ))}

          {/* progress rail — each segment fills with its own step */}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {items.map((item, i) => (
              <RailSegment
                key={item.id}
                index={i}
                count={n}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- section */

function SectionBlock({ s, index }: { s: CaseSection; index: number }) {
  const dark = !!s.showcase;
  const pair = s.media.length >= 2;
  return (
    <section id={s.id} data-zone-id={s.id} className="pt-28 sm:pt-40">
      {/* Reference rhythm: a small label held hard left, the heading and body
         set in a column beginning at the midline. */}
      <div className="mx-auto w-[min(92vw,1400px)]">
        <div className="grid gap-8 md:grid-cols-2 md:gap-16">
          <Rise>
            <p className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
              <span className="text-[10px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {s.kicker}
            </p>
          </Rise>
          <div>
            <WordFill
              text={s.heading}
              className="font-[family-name:var(--font-case)] text-[clamp(28px,3.4vw,52px)] font-bold leading-[1.08] tracking-[-0.022em]"
            />
            {s.body.length > 0 && (
              <Rise delay={0.1}>
                <div className="mt-12 max-w-[54ch] space-y-5">
                  {s.body.map((p, i) => (
                    <p
                      key={i}
                      className="text-[17px] leading-relaxed text-muted sm:text-lg"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </Rise>
            )}
          </div>
        </div>
      </div>

      {/* Two assets sit as an edge-to-edge pair; one runs as a band. */}
      {pair ? (
        <div className="mt-14 grid grid-cols-1 sm:mt-20 md:grid-cols-2">
          {s.media.map((m, i) => (
            <MediaBand
              key={i}
              media={m}
              sectionKicker={s.kicker}
              variant="pair"
            />
          ))}
        </div>
      ) : (
        s.media.map((m, i) => (
          <MediaBand
            key={i}
            media={m}
            sectionKicker={s.kicker}
            variant={dark ? "flush" : "contained"}
          />
        ))
      )}

      {s.statement ? (
        <div className="mx-auto mt-20 w-[min(92vw,1400px)] sm:mt-28">
          <WordFill
            text={s.statement}
            className="font-[family-name:var(--font-case)] text-[clamp(34px,6vw,88px)] font-bold leading-[1.02] tracking-[-0.03em]"
          />
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ view */

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  const reduce = useReducedMotion();
  const heroSrc = cs.heroMedia?.src;
  const darkIds = useMemo(
    () =>
      heroSrc ? new Set([...darkSectionIds(cs), "hero"]) : darkSectionIds(cs),
    [heroSrc, cs],
  );
  const [zone, setZone] = useState<Zone>(cs.heroMedia ? STOCKBEE_DARK : PAPER);
  const rootRef = useRef<HTMLElement>(null);

  /* Colour zones: whichever zone-tagged block owns the viewport's centre
     sets the palette; the article animates its CSS variables there, and
     every token-driven utility inside follows. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = root.querySelectorAll<HTMLElement>("[data-zone-id]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.getAttribute("data-zone-id") ?? "";
            setZone(darkIds.has(id) ? STOCKBEE_DARK : PAPER);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [darkIds]);

  return (
    <motion.article
      ref={rootRef}
      className={`pb-32 ${caseFont.variable} ${heroFonts.silk.variable} font-[family-name:var(--font-case)]`}
      initial={false}
      animate={
        {
          backgroundColor: zone.bg,
          "--background": zone.bg,
          "--foreground": zone.fg,
          "--muted": zone.muted,
          "--border": zone.border,
          "--subtle": zone.subtle,
          color: zone.fg,
        } as Record<string, string>
      }
      transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeInOut" }}
    >
      {/* ---- hero ---- */}
      <header
        data-zone-id="hero"
        className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden pb-16 pt-28"
      >
        {cs.heroMedia?.src ? (
          <>
            {cs.heroMedia.kind === "video" ? (
              <VideoSources
                media={cs.heroMedia}
                loop={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- full-bleed
                 hero art, already compressed to its display size */
              <img
                src={cs.heroMedia.src}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* the subject sits right; this keeps the left readable */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(4,6,4,0.94)_0%,rgba(4,6,4,0.78)_34%,rgba(4,6,4,0.3)_68%,rgba(4,6,4,0.08)_100%)] max-md:bg-[linear-gradient(to_top,rgba(4,6,4,0.94)_0%,rgba(4,6,4,0.6)_55%,rgba(4,6,4,0.2)_100%)]" />
          </>
        ) : null}

        <BanknoteNav />

        <div className="relative z-10 mx-auto w-[min(92vw,1400px)]">
          <Rise>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              Case study — {cs.year}
            </p>
          </Rise>
          <Rise delay={0.05}>
            <h1 className="mt-4 font-[family-name:var(--font-case)] text-[clamp(64px,13vw,200px)] font-bold leading-[0.92] tracking-[-0.04em]">
              {cs.title}
            </h1>
          </Rise>
          <Rise delay={0.12}>
            <p className="mt-8 max-w-3xl font-[family-name:var(--font-case)] text-[clamp(22px,2.6vw,38px)] font-medium leading-[1.2] tracking-[-0.015em]">
              {cs.tagline}
            </p>
          </Rise>
          <Rise delay={0.18}>
            <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-8 text-sm sm:grid-cols-4">
              {(
                [
                  ["Role", cs.role],
                  ["Disciplines", cs.disciplines],
                  ["Team", cs.team],
                  ["Scope", cs.scope],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                    {label}
                  </dt>
                  <dd className="mt-2">{value}</dd>
                </div>
              ))}
            </dl>
          </Rise>
        </div>
      </header>

      {/* ---- narrative sections (consecutive showcase sections merge into
             one pinned feature sequence; reduced motion unrolls them) ---- */}
      {(() => {
        type Group =
          | { kind: "single"; s: CaseSection; index: number }
          | { kind: "showcase"; items: CaseSection[]; startIndex: number };
        const groups: Group[] = [];
        cs.sections.forEach((s, i) => {
          const last = groups[groups.length - 1];
          if (s.showcase && !reduce) {
            if (
              last?.kind === "showcase" &&
              last.startIndex + last.items.length === i
            ) {
              last.items.push(s);
            } else {
              groups.push({ kind: "showcase", items: [s], startIndex: i });
            }
          } else {
            groups.push({ kind: "single", s, index: i });
          }
        });
        return groups.map((g) =>
          g.kind === "showcase" ? (
            <PinnedShowcase
              key={g.items[0].id}
              items={g.items}
              startIndex={g.startIndex}
            />
          ) : (
            <SectionBlock key={g.s.id} s={g.s} index={g.index} />
          ),
        );
      })()}

      {/* ---- impact ---- */}
      <section id="impact" data-zone-id="impact" className="pt-28 sm:pt-40">
        <div className="mx-auto w-[min(92vw,1400px)]">
          <Rise>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              {cs.impact.title}
            </p>
          </Rise>
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-14 border-t border-border pt-12 lg:grid-cols-3">
            {cs.impact.stats.map((stat, i) => (
              <Rise key={stat.label} delay={(i % 3) * 0.07}>
                <p
                  className={`font-[family-name:var(--font-case)] text-[clamp(44px,6.5vw,104px)] font-bold leading-none tracking-[-0.035em] ${
                    stat.value.includes("X") ? "text-muted/50" : ""
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-3 text-sm text-muted">{stat.label}</p>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      {/* ---- result ---- */}
      <section id="result" data-zone-id="result" className="pt-28 sm:pt-40">
        <div className="mx-auto w-[min(92vw,1400px)]">
          <Rise>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              {cs.result.heading}
            </p>
          </Rise>
          {cs.result.body.map((p, i) => (
            <Rise key={i} delay={0.06}>
              <p className="mt-8 max-w-3xl text-lg leading-relaxed text-muted">
                {p}
              </p>
            </Rise>
          ))}
          <div className="mt-14 max-w-5xl">
            <WordFill
              text={cs.result.statement}
              className="font-[family-name:var(--font-case)] text-[clamp(34px,5.6vw,84px)] font-bold leading-[1.02] tracking-[-0.03em]"
            />
          </div>
          <Rise delay={0.2}>
            <Link
              href="/work"
              className="mt-20 inline-block rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-subtle"
            >
              ← All work
            </Link>
          </Rise>
        </div>
      </section>
    </motion.article>
  );
}
