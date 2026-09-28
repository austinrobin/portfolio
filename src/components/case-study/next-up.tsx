"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useTransform } from "motion/react";
import { showcase, type ShowcaseItem } from "@/lib/showcase";
import { pickVideoSources, type VideoSource } from "@/lib/video-sources";
import { mediaUrl } from "@/lib/media-url";
import { usePinned, useScrollProgress } from "@/lib/scroll-progress";
import { heroFonts, INK, PAPER } from "@/components/home/hero-config";

/*
 * The end of every case study. The closing screen (Outcome) is pushed off
 * to the left and dimmed while an ink field takes the room; then the next
 * project opens up from the bottom-right corner — its cover grows until it
 * fills the screen, and it is one link: click, next story.
 *
 * Scroll-driven, on the deck's spine: the tall section is the scroll
 * distance, the viewport-high stage inside it is pinned for the run.
 */

/** the project after this one in the deck's order (wrapping round) */
export function nextProject(slug: string): ShowcaseItem | null {
  const withPages = showcase.filter((s) => s.href);
  if (withPages.length < 2) return null;
  const i = withPages.findIndex((s) => s.id === slug);
  return withPages[(i + 1) % withPages.length] ?? null;
}

const TRAVEL = "280svh";

export function NextUp({
  next,
  id,
  children,
}: {
  next: ShowcaseItem;
  /** chapter id for the index (the trigger carries it) */
  id: string;
  /** the closing screen's content */
  children: React.ReactNode;
}) {
  const trigger = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  usePinned(trigger, stage);
  const p = useScrollProgress(trigger, "top top", "bottom bottom");

  /* the screen leaves to the left and dims over the first third — a strip
     of it stays at the edge, then it is gone once the cover has the room */
  const screenX = useTransform(p, [0, 0.36, 1], ["0vw", "-78vw", "-100vw"]);
  const screenOpacity = useTransform(p, [0, 0.36, 0.82, 1], [1, 0.3, 0.3, 0]);
  /* the panel's copy arrives as the screen leaves, and steps aside once the
     cover has taken the whole screen */
  const copyOpacity = useTransform(p, [0.1, 0.36, 0.86, 1], [0, 1, 1, 0]);
  const copyY = useTransform(p, [0.1, 0.36], [28, 0]);
  /* the cover opens from the corner: a thumbnail that grows to the full stage */
  const coverW = useTransform(p, [0.3, 1], ["42%", "100%"]);
  const coverH = useTransform(p, [0.3, 1], ["46%", "100%"]);
  const coverRadius = useTransform(p, [0.7, 1], [10, 0]);
  const coverOpacity = useTransform(p, [0.14, 0.3], [0, 1]);

  return (
    <section ref={trigger} id={id} data-chapter={id} className="relative" style={{ height: TRAVEL }}>
      <div ref={stage} className={`relative h-svh w-full overflow-hidden ${heroFonts.silk.variable}`} style={{ background: INK, color: PAPER }}>
        {/* ---- the ink field: next project's name ---- */}
        <motion.div className="absolute inset-0 z-10" style={{ opacity: copyOpacity, y: copyY }}>
          {/* the copy sits to the right of the strip the old screen leaves behind */}
          <div className="absolute left-[27vw] top-[16svh] font-mono text-[11px] font-semibold uppercase tracking-[0.25em] opacity-70">
            Next up
          </div>
          <div className="absolute left-[27vw] top-[28svh] max-w-[52vw]">
            <p
              className="text-[clamp(36px,5.6vw,92px)] font-bold uppercase leading-[0.92] tracking-[0.01em]"
              style={{ fontFamily: "var(--font-silk)" }}
            >
              {next.title}
            </p>
            <p className="mt-5 max-w-[34ch] text-[clamp(16px,1.35vw,21px)] leading-[1.3] opacity-75">{next.subtitle}</p>
          </div>
          <Link
            href="/#work"
            className="absolute bottom-[7svh] left-[27vw] font-mono text-[11px] uppercase tracking-[0.22em] opacity-70 transition-opacity hover:opacity-100"
          >
            [ All projects ]
          </Link>
        </motion.div>

        {/* ---- the cover, opening from the bottom-right corner ---- */}
        <motion.div
          className="absolute bottom-0 right-0 z-20 overflow-hidden"
          style={{ width: coverW, height: coverH, borderRadius: coverRadius, opacity: coverOpacity }}
        >
          <Link href={next.href ?? "/#work"} aria-label={`Next project: ${next.title}`} className="group absolute inset-0 block bg-black">
            <Cover item={next} progress={p} />
            <span className="absolute bottom-5 left-5 flex items-center gap-2 rounded-[4px] px-[9px] py-[6px] font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F9F7F1] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-md" style={{ background: "rgba(16,27,188,0.9)" }}>
              Open project
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M1.5 6h9M7 2.5 10.5 6 7 9.5" />
              </svg>
            </span>
          </Link>
        </motion.div>

        {/* ---- the closing screen, on top, pushed to the left ---- */}
        <motion.div className="absolute inset-0 z-30 bg-background text-foreground" style={{ x: screenX, opacity: screenOpacity }}>
          <div className="mx-auto flex h-full max-w-6xl items-center px-0 md:px-[clamp(8px,1.1vw,22px)]">
            <div className="w-full">{children}</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* the next project's deck cover: its poster, and the reel once the ending
   is a viewport away; it plays while the cover is opening */
function Cover({ item, progress }: { item: ShowcaseItem; progress: ReturnType<typeof useScrollProgress> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sources, setSources] = useState<VideoSource[] | null>(null);
  const isVideo = !!item.cover && item.cover.endsWith(".mp4");
  useEffect(() => {
    const el = ref.current;
    if (!el || !isVideo || !item.cover) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSources((s) => s ?? pickVideoSources(item.cover!));
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isVideo, item.cover]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !sources) return;
    if (el.readyState === 0) el.load();
    const sync = (v: number) => {
      if (v > 0.2) el.play().catch(() => {});
      else el.pause();
    };
    sync(progress.get());
    return progress.on("change", sync);
  }, [sources, progress]);
  if (!item.cover) return <div className="absolute inset-0" style={{ background: item.theme.bg }} />;
  if (!isVideo) {
    // eslint-disable-next-line @next/next/no-img-element -- a cover still at its own size
    return <img src={mediaUrl(item.cover)} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <video
      ref={ref}
      poster={item.coverPoster ? mediaUrl(item.coverPoster) : undefined}
      muted
      loop
      playsInline
      preload={sources ? "metadata" : "none"}
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
    >
      {sources?.map((s) => (
        <source key={s.src} src={s.src} type={s.type} />
      ))}
    </video>
  );
}
