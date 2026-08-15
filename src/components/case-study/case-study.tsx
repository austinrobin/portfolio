"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { CaseMedia, CaseSection, CaseStudy } from "@/lib/case-studies";

/*
 * Case-study view — the Fantasy layout (reference:
 * fantasy.co/services/product-innovation): sparse oversized statements,
 * media-forward full-width bands with a soft parallax settle, generous
 * vertical rhythm. Text stays left-aligned and brief; the media does the
 * talking. Empty media slots render as styled placeholders until real
 * work lands via /studio.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

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

/* ------------------------------------------------------------ media band */

const ASPECT: Record<NonNullable<CaseMedia["aspect"]>, string> = {
  wide: "aspect-[21/9]",
  screen: "aspect-[16/10]",
  tall: "aspect-[4/5]",
};

function MediaBand({
  media,
  sectionKicker,
}: {
  media: CaseMedia;
  sectionKicker: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45], [1.045, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);

  const aspect = ASPECT[media.aspect ?? "wide"];

  return (
    <div ref={ref} className="mx-auto mt-14 w-[min(96vw,1400px)] sm:mt-20">
      <motion.div
        style={reduce ? undefined : { scale, y }}
        className={`relative overflow-hidden rounded-2xl ${aspect} bg-[#060906]`}
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
          /* Placeholder slot — StockBee's dark stage until real work lands */
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(182,255,61,0.08) 0%, transparent 60%), #060906",
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
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {media.caption}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- section */

function SectionBlock({ s }: { s: CaseSection }) {
  return (
    <section id={s.id} className="pt-28 sm:pt-40">
      <div className="mx-auto w-[min(92vw,1400px)]">
        <div className="max-w-4xl">
          <Rise>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              {s.kicker}
            </p>
          </Rise>
          <Rise delay={0.06}>
            <h2 className="mt-6 font-display text-[clamp(30px,4.6vw,64px)] leading-[1.06] tracking-tight">
              {s.heading}
            </h2>
          </Rise>
          {s.body.length > 0 && (
            <Rise delay={0.12}>
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
        <MediaBand key={i} media={m} sectionKicker={s.kicker} />
      ))}

      {s.statement ? (
        <Rise className="mx-auto mt-20 w-[min(92vw,1400px)] sm:mt-28">
          <p className="font-display text-[clamp(34px,6vw,88px)] leading-[1.02] tracking-tight">
            {s.statement}
          </p>
        </Rise>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ view */

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  return (
    <article className="pb-32">
      {/* ---- hero ---- */}
      <header className="mx-auto flex min-h-[88svh] w-[min(92vw,1400px)] flex-col justify-end pb-16 pt-28">
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
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Role
              </dt>
              <dd className="mt-2">{cs.role}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Disciplines
              </dt>
              <dd className="mt-2">{cs.disciplines}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Team
              </dt>
              <dd className="mt-2">{cs.team}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Scope
              </dt>
              <dd className="mt-2">{cs.scope}</dd>
            </div>
          </dl>
        </Rise>
      </header>

      {/* ---- narrative sections ---- */}
      {cs.sections.map((s) => (
        <SectionBlock key={s.id} s={s} />
      ))}

      {/* ---- impact ---- */}
      <section id="impact" className="pt-28 sm:pt-40">
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
      <section id="result" className="pt-28 sm:pt-40">
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
          <Rise delay={0.12}>
            <p className="mt-14 max-w-5xl font-display text-[clamp(34px,5.6vw,84px)] leading-[1.04] tracking-tight">
              {cs.result.statement}
            </p>
          </Rise>
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
    </article>
  );
}
