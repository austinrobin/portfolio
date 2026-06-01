import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSlugs, getWriting } from "@/lib/content";
import { FadeIn } from "@/components/motion";

export function generateStaticParams() {
  return getSlugs("writing").map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getWriting().find((p) => p.slug === slug);
  if (!post) return {};
  return { title: post.title, description: post.summary };
}

export default async function WritingDetail({
  params,
}: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = getWriting().find((p) => p.slug === slug);
  if (!post) notFound();

  const { default: Body } = await import(`@/content/writing/${slug}.mdx`);

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <FadeIn>
        <Link
          href="/writing"
          className="font-mono text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          ← All writing
        </Link>

        <header className="mt-8">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            {post.title}
          </h1>
        </header>
      </FadeIn>

      <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none prose-headings:font-display prose-headings:font-normal prose-a:text-accent">
        <Body />
      </div>
    </article>
  );
}
