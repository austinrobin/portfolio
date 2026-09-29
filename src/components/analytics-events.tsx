"use client";

import { useEffect } from "react";
import { trackEvent, type SiteEvent } from "@/lib/analytics";

/*
 * Interactions marked in the markup — data-track="case_open"
 * data-track-label="High" — are sent as events on the press, site-wide.
 * Programmatic ones (the record playing, a drag on the desk) call
 * trackEvent themselves.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    const press = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]") as HTMLElement | null;
      if (!el) return;
      trackEvent(el.dataset.track as SiteEvent, el.dataset.trackLabel);
    };
    document.addEventListener("pointerdown", press, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", press, { capture: true });
  }, []);
  return null;
}
