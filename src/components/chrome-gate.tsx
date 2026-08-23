"use client";

import { usePathname } from "next/navigation";

/* The Studio renders the live site beneath a floating panel, so the global
   footer would appear inside the preview. Server-rendered children are
   passed through untouched everywhere else. */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // the gallery canvas is a fixed full-viewport layer — no footer under it
  if (pathname.startsWith("/studio") || pathname.startsWith("/gallery")) return null;
  return <>{children}</>;
}
