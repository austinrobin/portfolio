"use client";

import { useEffect, useRef, useState } from "react";

export function ContentsNav({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Track the section currently in view.
  useEffect(() => {
    const ids = items.map((i) => i.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const idx = ids.indexOf(visible[0].target.id);
          if (idx >= 0) setActive(idx);
        }
      },
      { rootMargin: "-30% 0px -65% 0px", threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  // Move the progress fill to the active dot.
  useEffect(() => {
    const list = listRef.current;
    const li = list?.children[active] as HTMLElement | undefined;
    if (li) setFill(li.offsetTop + 7);
  }, [active, items]);

  return (
    <nav aria-label="Contents">
      <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Contents
      </p>
      <div className="relative">
        {/* full track */}
        <div className="absolute bottom-1.5 left-[3px] top-1.5 w-px bg-border" />
        {/* progress fill */}
        <div
          className="absolute left-[3px] top-1.5 w-px bg-accent transition-[height] duration-500 ease-out"
          style={{ height: `${Math.max(0, fill - 6)}px` }}
        />
        <ul ref={listRef} className="space-y-4">
          {items.map((item, i) => {
            const isActive = i === active;
            const passed = i <= active;
            return (
              <li key={item.id} className="relative pl-5">
                <span
                  className={`absolute left-0 top-[5px] size-[7px] rounded-full border transition-all duration-300 ${
                    isActive
                      ? "border-accent bg-accent ring-[3px] ring-accent/20"
                      : passed
                        ? "border-accent bg-accent"
                        : "border-border bg-background"
                  }`}
                />
                <a
                  href={`#${item.id}`}
                  className={`block text-[13px] leading-snug transition-colors ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
