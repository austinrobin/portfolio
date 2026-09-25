import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getCaseStudySlugs } from "@/lib/case-studies";

/* /sitemap.xml — the public pages at the canonical domain (siteConfig.url).
   Studio and the API are private and left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();
  const pages = ["", "/work", "/gallery", "/about", "/contact", "/writing"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, lastModified: now, priority: p === "" ? 1 : 0.7 })),
    ...getCaseStudySlugs().map((slug) => ({ url: `${base}/work/${slug}`, lastModified: now, priority: 0.9 })),
  ];
}
