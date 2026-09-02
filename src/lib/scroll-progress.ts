"use client";

import type { RefObject } from "react";
import { useMotionValue } from "motion/react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";

/*
 * GSAP spine ↔ motion choreography bridge.
 *
 * ScrollSmoother scrolls the site by transforming #smooth-content, which
 * breaks CSS position:sticky and skews motion's own useScroll() readings.
 * These hooks move the two jobs onto ScrollTrigger — progress measurement
 * and pinning — while every existing useTransform() chain keeps reading a
 * MotionValue exactly as before. The approved choreography is untouched;
 * only the spine underneath it changed.
 *
 * Offset translation from motion's useScroll:
 *   ["start start", "end end"]  →  "top top",    "bottom bottom"
 *   ["start end",   "start start"] → "top bottom", "top top"
 *   ["start end",   "end start"]  →  "top bottom", "bottom top"
 *   ["start 0.92",  "start 0.4"]  →  "top 92%",   "top 40%"
 */

export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  start: string,
  end: string,
) {
  const mv = useMotionValue(0);
  useGSAP(() => {
    const el = target.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      onUpdate: (self) => mv.set(self.progress),
      onRefresh: (self) => mv.set(self.progress),
    });
    mv.set(st.progress);
  }, [start, end]);
  return mv;
}

/* GSAP-pinned section: the trigger element provides the scroll span (it is
   already sized taller than the viewport), the pin element rides inside it
   — a 1:1 replacement for `sticky top-0` that survives ScrollSmoother. */
export function usePinned(
  trigger: RefObject<HTMLElement | null>,
  pin: RefObject<HTMLElement | null>,
) {
  useGSAP(() => {
    if (!trigger.current || !pin.current) return;
    ScrollTrigger.create({
      trigger: trigger.current,
      start: "top top",
      end: "bottom bottom",
      pin: pin.current,
      pinSpacing: false,
    });
  }, []);
}
