"use client";

import { useEffect, useState } from "react";

/* A small, intentional living detail — reflects Austin's local time + a wry
   status. Computed after mount to avoid hydration mismatch. */
function statusFor(hour: number): string {
  if (hour < 6) return "probably asleep — or shipping";
  if (hour < 12) return "likely designing";
  if (hour < 17) return "deep in a build";
  if (hour < 22) return "sketching something";
  return "up too late, tinkering";
}

export function NowLine() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Reserve the line height before mount so nothing shifts.
  if (!now) return <span className="opacity-0">Local time —</span>;

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      Local time {time} — {statusFor(now.getHours())}
    </>
  );
}
