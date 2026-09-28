"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Curtain } from "./plate-run";

/* First paint of the site: the curtain is in the server HTML, so it covers
   the page before anything else loads; it lifts once the document has loaded
   and at least one loop of the plates has played (never later than 4 s). */
const MIN_MS = 1200;
const MAX_MS = 4000;

let booted = false;
/** true once the first-load curtain has lifted — route curtains use it */
export const hasBooted = () => booted;

export function SiteLoader() {
  const pathname = usePathname();
  const [state, setState] = useState<"cover" | "lift" | "gone">("cover");
  const studio = pathname.startsWith("/studio");

  useEffect(() => {
    if (studio) {
      booted = true;
      return;
    }
    const t0 = performance.now();
    let done = false;
    const lift = () => {
      if (done) return;
      done = true;
      booted = true;
      setState("lift");
      window.setTimeout(() => setState("gone"), 800);
    };
    // the document's load event (fonts from next/font are preloaded and
    // block first paint, so they are in by then), never before MIN_MS
    let min = 0;
    const onLoad = () => { min = window.setTimeout(lift, Math.max(0, MIN_MS - (performance.now() - t0))); };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    const cap = window.setTimeout(lift, MAX_MS);
    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(min);
      window.clearTimeout(cap);
    };
  }, [studio]);

  if (studio || state === "gone") return null;
  return <Curtain lift={state === "lift"} />;
}
