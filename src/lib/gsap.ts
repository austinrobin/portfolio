"use client";

/*
 * Single GSAP entry point — import { gsap, ScrollTrigger, useGSAP } from
 * "@/lib/gsap" instead of "gsap" directly, so plugin registration happens
 * exactly once and every component agrees on the same instances.
 *
 * All plugins are free as of GSAP 3.13+ (SplitText, ScrollSmoother, MorphSVG…)
 * — add registrations here as sections start using them.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin);

/* dev only: lets a tool drive the ticker / inspect tweens from devtools
   (window.__gsap.ticker.tick()) when rAF is throttled or paused */
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as Window & { __gsap?: typeof gsap }).__gsap = gsap;
}

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin };
