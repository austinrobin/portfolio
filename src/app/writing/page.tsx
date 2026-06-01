import type { Metadata } from "next";
import Link from "next/link";
import { getWriting } from "@/lib/content";
import { FadeIn, Reveal } from "@/components/motion";

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on product design, craft, and designing in the age of AI.",
};

export default function WritingPage() {
  const posts = getWriting();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <FadeIn>
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl">
          Writing
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Notes on craft, process, and how design practice is changing in the
          age of AI.
        </p>
      </FadeIn>

      <div className="mt-14 divide-y divide-border">
        {posts.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.05}>
            <Link href={`/writing/${post.slug}`} className="group block py-7">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-2xl transition-colors group-hover:text-accent">
                  {post.title}
                </h2>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-2 text-muted">{post.summary}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
