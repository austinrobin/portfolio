"use client";

import { useCallback, useEffect, useState } from "react";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { heroFonts, INK } from "./hero-config";
import {
  lifeConfig,
  youtubeId,
  type LifePhoto,
  type LifeSettings,
  type LifeVideo,
} from "./life-config";
import { mediaUrl } from "@/lib/media-url";

/*
 * Studio / Life — the desk spread.
 *
 * Reference: a teaser spread of three instax prints scattered on white with
 * a short note top-right, a cassette on the right and a handwritten line
 * with a clover at the bottom. Translated into the site's paper world:
 * three polaroids of Austin's, the note in the display serif, the cassette
 * is his YouTube channel (press it, the film opens over the page), and the
 * clover line is in the script. Everything lives in content/life.json.
 *
 * Every piece is draggable on desktop — pick it up, move it, the pile is
 * yours to mess up. On small screens the same pieces settle into a loose
 * static drift. Light, not cluttered: six pieces, one overlap each.
 */

type Placed =
  | { id: string; kind: "photo"; index: number; left?: string; right?: string; top: string; width: number; z: number }
  | { id: string; kind: "lines" | "cassette" | "note"; left?: string; right?: string; top: string; width: number; rotate: number; z: number };

const SPREAD: Placed[] = [
  { id: "p1", kind: "photo", index: 0, left: "4%", top: "3%", width: 310, z: 2 },
  { id: "p2", kind: "photo", index: 1, left: "33%", top: "26%", width: 270, z: 3 },
  { id: "p3", kind: "photo", index: 2, left: "3%", top: "55%", width: 275, z: 1 },
  { id: "lines", kind: "lines", right: "4%", top: "8%", width: 330, rotate: 0, z: 4 },
  { id: "tape", kind: "cassette", right: "0%", top: "33%", width: 410, rotate: 0, z: 5 },
  { id: "note", kind: "note", right: "8%", top: "76%", width: 330, rotate: -2, z: 6 },
];

/* ---------------------------------------------------------------- pieces */

function Polaroid({ photo }: { photo: LifePhoto }) {
  return (
    <div className="relative">
      <div className="rounded-[3px] bg-white p-3 shadow-[0_18px_44px_rgba(26,25,19,0.18)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-subtle">
          {photo.src ? (
            /* eslint-disable-next-line @next/next/no-img-element -- collage
               photos are small local files; the frame sizes them, not next/image */
            <img
              src={mediaUrl(photo.src)}
              alt={photo.caption}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted/70">
                35mm · soon
              </span>
            </div>
          )}
        </div>
        <p
          className="mt-3 h-8 text-center text-[22px] leading-none"
          style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
        >
          {photo.caption}
        </p>
      </div>
      {photo.date ? (
        <p
          className="absolute bottom-2 left-3 text-[15px] leading-none"
          style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
        >
          {photo.date}
        </p>
      ) : null}
    </div>
  );
}

function Lines({ cfg }: { cfg: LifeSettings }) {
  return (
    <div className="text-right">
      {cfg.lines.map((l, i) => (
        <p
          key={i}
          className="text-[17px] leading-[1.6] tracking-[0.01em] text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {l}
        </p>
      ))}
      <p
        className="mt-6 text-[17px] leading-none tracking-[0.01em]"
        style={{ fontFamily: "var(--font-display)", color: INK }}
      >
        {cfg.signoff}
      </p>
      <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-muted">
        {cfg.handle}
      </p>
    </div>
  );
}

