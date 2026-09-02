"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ScrollSmoother, ScrollTrigger, useGSAP } from "@/lib/gsap";

/*
 * Site-wide inertia scrolling (GSAP ScrollSmoother): the page glides and
 * settles instead of stepping with the wheel. Content scrolls via a
 * transform on the inner div; the native scrollbar and scroll position
 * stay real.
 *
 * Skipped entirely on fixed-viewport worlds (/gallery drives its own WebGL
 * camera, /studio is an overlay with its own chrome) and for reduced
 * motion — there the wrapper divs are inert pass-throughs.
 */

const isImmersive = (p: string) =>
  p.startsWith("/studio") || p.startsWith("/gallery");

/* mirror of nav.tsx's hide list — the global bar is `fixed` (sticky cannot
   live inside the smoother's transform), so scrolling routes that show it
   need its 64px pushed into the content flow */
const hasGlobalNav = (p: string) =>
  !(p === "/" || p.startsWith("/work/") || isImmersive(p));

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isImmersive(pathname)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const wrapper = wrapRef.current;
      const content = wrapper?.firstElementChild;
      if (!wrapper || !content) return;
      ScrollSmoother.create({
        wrapper,
        content: content as HTMLElement,
        smooth: 1.1,
        smoothTouch: 0.1,
        effects: false,
      });
      ScrollTrigger.refresh();
    },
    { dependencies: [pathname] },
  );

  return (
    <div ref={wrapRef} className="w-full">
      <div>
        {hasGlobalNav(pathname) ? <div className="h-16" /> : null}
        {children}
      </div>
    </div>
  );
}
