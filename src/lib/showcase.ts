export interface ShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  year: string;
  /** Real cover image (public/ path). Falls back to a styled placeholder. */
  cover?: string;
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
    id: "stockbee",
    title: "StockBee",
    subtitle: "AI-powered stock intelligence, on WhatsApp",
    year: "2026",
    href: "/work/stockbee",
    theme: { bg: "#060906", fg: "#E8F2E8", accent: "#B6FF3D" },
  },
  {
    id: "high",
    title: "High",
    subtitle: "Investing, rebuilt for Gen Z",
    year: "2026",
    theme: { bg: "#0B0714", fg: "#EFEAF8", accent: "#A78BFA" },
  },
  {
    id: "email-suite",
    title: "Transactional Email Suite",
    subtitle: "OTP, invites & founder notes — systemised",
    year: "2025",
    theme: { bg: "#101010", fg: "#F2EFE9", accent: "#F5C341" },
  },
  {
    id: "lwt",
    title: "LWT",
    subtitle: "Reframing an engineering legacy",
    year: "2024",
    href: "/work/lwt",
    theme: { bg: "#0B0A09", fg: "#F4F0EA", accent: "#FF5A2D" },
  },
  {
    id: "playground",
    title: "Playground",
    subtitle: "Brand, type & visual explorations",
    year: "Ongoing",
    theme: { bg: "#0A0F14", fg: "#EAF2F8", accent: "#5BA4FF" },
  },
];
