import siteJson from "../../content/site.json";

export interface SiteConfig {
  name: string;
  role: string;
  url: string;
  description: string;
  email: string;
  socials: { label: string; href: string }[];
  nav: { label: string; href: string }[];
}

/* Content lives in content/site.json — editable from /studio. */
export const siteConfig: SiteConfig = siteJson;
