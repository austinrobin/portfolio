import { stockbee } from "@/content/case-studies/stockbee";

export interface ImpactStat {
  value: string;
  label: string;
  placeholder?: boolean;
}

export interface Block {
  label: string;
  desc: string;
}

export type Section =
  | {
      kind: "narrative";
      id: string;
      navLabel: string;
      eyebrow?: string;
      title?: string;
      hook: string[];
      body: string[];
      blocks?: Block[];
    }
  | {
      kind: "callout";
      id: string;
      navLabel?: string;
      eyebrow?: string;
      text: string;
    }
  | {
      kind: "image";
      id: string;
      navLabel?: string;
      theme?: "dark" | "light";
      caption?: string;
      src?: string;
      alt?: string;
    }
  | {
      kind: "impact";
      id: string;
      navLabel: string;
      title: string;
      stats: ImpactStat[];
    }
  | { kind: "closing"; id: string; navLabel?: string; hook: string[]; body: string[] };

export interface CaseStudy {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  year: string;
  tags: string[];
  role: string;
  team?: string;
  skills?: string[];
  timeline?: string;
  cover?: string;
  overview: string[];
  sections: Section[];
  featured?: boolean;
  order?: number;
}

const registry: CaseStudy[] = [stockbee];

export function getCaseStudies(): CaseStudy[] {
  return [...registry].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (a.order ?? 99) - (b.order ?? 99);
  });
}

export function getCaseStudy(slug: string): CaseStudy | null {
  return registry.find((c) => c.slug === slug) ?? null;
}

export function getCaseStudySlugs(): string[] {
  return registry.map((c) => c.slug);
}

/** Sections that should appear in the sticky Contents nav. */
export function getContents(cs: CaseStudy): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [
    { id: "overview", label: "Overview" },
  ];
  for (const s of cs.sections) {
    if ("navLabel" in s && s.navLabel) {
      // Avoid duplicate consecutive labels (e.g. callout + narrative share a label)
      if (items[items.length - 1]?.label !== s.navLabel) {
        items.push({ id: s.id, label: s.navLabel });
      }
    }
  }
  return items;
}
