import type { CaseStudy } from "@/lib/case-studies";

export const stockbee: CaseStudy = {
  slug: "stockbee",
  title: "StockBee",
  tagline:
    "AI-powered stock intelligence designed to help traders identify opportunities the moment they emerge.",
  summary:
    "AI-powered stock intelligence that turns market-moving events into glanceable signals — delivered on WhatsApp and a real-time trader's command centre.",
  year: "2026",
  tags: ["Product", "Brand", "Strategy", "Fintech", "0→1"],
  role: "Lead Product Designer",
  team: "Led a team of 5 designers",
  skills: [
    "Product Strategy",
    "Experience Design",
    "Brand Identity",
    "Visual Direction",
    "Design Leadership",
  ],
  featured: true,
  order: 1,

  overview: [
    "Markets move in seconds.",
    "Yet most traders still rely on fragmented workflows, switching between news platforms, filings, screeners, research tools, and trading terminals just to understand what changed.",
    "We saw an opportunity to turn market information into market intelligence.",
    "StockBee was created to surface meaningful signals the moment they appear, transforming complex market updates into actionable insights delivered directly through WhatsApp and a real-time command centre built for traders.",
  ],

  sections: [
    {
      kind: "image",
      id: "preview",
      theme: "dark",
      caption: "Product preview — WhatsApp alerts + Trader's Den command centre",
    },
    {
      kind: "narrative",
      id: "five-second-advantage",
      navLabel: "The Five-Second Advantage",
      eyebrow: "The Experience",
      title: "The Five-Second Advantage",
      hook: [
        "Traders don't have time to read reports.",
        "They need to understand whether something matters.",
      ],
      body: [
        "Every alert was designed around a simple principle: communicate relevance in seconds.",
        "Instead of forwarding raw announcements, StockBee transforms market-moving events into structured intelligence. Each alert combines sentiment, price movement, context, and AI-powered summaries into a format designed to be understood at a glance.",
        "The result is an experience that reduces noise, accelerates understanding, and helps traders focus on what deserves their attention.",
      ],
    },
    {
      kind: "image",
      id: "alert-anatomy",
      theme: "dark",
      caption: "Anatomy of an alert — stock, price, sentiment, type, AI summary",
    },
    {
      kind: "narrative",
      id: "signal-to-conviction",
      navLabel: "From Signal to Conviction",
      eyebrow: "Depth on Demand",
      title: "From Signal to Conviction",
      hook: ["Speed creates awareness.", "Confidence comes from context."],
      body: [
        "Every alert expands into a deeper layer of intelligence, bringing together financial performance, sentiment analysis, source attribution, market impact, and AI-generated breakdowns into a single experience.",
        "Rather than forcing users to navigate multiple platforms and reports, StockBee brings the full story into one place, helping traders move from awareness to understanding without breaking their flow.",
      ],
    },
    {
      kind: "narrative",
      id: "opportunity-engine",
      navLabel: "The Opportunity Engine",
      eyebrow: "Trader's Den",
      title: "The Opportunity Engine",
      hook: [
        "The best opportunities are rarely found by reacting faster.",
        "They're found before everyone else notices.",
      ],
      body: [
        "To support discovery at scale, I designed Trader's Den, a real-time command centre that helps traders uncover momentum, identify breakouts, monitor sector movements, track derivatives activity, and discover opportunities across the market.",
        "The experience was built to balance information density with clarity, allowing users to scan large volumes of market activity while maintaining focus on the signals that matter most.",
      ],
    },
    {
      kind: "image",
      id: "traders-den",
      theme: "dark",
      caption: "Trader's Den — the market-wide command centre",
    },
    {
      kind: "callout",
      id: "designing-for-trust",
      navLabel: "Designing for Trust",
      eyebrow: "The Challenge",
      text: "When information influences decisions involving real money, clarity becomes more than a usability challenge. It becomes a product requirement.",
    },
    {
      kind: "narrative",
      id: "trust",
      navLabel: "Designing for Trust",
      title: "Designing for Trust",
      hook: ["Financial products operate on trust."],
      body: [
        "From sentiment indicators and source attribution to information hierarchy and visual cues, every interaction was designed to help users move quickly without sacrificing confidence.",
        "The challenge was not simply making information faster to consume, but making it reliable enough to act on.",
      ],
    },
    {
      kind: "narrative",
      id: "brand",
      navLabel: "A Brand Built for Urgency",
      eyebrow: "Brand & Identity",
      title: "A Brand Built for Urgency",
      hook: ["A visual system that feels focused, intelligent, and immediate."],
      body: [
        "Alongside the product experience, I developed the visual identity and design language that shaped StockBee across product, marketing, and future platform extensions.",
        "Inspired by professional trading environments, real-time communication platforms, and modern AI products, the visual system balances precision with accessibility. A dark, signal-driven interface paired with vibrant data cues creates an experience that feels focused, intelligent, and immediate.",
        "The identity was designed to reinforce the product's core promise: delivering clarity when every second matters.",
      ],
    },
    {
      kind: "image",
      id: "brand-system",
      theme: "dark",
      caption: "Brand & visual system — logo, colour, type, and data language",
    },
    {
      kind: "narrative",
      id: "shaping-the-system",
      navLabel: "Shaping the System",
      eyebrow: "Role & Leadership",
      title: "Shaping the System",
      hook: ["From early concept to shipped product."],
      body: [
        "As Lead Product Designer, I helped shape StockBee from an early concept into a shipped product, leading a team of five designers while defining the product vision, experience principles, visual language, and design direction across the platform.",
        "My role extended beyond interface design, spanning product strategy, stakeholder collaboration, systems thinking, and creating a cohesive experience across alerts, research tools, trading workflows, and brand touchpoints.",
      ],
    },
    {
      kind: "impact",
      id: "impact",
      navLabel: "Impact",
      title: "Impact",
      stats: [
        { value: "XXK+", label: "Active Users", placeholder: true },
        { value: "7,000+", label: "Stocks Tracked" },
        { value: "XXM+", label: "Alerts Delivered", placeholder: true },
        { value: "XX%", label: "User Retention", placeholder: true },
        { value: "XXM+", label: "Market Events Processed", placeholder: true },
        { value: "XX%", label: "Increase in Engagement", placeholder: true },
      ],
    },
    {
      kind: "closing",
      id: "closing",
      hook: ["Markets reward speed.", "Great products create clarity."],
      body: [
        "StockBee was an exploration of both, transforming fragmented information into actionable intelligence and helping traders focus less on finding information and more on acting on it.",
      ],
    },
  ],
};
