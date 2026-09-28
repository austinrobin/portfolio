"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Monogram } from "@/components/home/monogram";
import { heroFonts, INK } from "@/components/home/hero-config";
import { siteConfig } from "@/lib/site";
import { scrollToHash } from "@/components/scroll-to-hash";

/*
 * The banknote nav — links flanking the signature monogram, at the exact
 * Figma percentages used by the landing hero.
 *
 * Gallery is a page. Works glides to the deck on the home page (and goes
 * to /#work from anywhere else). Resume opens the PDF in a new tab.
 * Contact opens a mail draft. Email and resume path live in content/site.json.
 *
 * NOTE: the hero in portrait-hero.tsx carries its own (hidden) copy of the
 * old nav, frozen under checkpoint-01-banknote-hero.
 */

type NavItem = { label: string; href: string; left: string; kind: "page" | "scroll" | "file" | "mail" };

const navLinks: NavItem[] = [
  { label: "Gallery", href: "/gallery", left: "6.61%", kind: "page" },
  { label: "Works", href: "/#work", left: "21.9%", kind: "scroll" },
  { label: "Resume", href: siteConfig.resume ?? "#", left: "64.9%", kind: "file" },
  { label: "Contact", href: `mailto:${siteConfig.email}`, left: "80.4%", kind: "mail" },
];

/* on the home page Works scrolls in place; elsewhere the link carries on to /#work */
function onWorks(e: React.MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;
  e.preventDefault();
  scrollToHash("#work", true);
}

function NavLink({ item, className, style }: { item: NavItem; className: string; style: React.CSSProperties }) {
  if (item.kind === "page") {
    return (
      <Link href={item.href} className={className} style={style}>
        {item.label}
      </Link>
    );
  }
  if (item.kind === "scroll") {
    // scroll={false}: the home page's hash handler places the deck itself
    return (
      <Link href={item.href} onClick={onWorks} scroll={false} className={className} style={style}>
        {item.label}
      </Link>
    );
  }
  return (
    <a
      href={item.href}
      className={className}
      style={style}
      {...(item.kind === "file" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {item.label}
    </a>
  );
}

export function BanknoteNav({
  blend = false,
  fixed = false,
}: {
  blend?: boolean;
  /** pin to the viewport through a body portal — position:fixed is dead
      inside ScrollSmoother's transformed content. Pages animate it via
      [data-banknote-nav]. */
  fixed?: boolean;
}) {
  // hydration-safe "am I on the client" — false on the server pass, true after
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const portal = fixed && mounted;
  /* the links stay put; only the monogram slips up once the page scrolls,
     and returns at the top */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const silk = { fontFamily: "var(--font-silk)" };
  /* blend: the nav rides over media — white ink in difference mode reads
     on paper (inverts to near-black) and on any image alike */
  const header = (
    <header
      data-banknote-nav
      /* self-contained: carries the Silk variable and the hero's ink itself,
         so it matches the home nav wherever it renders — including a body
         portal, outside any page's font/colour scope */
      className={`${portal ? "fixed z-[60]" : "absolute z-30"} inset-x-0 top-0 ${heroFonts.silk.variable} ${blend ? "text-white mix-blend-difference" : ""}`}
      style={blend ? undefined : { color: INK }}
    >
      <Link
        href="/"
        aria-label="Austin Moras — home"
        className={`absolute left-1/2 top-[1.5svh] block h-[6.2svh] min-h-10 -translate-x-1/2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "-translate-y-[160%] opacity-0" : "translate-y-0 opacity-100"}`}
      >
        <Monogram className="h-full w-auto" />
      </Link>
      <nav className="hidden md:block">
        {navLinks.map((l) => (
          <NavLink
            key={l.label}
            item={l}
            className="absolute top-[3.7svh] text-[clamp(11px,1.06vw,16px)] font-medium uppercase tracking-[0.02em] after:absolute after:-bottom-[0.35em] after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100"
            style={{ left: l.left, ...silk }}
          />
        ))}
      </nav>
      {/* narrow: two links each side of the monogram */}
      <nav className="flex items-center justify-between px-5 pt-[2.4svh] md:hidden">
        <div className="flex gap-4">
          {navLinks.slice(0, 2).map((l) => (
            <NavLink key={l.label} item={l} className="text-[11px] font-medium uppercase" style={silk} />
          ))}
        </div>
        <div className="flex gap-4">
          {navLinks.slice(2).map((l) => (
            <NavLink key={l.label} item={l} className="text-[11px] font-medium uppercase" style={silk} />
          ))}
        </div>
      </nav>
    </header>
  );
  return portal ? createPortal(header, document.body) : header;
}
