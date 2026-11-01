import type { NextConfig } from "next";
import createMDX from "@next/mdx";

/* Media is served from the site itself. It used to come from jsDelivr pinned
   to the deployed commit, but a jsDelivr region that had not yet seen a file
   fetched it from GitHub first and could stall for 40 s+ — and with frequent
   deploys and visitors spread one or two per country, nearly every visitor
   was the first in their region (measured 2026-10-27: the hero took 11–21 s
   to appear). Vercel's own edge is as fast from here and never stalls. Set
   USE_JSDELIVR=1 at build time to bring the CDN back. */
const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const mediaBase = sha && process.env.VERCEL && process.env.USE_JSDELIVR === "1" ? `https://cdn.jsdelivr.net/gh/austinrobin/portfolio@${sha}/public` : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_MEDIA_BASE: mediaBase },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    qualities: [75, 90],
  },
  /* hand-encoded case, gallery, deck and footer assets change rarely and
     keep their names: browsers hold them for a day and serve stale while
     revalidating. `s-maxage` is what lets Vercel's edge keep a copy — a
     custom Cache-Control without it made every asset an edge MISS served
     from the origin at ~200KB/s (measured 2026-09-25). The edge cache is
     keyed per deployment, so a year is safe: a new deploy never serves an
     old file. */
  /* the old standalone contact page now lives at the foot of the home page */
  async redirects() {
    return [
      { source: "/contact", destination: "/#contact", permanent: true },
      { source: "/about", destination: "/", permanent: true },
      { source: "/writing", destination: "/", permanent: true },
      { source: "/writing/:slug*", destination: "/", permanent: true },
      { source: "/work", destination: "/#work", permanent: true },
    ];
  },
  async headers() {
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
      },
    ];
    return [
      { source: "/case/:path*", headers: cache },
      { source: "/gallery/:path*", headers: cache },
      { source: "/footer/:path*", headers: cache },
      { source: "/lab/:path*", headers: cache },
      { source: "/deck/:path*", headers: cache },
      { source: "/loader/:path*", headers: cache },
      { source: "/:file(hero-art|hero-face|current-coin)\\.webp", headers: cache },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      "remark-frontmatter",
      ["remark-mdx-frontmatter", { name: "frontmatter" }],
      "remark-gfm",
    ],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
