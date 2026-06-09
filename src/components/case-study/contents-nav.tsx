"use client";

import { useEffect, useState } from "react";

export function ContentsNav({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Contents" className="sticky top-24">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        Contents
      </p>
      <ul className="space-y-2.5 border-l border-border">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="-ml-px">
              <a
                href={`#${item.id}`}
                className={`block border-l-2 pl-4 text-sm leading-snug transition-colors ${
                  isActive
                    ? "border-accent font-medium text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
