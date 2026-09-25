import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
