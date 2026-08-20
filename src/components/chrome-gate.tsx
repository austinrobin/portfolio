"use client";

import { usePathname } from "next/navigation";

/* The Studio renders the live site beneath a floating panel, so the global
   footer would appear inside the preview. Server-rendered children are
   passed through untouched everywhere else. */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/studio")) return null;
  return <>{children}</>;
}
