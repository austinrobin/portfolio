"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { playSfx, warmSfx, type Sfx } from "@/lib/sfx";

/*
 * A typewriter key under every press on a link or button, site-wide. An
 * element can pick another sound with data-sfx ("shutter" on the camera)
 * or opt out with data-sfx="none" (the record — it has its own sound).
 * The three files decode on the first movement, ahead of the first press.
 */
export function SoundEffects() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/studio")) return;
    const warm = () => warmSfx();
    const press = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const el = t?.closest?.("[data-sfx], a, button, [role='button']");
      if (!el) return;
      const name = ((el as HTMLElement).dataset.sfx ?? "key") as Sfx | "none";
      if (name !== "none") playSfx(name);
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointermove", warm, { ...opts, once: true });
    window.addEventListener("pointerdown", warm, { ...opts, once: true });
    document.addEventListener("pointerdown", press, opts);
    return () => {
      window.removeEventListener("pointermove", warm, opts);
      window.removeEventListener("pointerdown", warm, opts);
      document.removeEventListener("pointerdown", press, opts);
    };
  }, [pathname]);
  return null;
}
