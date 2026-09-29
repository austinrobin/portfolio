import { heroFonts, INK } from "./hero-config";
import { Reveal } from "@/components/motion";
import { siteConfig } from "@/lib/site";
import { caseFont } from "@/components/case-study/case-font";


/*
 * The last word before the banknote: the desk winds down, and the page
 * turns to the reader — a line in the site's two faces (Silk caps, then the
 * script) and one button that opens a mail. Copy lives in content/site.json
 * (Studio › Site).
 */
export function ClosingInvite() {
  const c = siteConfig.closing;
  if (!c?.line && !c?.ask) return null;
  const href = `mailto:${siteConfig.email}?subject=${encodeURIComponent(c.subject || "What I'm working on")}`;
  return (
    <section
      aria-label="Get in touch"
      className={`${heroFonts.silk.variable} ${heroFonts.peristiwa.variable} px-6 pb-28 pt-4 text-center sm:pb-36`}
    >
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center">
        {c.line ? (
          <p
            className="text-[clamp(13px,1.05vw,16px)] font-medium uppercase tracking-[0.18em]"
            style={{ fontFamily: "var(--font-silk)", color: INK }}
          >
            {c.line}
          </p>
        ) : null}
        {c.ask ? (
          <p
            className="mt-4 text-[clamp(34px,4.2vw,64px)] leading-[1.05]"
            style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
          >
            {c.ask}
          </p>
        ) : null}
        {c.cta ? (
          <a
            href={href}
            data-track="contact"
            data-track-label="closing"
            className={`group mt-10 inline-flex min-h-[56px] items-center gap-3 border border-[#101BBC] px-8 py-4 text-[clamp(16px,1.25vw,19px)] text-[#101BBC] transition-colors hover:bg-[#101BBC] hover:text-[#F9F7F1] ${caseFont.variable} font-[family-name:var(--font-case)]`}
          >
            {c.cta}
            {/* the deck's swash arrow, a size up */}
            <svg width="24" height="14" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              <path d="M1 6H18.5" />
              <path d="M13.5 1.5L18.5 6l-5 4.5" />
            </svg>
          </a>
        ) : null}
      </Reveal>
    </section>
  );
}
