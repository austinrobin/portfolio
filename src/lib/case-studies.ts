import stockbeeJson from "../../content/case-stockbee.json";
import lwtJson from "../../content/case-lwt.json";

/*
 * Case-study content, Studio-editable.
 *
 * Each case study lives in content/case-<slug>.json (text + media slots) so
 * the Studio can edit copy, add media, and commit the result — the same
 * git-backed flow as site.json/hero.json. Media files land under
 * public/case/<slug>/ via the Studio's upload (client-compressed, size-capped).
 */

export interface CaseMedia {
  kind: "image" | "video";
  /** Public path (e.g. /case/stockbee/den.webp). Empty = placeholder slot. */
  src: string;
  caption?: string;
  /** Band shape: wide 21/9, screen 16/10, tall 4/5. */
  aspect?: "wide" | "screen" | "tall";
  /** Poster image for videos. */
  poster?: string;
  /** Fallback video source (H.264) for browsers without VP9/WebM. */
  srcFallback?: string;
  /** Grid layout only: columns of 12 this asset spans (12 = full row,
      6 = half, 4 = a third, 5/7 = an offset pair). */
  span?: number;
  /** Intrinsic pixel size — lets a grid cell reserve its exact aspect
      before the (lazy) image arrives, so nothing shifts. */
  w?: number;
  h?: number;
}

export interface CaseSection {
  id: string;
  kicker: string;
  heading: string;
  body: string[];
  /** Oversized emphasis line rendered after the body ("All signal. No noise."). */
  statement?: string;
  media: CaseMedia[];
  /** "grid" lays the media out Gander-style on a 12-column grid at each
      asset's natural aspect (portrait and landscape side by side, no crop);
      default "bands" is the fixed-aspect Fantasy band. */
  layout?: "bands" | "grid";
  /** Consecutive showcase sections merge into one pinned feature sequence:
      the section sticks to the top, media swaps per step, text rides the
      right column (the Fantasy 01/02/03 chapter pattern). */
  showcase?: boolean;
}

export interface ImpactStat {
  value: string;
  label: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  year: string;
  tags: string[];
  role: string;
  disciplines: string;
  team: string;
  scope: string;
  cover?: string;
  /** Full-bleed hero background — the case study opens in its own world. */
  heroMedia?: CaseMedia;
  sections: CaseSection[];
  impact: { title: string; stats: ImpactStat[] };
  result: { heading: string; body: string[]; statement: string };
  featured?: boolean;
  order?: number;
}

export const caseStockbee: CaseStudy = stockbeeJson as CaseStudy;
export const caseLwt: CaseStudy = lwtJson as CaseStudy;

const registry: CaseStudy[] = [caseStockbee, caseLwt];

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
