import Link from "next/link";
import { getWriting } from "@/lib/content";
import { getCaseStudies } from "@/lib/case-studies";
import { siteConfig } from "@/lib/site";
import { FadeIn, Reveal } from "@/components/motion";
import { WorkCard } from "@/components/work-card";

export default function Home() {
  const work = getCaseStudies().slice(0, 3);
  const writing = getWriting().slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {siteConfig.role}
          </p>
        </FadeIn>
        <FadeIn delay={0.08}>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            Designing financial products people actually trust — and shaping how
            craft evolves in the age of AI.
          </h1>
        </FadeIn>
        <FadeIn delay={0.16}>
          <p className="mt-8 max-w-xl text-lg text-muted">
            {siteConfig.description}
          </p>
        </FadeIn>
        <FadeIn delay={0.24}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/work"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              View selected work
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-subtle"
            >
              About me
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Selected work */}
      <section className="border-t border-border py-16">
        <Reveal className="flex items-baseline justify-between">
          <h2 className="font-display text-3xl">Selected work</h2>
          <Link
            href="/work"
            className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            All projects →
          </Link>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {work.map((project, i) => (
            <Reveal key={project.slug} delay={i * 0.06}>
              <WorkCard project={project} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Writing */}
      {writing.length > 0 && (
        <section className="border-t border-border py-16">
          <Reveal className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl">Writing</h2>
            <Link
              href="/writing"
              className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              All notes →
            </Link>
          </Reveal>
          <div className="mt-8 divide-y divide-border">
            {writing.map((post) => (
              <Reveal key={post.slug}>
                <Link
                  href={`/writing/${post.slug}`}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-lg transition-colors group-hover:text-accent">
                    {post.title}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                    })}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
