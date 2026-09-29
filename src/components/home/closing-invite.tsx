import { heroFonts, INK } from "./hero-config";
import { Reveal } from "@/components/motion";
import { siteConfig } from "@/lib/site";

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
            className="mt-9 inline-flex items-center rounded-full border border-[#101BBC] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[#101BBC] transition-colors duration-300 hover:bg-[#101BBC] hover:text-[#F9F7F1]"
          >
            {c.cta}
          </a>
        ) : null}
      </Reveal>
    </section>
  );
}
