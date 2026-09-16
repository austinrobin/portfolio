export interface ShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  year: string;
  /** Real cover (public/ path): a still, or a looping .mp4 reel. Falls back
      to a styled placeholder. */
  cover?: string;
  /** Poster for a video cover — the first frame, shown until it plays. */
  coverPoster?: string;
  /** Link to the case study; omit for coming-soon items. */
  href?: string;
  /** Placeholder cover styling until a real visual lands. */
  theme: {
    bg: string;
    fg: string;
    accent: string;
  };
}

export const showcase: ShowcaseItem[] = [
  {
    id: "high",
    title: "High",
    subtitle: "Investing, rebuilt for Gen Z",
    year: "2026",
    href: "/work/high",
    cover: "/deck/high.mp4",
    coverPoster: "/deck/high.poster.webp",
    theme: { bg: "#0B0714", fg: "#EFEAF8", accent: "#A78BFA" },
  },
  {
    id: "stockbee",
    title: "StockBee",
    subtitle: "AI-powered stock intelligence, on WhatsApp",
    year: "2026",
    href: "/work/stockbee",
    cover: "/deck/stockbee.mp4",
    coverPoster: "/deck/stockbee.poster.webp",
    theme: { bg: "#060906", fg: "#E8F2E8", accent: "#B6FF3D" },
  },
  {
    id: "bloom-algo",
    title: "Bloom Algo",
    subtitle: "Making algo trading feel less like an algorithm",
    year: "2024",
    href: "/work/bloom-algo",
    cover: "/deck/bloom-algo.mp4",
    coverPoster: "/deck/bloom-algo.poster.webp",
    theme: { bg: "#0F1411", fg: "#ECF3EE", accent: "#7FE0B4" },
  },
  {
    id: "lwt",
    title: "LWT",
    subtitle: "Reframing an engineering legacy",
    year: "2024",
    href: "/work/lwt",
    cover: "/deck/lwt.mp4",
    coverPoster: "/deck/lwt.poster.webp",
    theme: { bg: "#0B0A09", fg: "#F4F0EA", accent: "#FF5A2D" },
  },
  {
    id: "mach",
    title: "MACH",
    subtitle: "Making the impossible feel production-ready",
    year: "2025",
    href: "/work/mach",
    cover: "/deck/mach.mp4",
    coverPoster: "/deck/mach.poster.webp",
    theme: { bg: "#070708", fg: "#F3F3F1", accent: "#C9CCD1" },
  },
];
