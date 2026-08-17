"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { CaseMedia, CaseSection, CaseStudy } from "@/lib/case-studies";

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
const DARK_SECTIONS = new Set(["advantage", "conviction", "engine"]);

function zoneFor(id: string): Zone {
  return DARK_SECTIONS.has(id) ? STOCKBEE_DARK : PAPER;
}

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
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "start 0.4"],
  });
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

/* ------------------------------------------------------------ media band */

const ASPECT: Record<NonNullable<CaseMedia["aspect"]>, string> = {
  wide: "aspect-[21/9]",
  screen: "aspect-[16/10]",
  tall: "aspect-[4/5]",
};

function MediaBand({
  media,
  sectionKicker,
  flush,
}: {
  media: CaseMedia;
  sectionKicker: string;
  flush: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45], [1.05, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.4], [7, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [28, -28]);

  const aspect = ASPECT[media.aspect ?? "wide"];

  return (
    <div
      ref={ref}
      className={
        flush
          ? "mt-14 w-full sm:mt-20"
          : "mx-auto mt-14 w-[min(96vw,1400px)] sm:mt-20"
      }
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={reduce ? undefined : { scale, y, rotateX, transformOrigin: "50% 100%" }}
        className={`relative overflow-hidden ${flush ? "" : "rounded-2xl"} ${aspect} bg-[#0B0F0B]`}
      >
        {media.src ? (
          media.kind === "video" ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={media.src}
              poster={media.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
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
  const fade = 0.18 / count;
  const opacity = useTransform(
    progress,
    index === 0
      ? [lo, lo, hi - fade, hi]
      : index === count - 1
        ? [lo - fade, lo, hi, hi]
        : [lo - fade, lo, hi - fade, hi],
    index === 0 ? [1, 1, 1, 0] : index === count - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
  );
  const y = useTransform(progress, [lo - 1 / count, hi], ["6%", "-6%"]);
  const scale = useTransform(progress, [lo - fade, lo + 0.5 / count], [1.04, 1]);

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 overflow-hidden rounded-2xl bg-[#0B0F0B]"
    >
      {media?.src ? (
        media.kind === "video" ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={media.src}
            poster={media.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
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

function PinnedShowcase({
  items,
  startIndex,
}: {
  items: CaseSection[];
  startIndex: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const n = items.length;
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const idx = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
      setStep(idx);
    });
  }, [scrollYProgress, n]);

  const s = items[step];

  return (
    <div
      ref={wrapRef}
      data-zone-id={items[0].id}
      style={{ height: `${n * 100 + 40}vh` }}
    >
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="mx-auto grid w-[min(94vw,1500px)] items-center gap-10 md:grid-cols-[1.5fr_1fr] md:gap-16">
          {/* media stage — pinned left, swapping per step */}
          <div className="relative aspect-[16/11] max-h-[76svh] w-full">
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
          </div>

          {/* feature text — right column, swaps with the step */}
          <div className="relative min-h-[16rem]">
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <p className="font-mono text-xs tracking-[0.25em] text-muted">
                {String(startIndex + step + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-4 font-display text-[clamp(26px,2.6vw,40px)] leading-[1.08] tracking-tight">
                {s.heading}
              </h2>
              <div className="mt-5 space-y-4">
                {s.body.map((p, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-muted">
                    {p}
                  </p>
                ))}
              </div>
              {s.statement ? (
                <p className="mt-6 font-display text-[clamp(20px,1.8vw,28px)] leading-snug tracking-tight">
                  {s.statement}
                </p>
              ) : null}
            </motion.div>

            {/* the next step's number peeks, like the reference */}
            {step < n - 1 && (
              <p className="absolute -bottom-14 left-0 font-mono text-xs tracking-[0.25em] text-muted/40 max-md:hidden">
                {String(startIndex + step + 2).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>

        {/* progress rail */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === step ? "w-8 bg-[#B6FF3D]/80" : "w-3 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- section */

function SectionBlock({ s, index }: { s: CaseSection; index: number }) {
  const dark = DARK_SECTIONS.has(s.id);
  return (
    <section id={s.id} data-zone-id={s.id} className="pt-28 sm:pt-40">
      <div className="mx-auto w-[min(92vw,1400px)]">
        <div className="max-w-4xl">
          <Rise>
            <p className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
              <span className="text-[10px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {s.kicker}
            </p>
          </Rise>
          <WordFill
            text={s.heading}
            className="mt-6 font-display text-[clamp(30px,4.6vw,64px)] leading-[1.06] tracking-tight"
          />
          {s.body.length > 0 && (
            <Rise delay={0.1}>
              <div className="mt-8 max-w-2xl space-y-5">
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

      {s.media.map((m, i) => (
        <MediaBand key={i} media={m} sectionKicker={s.kicker} flush={dark} />
      ))}

      {s.statement ? (
        <div className="mx-auto mt-20 w-[min(92vw,1400px)] sm:mt-28">
          <WordFill
            text={s.statement}
            className="font-display text-[clamp(34px,6vw,88px)] leading-[1.02] tracking-tight"
          />
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ view */

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  const reduce = useReducedMotion();
  const [zone, setZone] = useState<Zone>(PAPER);
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
            setZone(zoneFor(e.target.getAttribute("data-zone-id") ?? ""));
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, []);

  return (
    <motion.article
      ref={rootRef}
      className="pb-32"
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
        className="mx-auto flex min-h-[88svh] w-[min(92vw,1400px)] flex-col justify-end pb-16 pt-28"
      >
        <Rise>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            Case study — {cs.year}
          </p>
        </Rise>
        <Rise delay={0.05}>
          <h1 className="mt-4 font-display text-[clamp(64px,13vw,200px)] leading-[0.92] tracking-tight">
            {cs.title}
          </h1>
        </Rise>
        <Rise delay={0.12}>
          <p className="mt-8 max-w-3xl font-display text-[clamp(22px,2.6vw,38px)] leading-[1.18] tracking-tight">
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
                  className={`font-display text-[clamp(44px,6.5vw,104px)] leading-none tracking-tight ${
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
              className="font-display text-[clamp(34px,5.6vw,84px)] leading-[1.04] tracking-tight"
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
