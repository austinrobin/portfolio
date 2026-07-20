import { Reveal } from "@/components/motion";

const experiments = [
  {
    tag: "The Gift",
    title: "Something you take with you",
    blurb: "A genuinely useful tool anyone who lands here can pick up and keep.",
  },
  {
    tag: "The Daily",
    title: "The tab you keep open",
    blurb:
      "One small, overlooked problem — solved so cleanly it earns a spot in your workflow.",
  },
  {
    tag: "The Craft",
    title: "Product thinking, refined",
    blurb: "A considered build that shows how I think about products end to end.",
  },
];

export function LabTeaser() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          <span className="size-2 rounded-full bg-accent" />
          The Lab
        </p>
        <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Things I built that you can actually use.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Small products, made with AI — each one an argument. That I can spot a
          problem, and that I can ship the fix.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {experiments.map((x, i) => (
          <Reveal key={x.tag} delay={i * 0.06}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-subtle/40 p-5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {x.tag}
              </span>
              <p className="mt-4 text-lg font-medium leading-snug">{x.title}</p>
              <p className="mt-2 flex-1 text-sm text-muted">{x.blurb}</p>
              <span className="mt-5 font-mono text-[11px] uppercase tracking-wider text-muted/70">
                Coming soon
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