function Reel({ spin }: { spin: boolean }) {
  return (
    <svg
      viewBox="0 0 36 36"
      className={`size-9 ${spin ? "motion-safe:group-hover:[animation:spin_2.4s_linear_infinite]" : ""}`}
      aria-hidden
    >
      <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="7" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return (
          <line
            key={i}
            x1={18 + Math.cos(a) * 7}
            y1={18 + Math.sin(a) * 7}
            x2={18 + Math.cos(a) * 11}
            y2={18 + Math.sin(a) * 11}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function Cassette({ video, onPlay }: { video: LifeVideo; onPlay?: () => void }) {
  const playable = !!onPlay;
  const body = (
    <>
      {/* screws */}
      {["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"].map((pos) => (
        <span
          key={pos}
          className={`absolute ${pos} size-[5px] rounded-full`}
          style={{ background: "rgba(26,25,19,0.3)" }}
        />
      ))}
      {/* label */}
      <div
        className="rounded-[4px] border bg-white px-4 pb-3 pt-3"
        style={{ borderColor: "rgba(26,25,19,0.1)" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="text-[20px] uppercase leading-none tracking-[0.02em]"
            style={{ fontFamily: "var(--font-silk)", color: INK }}
          >
            {video.title}
          </p>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.25em] text-muted">
            {playable ? "play ▶" : "coming soon"}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-muted">{video.sub}</p>
        {/* window */}
        <div
          className="mt-3 flex items-center justify-between rounded-[3px] px-5 py-2"
          style={{ background: "#2A2925" }}
        >
          <Reel spin={playable} />
          <span className="mx-3 h-[3px] flex-1 rounded-full" style={{ background: "#7A5C33" }} />
          <Reel spin={playable} />
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="h-[3px] flex-1 rounded-full" style={{ background: INK }} />
          <span className="h-[3px] w-10 rounded-full" style={{ background: INK, opacity: 0.45 }} />
        </div>
      </div>
      {/* the head opening */}
      <div
        className="mx-auto mt-2 flex h-6 w-[62%] items-center justify-between rounded-b-[6px] px-4"
        style={{ background: "rgba(26,25,19,0.07)" }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="size-[6px] rounded-full" style={{ background: "rgba(26,25,19,0.28)" }} />
        ))}
      </div>
    </>
  );
  const cls =
    "group relative block w-full rounded-[10px] border p-[10px] text-left shadow-[0_18px_44px_rgba(26,25,19,0.18)]";
  const style = {
    background: "linear-gradient(180deg,#FBFAF6,#EDEAE2)",
    borderColor: "rgba(26,25,19,0.14)",
  };
  return playable ? (
    <button type="button" onClick={onPlay} aria-label={`Play ${video.title}`} className={`${cls} cursor-pointer`} style={style}>
      {body}
    </button>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

function Clover({ className }: { className?: string }) {
  const leaf =
    "M20 19 C18 12 11 8.5 9 12.5 C7 16.5 14 20 20 19 C26 20 33 16.5 31 12.5 C29 8.5 22 12 20 19 Z";
  return (
    <svg viewBox="0 0 40 44" className={className} aria-hidden fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {[0, 90, 180, 270].map((r) => (
        <path key={r} d={leaf} transform={`rotate(${r} 20 20)`} />
      ))}
      <path d="M21 23 C22 29 24 34 28 41" />
    </svg>
  );
}

function Note({ note }: { note: string[] }) {
  return (
    <div className="flex items-start gap-3">
      <Clover className="mt-1 h-11 w-10 shrink-0" />
      <div>
        {note.map((l, i) => (
          <p
            key={i}
            className="text-[27px] leading-[1.15]"
            style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
          >
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function VideoLightbox({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] grid place-items-center p-4 sm:p-8"
      style={{ background: "rgba(249,247,241,0.92)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-[960px]" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[4px] bg-white p-2 shadow-[0_30px_80px_rgba(26,25,19,0.28)]">
          <div className="relative aspect-video overflow-hidden rounded-[2px] bg-black">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="flex items-center justify-between px-2 pb-1 pt-2">
            <p className="text-[22px] leading-none" style={{ fontFamily: "var(--font-peristiwa)", color: INK }}>
              {title}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted hover:text-foreground"
            >
              close ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- section */

export function LifeCollage({ overrides }: { overrides?: Partial<LifeSettings> }) {
  const cfg: LifeSettings = { ...lifeConfig, ...overrides };
  const canvasRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const zTop = useRef(10);
  const [zMap, setZMap] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const videoId = youtubeId(cfg.video.url);
  const closeVideo = useCallback(() => setPlaying(false), []);
  const play = videoId ? () => setPlaying(true) : undefined;

  const lift = (id: string) => {
    zTop.current += 1;
    setZMap((m) => ({ ...m, [id]: zTop.current }));
  };

  const rotateOf = (p: Placed) =>
    p.kind === "photo" ? (cfg.photos[p.index]?.rotate ?? 0) : p.rotate;

  const body = (p: Placed) => {
    switch (p.kind) {
      case "photo": {
        const photo = cfg.photos[p.index];
        return photo ? <Polaroid photo={photo} /> : null;
      }
      case "lines":
        return <Lines cfg={cfg} />;
      case "cassette":
        return <Cassette video={cfg.video} onPlay={play} />;
      case "note":
        return <Note note={cfg.note} />;
    }
  };

  return (
    <section
      aria-label="Studio and life"
      className={`${heroFonts.silk.variable} ${heroFonts.peristiwa.variable} overflow-hidden`}
    >
      <h2 className="sr-only">Studio / Life</h2>

      {/* -------- desktop: the draggable desk -------- */}
      <div
        ref={canvasRef}
        className="relative mx-auto mt-16 hidden h-[820px] max-w-6xl md:block"
      >
        {SPREAD.map((p, i) => {
          const rotate = rotateOf(p);
          return (
            <motion.div
              key={p.id}
              className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
              style={{ left: p.left, right: p.right, top: p.top, width: p.width, zIndex: zMap[p.id] ?? p.z }}
              initial={reduce ? false : { opacity: 0, y: 28, rotate: rotate + (i % 2 ? 5 : -5) }}
              whileInView={{ opacity: 1, y: 0, rotate }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              drag
              dragConstraints={canvasRef}
              dragElastic={0.18}
              dragMomentum={false}
              whileHover={reduce ? undefined : { rotate: rotate * 0.4, y: -4 }}
              whileDrag={{ scale: 1.04, rotate: 0 }}
              onDragStart={() => lift(p.id)}
            >
              {body(p)}
            </motion.div>
          );
        })}
      </div>

      {/* -------- small screens: the same pieces, settled -------- */}
      <div className="mx-auto mt-12 flex max-w-xl flex-wrap items-start justify-center gap-x-5 gap-y-10 px-6 pb-4 md:hidden">
        {SPREAD.map((p, i) => {
          const rotate = rotateOf(p);
          const wide = p.kind !== "photo";
          return (
            <motion.div
              key={p.id}
              className={wide ? "w-full max-w-[380px]" : "w-[46%] min-w-[150px] max-w-[240px]"}
              style={{ rotate: rotate * 0.7 }}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              {body(p)}
            </motion.div>
          );
        })}
      </div>

      <div className="pb-20 sm:pb-24" />

      {playing && videoId ? (
        <VideoLightbox id={videoId} title={cfg.video.title} onClose={closeVideo} />
      ) : null}
    </section>
  );
}
