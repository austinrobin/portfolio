"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Curtain, LIFT_MS } from "./plate-run";

/* First paint of the site: the curtain is in the server HTML, so it covers
   the page before anything else loads; it lifts once the document has loaded
   and at least one loop of the plates has played — and never later than
   3.5 s after the page was opened. Both limits count from navigation start
   (performance.now() is 0 there), not from when this script got to run:
   counting from the script let a slow first load hold the curtain for 10 s+. */
const MIN_MS = 1200;
const MAX_MS = 3500;

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
    let done = false;
    const lift = () => {
      if (done) return;
      done = true;
      booted = true;
      window.dispatchEvent(new Event("site:ready"));
      setState("lift");
      window.setTimeout(() => setState("gone"), LIFT_MS);
    };
    // the document's load event (fonts from next/font are preloaded and
    // block first paint, so they are in by then), never before MIN_MS
    let min = 0;
    const onLoad = () => { min = window.setTimeout(lift, Math.max(0, MIN_MS - performance.now())); };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    const cap = window.setTimeout(lift, Math.max(0, MAX_MS - performance.now()));
    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(min);
      window.clearTimeout(cap);
    };
  }, [studio]);

  if (studio || state === "gone") return null;
  return <Curtain lift={state === "lift"} portal={false} />;
}
