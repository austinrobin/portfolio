export const siteConfig = {
  name: "Your Name",
  role: "Senior Product Designer",
  // Update to your real domain before launch.
  url: "https://example.com",
  description:
    "Senior product designer working across brand, product, and strategy — mostly in fintech. Shaping products from zero to one, and adapting craft for the age of AI.",
  email: "you@example.com",
  socials: [
    { label: "LinkedIn", href: "https://linkedin.com/in/your-handle" },
    { label: "Read.cv", href: "https://read.cv/your-handle" },
    { label: "X", href: "https://x.com/your-handle" },
  ],
  nav: [
    { label: "Work", href: "/work" },
    { label: "About", href: "/about" },
    { label: "Writing", href: "/writing" },
    { label: "Contact", href: "/contact" },
  ],
};

export type SiteConfig = typeof siteConfig;
