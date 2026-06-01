import Link from "next/link";
import type { WorkMeta } from "@/lib/content";

export function WorkCard({ project }: { project: WorkMeta }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-subtle/40 p-6 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          {project.client ?? project.role}
        </span>
        <span className="font-mono text-xs text-muted">{project.year}</span>
      </div>

      <h3 className="mt-6 font-display text-3xl leading-tight transition-colors group-hover:text-accent">
        {project.title}
      </h3>
      <p className="mt-3 flex-1 text-muted">{project.summary}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {project.tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
