"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Monogram } from "@/components/home/monogram";

/*
 * The banknote nav — links flanking the signature monogram, at the exact
 * Figma percentages used by the landing hero.
 *
 * NOTE: this is a faithful copy of the nav inside portrait-hero.tsx, which
 * is frozen under checkpoint-01-banknote-hero. When that lock lifts, the
 * hero should import this and the duplicate should go.
 */

const navLinks = [
  { label: "Work", href: "/work", left: "6.61%" },
  { label: "About", href: "/about", left: "21.9%" },
  { label: "Writing", href: "/writing", left: "64.9%" },
  { label: "Contact", href: "/contact", left: "80.4%" },
];

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
  /* blend: the nav rides over media — white ink in difference mode reads
     on paper (inverts to near-black) and on any image alike */
  const header = (
    <header
      data-banknote-nav
      className={`${portal ? "fixed z-[60]" : "absolute z-30"} inset-x-0 top-0 ${blend ? "text-white mix-blend-difference" : ""}`}
    >
      <Link
        href="/"
        aria-label="Austin Moras — home"
        className="absolute left-1/2 top-[3.6svh] block h-[6.2svh] min-h-10 -translate-x-1/2"
      >
        <Monogram className="h-full w-auto" />
      </Link>
      <nav className="hidden md:block">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="absolute top-[5.9svh] text-[clamp(11px,1.06vw,16px)] font-medium uppercase tracking-[0.02em] transition-opacity hover:opacity-60"
            style={{ left: l.left, fontFamily: "var(--font-silk)" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {/* narrow: two links each side of the monogram */}
      <nav className="flex items-center justify-between px-5 pt-[4.2svh] md:hidden">
        <div className="flex gap-4">
          {navLinks.slice(0, 2).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] font-medium uppercase"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-4">
          {navLinks.slice(2).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] font-medium uppercase"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
  return portal ? createPortal(header, document.body) : header;
}
