import Link from "next/link";
import { FadeIn } from "@/components/motion";
import { NowLine } from "./now-line";

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 sm:pt-32">
      <FadeIn>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <NowLine />
        </p>
      </FadeIn>

      {/* PLACEHOLDER HEADLINE — human/warm register, here to react to.
          Swap for Austin's own line once his hero concept is set. */}
      <FadeIn delay={0.08}>
        <h1 className="mt-8 font-display text-5xl leading-[1.04] tracking-tight sm:text-6xl">
          Hi, I&rsquo;m Austin. I design products people trust — and build the
          small tools I wish already existed.
        </h1>
      </FadeIn>

      <FadeIn delay={0.16}>
        <p className="mt-7 max-w-xl text-lg text-muted">
          Lead product designer working across product, brand, and creative
          direction — mostly in fintech. Lately, building with AI to shorten the
          distance between what I imagine and what ships.
        </p>
      </FadeIn>

      <FadeIn delay={0.24}>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="#work"
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            See the work
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-subtle"
          >
            More about me
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
