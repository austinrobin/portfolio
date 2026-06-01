import type { Metadata } from "next";
import { getWork } from "@/lib/content";
import { FadeIn, Reveal } from "@/components/motion";
import { WorkCard } from "@/components/work-card";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected product design case studies.",
};

export default function WorkPage() {
  const work = getWork();

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <FadeIn>
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Work</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          A selection of products I&rsquo;ve shaped end to end — from strategy
          and brand through to shipped interface.
        </p>
      </FadeIn>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {work.map((project, i) => (
          <Reveal key={project.slug} delay={i * 0.05}>
            <WorkCard project={project} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
