import Image from "next/image";
import Link from "next/link";
import type {
  Block,
  CaseStudy,
  ImpactStat,
  Section,
} from "@/lib/case-studies";
import { Reveal } from "@/components/motion";

/* ----------------------------------------------------------------
   Shared bits
----------------------------------------------------------------- */
function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted ${className}`}
    >
      <span className="size-2 rounded-full bg-accent" />
      {children}
    </p>
  );
}

export function BrowserFrame({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-[#0A0F0A] shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-3 rounded-full bg-[#FF5C5C]/80" />
        <span className="size-3 rounded-full bg-[#F5C341]/80" />
        <span className="size-3 rounded-full bg-[#4ADE80]/80" />
        <span className="ml-3 truncate rounded-md bg-white/5 px-3 py-1 font-mono text-[11px] text-white/40">
          stock-bee.com
        </span>
      </div>
      <div className="relative grid aspect-[16/9] place-items-center bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(182,255,61,0.10),transparent_70%)]">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#B6FF3D]/70">
            {label ?? "Product screenshot"}
          </p>
          <p className="mt-2 text-sm text-white/35">Replace with real visual</p>
        </div>
      </div>
    </div>
  );
}

function BlockCard({ block }: { block: Block }) {
  return (
    <div className="flex gap-3.5 rounded-xl border border-border bg-subtle/50 p-4">
      <span className="mt-px grid size-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l10 10-10 10L2 12z" />
        </svg>
      </span>
      <p className="text-[13.5px] leading-relaxed text-muted">
        <span className="font-semibold text-foreground">{block.label}.</span>{" "}
        {block.desc}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------
   Hero — dark, cinematic
----------------------------------------------------------------- */
export function CaseStudyHero({ cs }: { cs: CaseStudy }) {
  return (
    <header className="relative overflow-hidden bg-[#060906] text-[#E8F2E8]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(182,255,61,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-8 text-center">
        <div className="flex justify-start">
          <Link
            href="/work"
            className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#B5C2B5] transition-colors hover:bg-white/5 hover:text-white"
          >
            ← Back
          </Link>
        </div>
        <p className="mt-12 font-mono text-xs uppercase tracking-[0.24em] text-[#B6FF3D] sm:mt-16">
          {cs.tags.slice(0, 3).join(" · ")}
        </p>
        <h1 className="mt-6 text-6xl font-extrabold tracking-tight sm:text-8xl">
          {cs.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[#B5C2B5] sm:text-xl">
          {cs.tagline}
        </p>

        <div className="mx-auto mt-14 max-w-5xl">
          <BrowserFrame label="Hero — flagship product view" />
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------
   Meta band — role / team / disciplines  +  overview
----------------------------------------------------------------- */
function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

export function CaseStudyMeta({ cs }: { cs: CaseStudy }) {
  return (
    <section id="overview" className="scroll-mt-24 border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[240px_1fr] md:gap-16">
        <dl className="flex flex-col gap-8">
          <MetaItem label="My Role" value={cs.role} />
          {cs.team && <MetaItem label="Team" value={cs.team} />}
          {cs.skills && (
            <MetaItem
              label="Disciplines"
              value={
                <div className="flex flex-wrap gap-1.5">
                  {cs.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              }
            />
          )}
          <MetaItem label="Year" value={cs.year} />
        </dl>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
            Overview
          </h2>
          <div className="mt-4 space-y-4">
            {cs.overview.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-xl font-medium leading-snug tracking-tight text-foreground"
                    : "max-w-2xl text-[13.5px] leading-relaxed text-muted"
                }
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   Narrative section — big hook  +  (label-left / body-right)
----------------------------------------------------------------- */
export function NarrativeSection({
  section,
}: {
  section: Extract<Section, { kind: "narrative" }>;
}) {
  return (
    <section id={section.id} className="scroll-mt-24 py-14 sm:py-20">
      {section.eyebrow && <Eyebrow>{section.eyebrow}</Eyebrow>}
      <Reveal>
        <div className="mt-5 max-w-4xl space-y-1">
          {section.hook.map((line, i) => (
            <p
              key={i}
              className="text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-[40px]"
            >
              {line}
            </p>
          ))}
        </div>
      </Reveal>

      <div className="mt-10 grid gap-x-12 gap-y-5 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        <div>
          {section.title && (
            <h3 className="text-lg font-semibold tracking-tight text-foreground md:sticky md:top-24">
              {section.title}
            </h3>
          )}
        </div>
        <div>
          <div className="max-w-2xl space-y-4">
            {section.body.map((p, i) => (
              <p key={i} className="text-[13.5px] leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </div>
          {section.blocks && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {section.blocks.map((b) => (
                <BlockCard key={b.label} block={b} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   Callout — highlighted challenge statement
----------------------------------------------------------------- */
export function CalloutSection({
  section,
}: {
  section: Extract<Section, { kind: "callout" }>;
}) {
  return (
    <section id={section.id} className="scroll-mt-24 py-10">
      <Reveal>
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] px-8 py-12 text-center sm:px-14">
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-accent/15 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3v18M3 12h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {section.eyebrow && (
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-muted">
              {section.eyebrow}
            </p>
          )}
          <p className="mx-auto mt-4 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
            {section.text}
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------------------------------------
   Image band — full-bleed dark placeholder (visuals carry the story)
----------------------------------------------------------------- */
export function ImageBand({
  section,
}: {
  section: Extract<Section, { kind: "image" }>;
}) {
  return (
    <section
      id={section.id}
      className="mx-[calc(50%-50vw)] w-screen scroll-mt-24 bg-[#060906] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          {section.src ? (
            <Image
              src={section.src}
              alt={section.alt ?? section.caption ?? ""}
              width={1600}
              height={1000}
              className="w-full rounded-xl border border-white/10"
            />
          ) : (
            <BrowserFrame label={section.caption ?? "Product visual"} />
          )}
        </Reveal>
        {section.caption && (
          <p className="mt-4 text-center font-mono text-xs uppercase tracking-[0.16em] text-white/40">
            {section.caption}
          </p>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   Impact — stats grid
----------------------------------------------------------------- */
function Stat({ stat }: { stat: ImpactStat }) {
  return (
    <div className="rounded-2xl border border-border bg-subtle/40 p-7">
      <p
        className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${
          stat.placeholder ? "text-muted/50" : "text-foreground"
        }`}
      >
        {stat.value}
      </p>
      <p className="mt-2 text-sm text-muted">{stat.label}</p>
    </div>
  );
}

export function ImpactSection({
  section,
}: {
  section: Extract<Section, { kind: "impact" }>;
}) {
  const hasPlaceholders = section.stats.some((s) => s.placeholder);
  return (
    <section id={section.id} className="scroll-mt-24 py-14 sm:py-20">
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {section.title}
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.stats.map((s) => (
          <Stat key={s.label} stat={s} />
        ))}
      </div>
      {hasPlaceholders && (
        <p className="mt-5 font-mono text-xs text-muted/70">
          Greyed values are placeholders — drop in the real metrics when ready.
        </p>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------
   Closing — dark bookend
----------------------------------------------------------------- */
export function ClosingSection({
  section,
}: {
  section: Extract<Section, { kind: "closing" }>;
}) {
  return (
    <section
      id={section.id}
      className="mx-[calc(50%-50vw)] mt-10 w-screen bg-[#060906] text-[#E8F2E8]"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="space-y-1">
          {section.hook.map((line, i) => (
            <p
              key={i}
              className="text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
            >
              {line}
            </p>
          ))}
        </div>
        <div className="mt-8 space-y-4">
          {section.body.map((p, i) => (
            <p key={i} className="text-base leading-relaxed text-[#B5C2B5]">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
