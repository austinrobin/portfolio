import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

export type Collection = "work" | "writing";

export interface WorkMeta {
  slug: string;
  title: string;
  summary: string;
  year: string;
  role: string;
  client?: string;
  tags: string[];
  cover?: string;
  featured?: boolean;
  order?: number;
}

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

export function getWork(): WorkMeta[] {
  return (readCollection("work") as unknown as WorkMeta[]).sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (a.order ?? 99) - (b.order ?? 99);
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
