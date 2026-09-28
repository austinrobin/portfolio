"use client";

import { useEffect } from "react";
import { ScrollSmoother } from "@/lib/gsap";

/* Scrolls to the element a URL hash names — instantly, so the section is
   already there when the loader lifts. ScrollSmoother owns the scroll on
   this page (native anchor jumps land on the untransformed content), so
   it goes through the smoother when one exists. */
export function scrollToHash(hash: string, smooth: boolean) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const smoother = ScrollSmoother.get();
  if (smoother) smoother.scrollTo(el, smooth, "top 0px");
  else el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

export function ScrollToHash() {
  useEffect(() => {
    const go = () => scrollToHash(window.location.hash, false);
    /* the smoother is created by a layout effect that can land after the
       page's first paint on a busy machine — so the jump is re-asserted a
       few times; it is idempotent */
    const timers = [0, 120, 400, 900, 1600].map((ms) => window.setTimeout(go, ms));
    window.addEventListener("hashchange", go);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("hashchange", go);
    };
  }, []);
  return null;
}
