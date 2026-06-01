import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { FadeIn, Reveal } from "@/components/motion";

export const metadata: Metadata = {
  title: "About",
  description: "About " + siteConfig.name,
};

const capabilities = [
  "Product design (0→1 and scale)",
  "Brand & visual identity",
  "Design strategy",
  "Design systems",
  "Prototyping & motion",
  "Marketing & growth design",
];

const timeline = [
  {
    year: "Now",
    title: "Lead Product Designer — Fintech for Gen Z",
    body: "Leading design on a consumer fintech product built for a younger generation's relationship with money.",
  },
  {
    year: "Past",
    title: "Multidisciplinary Designer",
    body: "Shipped 3 products across fintech and other industries, spanning brand, product, strategy, and marketing.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <FadeIn>
        <h1 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">
          I&rsquo;m a senior product designer who works across the whole
          product lifecycle.
        </h1>
        <p className="mt-8 text-lg text-muted">
          For about four years I&rsquo;ve worked as a multidisciplinary designer
          — brand, product, strategy, and marketing — mostly in fintech, with
          detours into other industries. I care about the craft of the interface
          and the strategy behind it in equal measure, and I&rsquo;m actively
          exploring how design practice changes as AI becomes part of the
          process.
        </p>
      </FadeIn>

      <Reveal className="mt-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          What I do
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {capabilities.map((c) => (
            <li key={c} className="border-b border-border pb-3 text-lg">
              {c}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="mt-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Selected experience
        </h2>
        <div className="mt-6 space-y-8">
          {timeline.map((item) => (
            <div key={item.title} className="flex flex-col gap-1 sm:flex-row sm:gap-8">
              <span className="shrink-0 font-mono text-sm text-muted sm:w-20">
                {item.year}
              </span>
              <div>
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="mt-1 text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
