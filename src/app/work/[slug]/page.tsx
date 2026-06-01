import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSlugs, getWork } from "@/lib/content";
import { FadeIn } from "@/components/motion";

export function generateStaticParams() {
  return getSlugs("work").map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getWork().find((p) => p.slug === slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

export default async function WorkDetail({
  params,
}: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = getWork().find((p) => p.slug === slug);
  if (!project) notFound();

  const { default: Body } = await import(`@/content/work/${slug}.mdx`);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <FadeIn>
        <Link
          href="/work"
          className="font-mono text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          ← All work
        </Link>

        <header className="mt-8 border-b border-border pb-10">
          <div className="flex flex-wrap gap-2">
            {project.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            {project.title}
          </h1>
          <p className="mt-5 text-lg text-muted">{project.summary}</p>

          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Meta label="Role" value={project.role} />
            {project.client && <Meta label="Client" value={project.client} />}
            <Meta label="Year" value={project.year} />
          </dl>
        </header>
      </FadeIn>

      <div className="prose prose-neutral dark:prose-invert mt-12 max-w-none prose-headings:font-display prose-headings:font-normal prose-h2:text-3xl prose-h2:mt-12 prose-a:text-accent prose-img:rounded-xl">
        <Body />
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
