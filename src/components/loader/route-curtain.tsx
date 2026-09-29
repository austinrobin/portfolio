"use client";

import { useEffect, useState } from "react";
import { Curtain, LIFT_MS } from "./plate-run";
import { hasBooted } from "./site-loader";

/* Opening a project or the gallery from within the site: the same plates
   run while the page streams in (loading.tsx shows them), then this curtain
   — mounted by the page itself — plays at least one loop and lifts to reveal
   it. On a hard load the first-paint loader already did this, so it stays
   out of the way. */
const MIN_MS = 900;

export function RouteCurtain() {
  /* client navigations render fresh (no hydration), so the curtain can start
     covering on the very first frame; on a hard load `hasBooted()` is still
     false during hydration and the first-paint loader owns the moment */
  const [state, setState] = useState<"idle" | "cover" | "lift">(() => (hasBooted() ? "cover" : "idle"));
  useEffect(() => {
    if (!hasBooted()) return;
    const t = window.setTimeout(() => setState("lift"), MIN_MS);
    const gone = window.setTimeout(() => setState("idle"), MIN_MS + LIFT_MS);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(gone);
    };
  }, []);
  if (state === "idle") return null;
  return <Curtain lift={state === "lift"} />;
}
