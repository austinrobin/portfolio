import siteJson from "../../content/site.json";

export interface SiteConfig {
  name: string;
  role: string;
  url: string;
  description: string;
  email: string;
  /** the resume PDF, under /public — the nav opens it in a new tab */
  resume?: string;
  socials: { label: string; href: string }[];
  nav: { label: string; href: string }[];
  /** the last word on the home page, above the banknote — a line, the ask, and the button that opens a mail */
  closing?: { line: string; ask: string; cta: string; subject?: string };
}

/* Content lives in content/site.json — editable from /studio. */
export const siteConfig: SiteConfig = siteJson;
