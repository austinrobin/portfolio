import Link from "next/link";
import { showcase } from "@/lib/showcase";
import { Hero } from "@/components/home/hero";
import { ProjectDeck } from "@/components/home/project-deck";
import { LabTeaser } from "@/components/home/lab-teaser";
import { LifeTeaser } from "@/components/home/life-teaser";

export default function Home() {
  return (
    <div>
      <Hero />

      {/* Work — scroll-driven flip deck on a dark stage */}
      <section id="work" className="scroll-mt-16 bg-[#060906]">
        <div className="mx-auto max-w-3xl px-6 pt-16 sm:pt-20">
          <div className="flex items-baseline justify-between">
            <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white/50">
              <span className="size-2 rounded-full bg-[#B6FF3D]" />
              Selected work
            </p>
            <Link
              href="/work"
              className="text-sm text-white/50 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              All projects →
            </Link>
          </div>
        </div>
        <ProjectDeck items={showcase} />
      </section>

      {/* The Lab — AI / design-engineer teaser */}
      <div className="border-t border-border">
        <LabTeaser />
      </div>

      {/* Studio / Life — leadership + personality teaser */}
      <div className="border-t border-border">
        <LifeTeaser />
      </div>
    </div>
  );
}
