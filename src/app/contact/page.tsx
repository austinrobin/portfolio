import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { FadeIn } from "@/components/motion";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <FadeIn>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Contact
        </p>
        <h1 className="mt-6 font-display text-5xl leading-tight tracking-tight sm:text-6xl">
          Open to senior &amp; lead product design roles.
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted">
          The fastest way to reach me is email. I&rsquo;m happy to share a fuller
          case-study walkthrough, including work that isn&rsquo;t public.
        </p>

        <a
          href={`mailto:${siteConfig.email}`}
          className="mt-10 inline-block font-display text-3xl text-accent underline-offset-8 hover:underline sm:text-4xl"
        >
          {siteConfig.email}
        </a>

        <div className="mt-14 flex flex-wrap gap-6 border-t border-border pt-8">
          {siteConfig.socials.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              {s.label} ↗
            </Link>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
