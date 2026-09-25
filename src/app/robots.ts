import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/* /robots.txt — everything public is crawlable; the Studio and its API are not. */
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
