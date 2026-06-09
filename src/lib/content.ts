import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

// Case studies are structured data (see lib/case-studies.ts).
// MDX is used for the writing/notes collection only.
export type Collection = "writing";

export interface WritingMeta {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
}

function readCollection(collection: Collection) {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      return { slug, ...data } as Record<string, unknown> & { slug: string };
    });
}

export function getWriting(): WritingMeta[] {
  return (readCollection("writing") as unknown as WritingMeta[]).sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );
}

export function getSlugs(collection: Collection): string[] {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}
