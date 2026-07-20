import Link from "next/link";
import { Reveal } from "@/components/motion";

/* Tilted polaroid placeholders — a glimpse of the Studio/Life chapter,
   where the draggable collage of real experiences will live. */
const polaroids = [
  { caption: "on set", rotate: "-6deg", tint: "#EADFCB" },
  { caption: "the team", rotate: "3deg", tint: "#D8E3DA" },
  { caption: "somewhere new", rotate: "-2deg", tint: "#DAD6E8" },
];

export function LifeTeaser() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <span className="size-2 rounded-full bg-foreground/40" />
          Studio / Life
        </p>
        <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          How I lead, and who I am when the work stops.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Building teams and a design community on the side — plus the life,
          places, and people behind the work.
        </p>
      </Reveal>

      <div className="mt-12 flex items-center justify-center gap-4 sm:gap-8">
        {polaroids.map((p, i) => (
          <Reveal key={p.caption} delay={i * 0.08}>
            <div
              className="w-28 rounded-sm bg-white p-2 pb-6 shadow-[0_12px_30px_rgba(0,0,0,0.18)] sm:w-36"
              style={{ transform: `rotate(${p.rotate})` }}
            >
              <div
                className="aspect-square w-full rounded-[2px]"
                style={{ background: p.tint }}
              />
              <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                {p.caption}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-12 text-center">
          <Link
            href="/about"
            className="text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            More on the studio &amp; the channel →
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
