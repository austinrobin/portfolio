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
import { VIDEO_TYPE } from "@/lib/video-sources";

/*
 * Studio / Life — the desk spread.
 *
 * Reference: a teaser spread of three instax prints scattered on white with
 * a short note top-right, a cassette on the right and a handwritten line
 * with a clover at the bottom. Translated into the site's paper world:
 * three polaroids of Austin's, the note in the display serif, the camera
 * is his YouTube channel — its screen loops moments from the film (press it,
 * the film opens over the page), and the
 * clover line is in the script. Everything lives in content/life.json.
 *
 * Every piece is draggable on desktop — pick it up, move it, the pile is
 * yours to mess up. On small screens the same pieces settle into a loose
 * static drift. Light, not cluttered: six pieces, one overlap each.
 */

type Placed =
  | { id: string; kind: "photo"; index: number; left?: string; right?: string; top: string; width: number; z: number }
  | { id: string; kind: "lines" | "camera" | "note"; left?: string; right?: string; top: string; width: number; rotate: number; z: number };

const SPREAD: Placed[] = [
  { id: "p1", kind: "photo", index: 0, left: "4%", top: "3%", width: 310, z: 2 },
  { id: "p2", kind: "photo", index: 1, left: "33%", top: "26%", width: 270, z: 3 },
  { id: "p3", kind: "photo", index: 2, left: "3%", top: "55%", width: 275, z: 1 },
  { id: "lines", kind: "lines", right: "4%", top: "8%", width: 330, rotate: 0, z: 4 },
  { id: "camera", kind: "camera", right: "0%", top: "31%", width: 440, rotate: 0, z: 5 },
  { id: "note", kind: "note", right: "8%", top: "76%", width: 330, rotate: -2, z: 6 },
];

/* ---------------------------------------------------------------- pieces */

/* A print lying on paper: a tight contact shadow plus a wide, faint one. */
const PRINT_SHADOW =
  "0 1px 1.5px rgba(26,25,19,0.10), 0 4px 10px rgba(26,25,19,0.10), 0 18px 36px rgba(26,25,19,0.10)";

function Polaroid({ photo }: { photo: LifePhoto }) {
  if (photo.framed && photo.src) {
    /* the frame is part of the picture (a real print, photographed) —
       the caption and date are written onto its bottom border */
    return (
      <div className="relative rounded-[3px]" style={{ boxShadow: PRINT_SHADOW }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a real
            print at its own size; the frame is in the file */}
        <img
          src={mediaUrl(photo.src)}
          alt={photo.caption}
          width={photo.w}
          height={photo.h}
          className="block h-auto w-full rounded-[3px] bg-white"
          style={photo.w && photo.h ? { aspectRatio: `${photo.w} / ${photo.h}` } : undefined}
          draggable={false}
          loading="lazy"
          decoding="async"
        />
        {photo.caption ? (
          <p
            className="absolute inset-x-0 bottom-[5.5%] text-center text-[22px] leading-none"
            style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
          >
            {photo.caption}
          </p>
        ) : null}
        {photo.date ? (
          <p
            className="absolute bottom-[3%] left-[4%] text-[15px] leading-none"
            style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
          >
            {photo.date}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="rounded-[3px] bg-white p-3" style={{ boxShadow: PRINT_SHADOW }}>
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

/* The camera: a photographed compact with its backdrop removed, its screen
   playing a muted loop cut from the film. The screen rect is measured on the
   cutout (percent of the image). Hovering shows a cursor pill like the case
   studies' sound toggle; pressing opens the film. */
const CAMERA_SRC = "/life/camera.webp";
const CAMERA_W = 1081;
const CAMERA_H = 451;
const SCREEN = { left: 4.44, top: 15.3, width: 47.18, height: 76.5 }; // % of the cutout
const REEL = {
  h264: "/life/camera-reel.mp4",
  hevc: "/life/camera-reel.hevc.mp4",
  poster: "/life/camera-reel.poster.webp",
};

function Camera({ video, onPlay }: { video: LifeVideo; onPlay?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [focused, setFocused] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  /* the loop only downloads once the camera is about a viewport away */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* …and only plays while on screen */
  useEffect(() => {
    if (!near) return;
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [near]);
  const playable = !!onPlay;
  const showPill = pos !== null || !finePointer || focused;
  const label = playable ? "WATCH" : "WATCH · SOON";
  return (
    <div
      ref={ref}
      className="relative"
      style={{
        aspectRatio: `${CAMERA_W} / ${CAMERA_H}`,
        filter:
          "drop-shadow(0 22px 26px rgba(26,25,19,0.26)) drop-shadow(0 3px 5px rgba(26,25,19,0.12))",
        cursor: finePointer && playable ? "none" : undefined,
      }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {/* the screen sits under the body image; the bezel frames it */}
      <div
        className="absolute overflow-hidden bg-black"
        style={{
          left: `${SCREEN.left}%`,
          top: `${SCREEN.top}%`,
          width: `${SCREEN.width}%`,
          height: `${SCREEN.height}%`,
        }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload={near ? "auto" : "none"}
          poster={near ? mediaUrl(REEL.poster) : undefined}
          aria-label="Moments from the film, on the camera's screen"
        >
          {near ? (
            <>
              <source src={mediaUrl(REEL.hevc)} type={VIDEO_TYPE.hevc} />
              <source src={mediaUrl(REEL.h264)} type={VIDEO_TYPE.h264} />
            </>
          ) : null}
        </video>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- a cutout with
          alpha at its own size; the frame sizes it */}
      <img
        src={mediaUrl(CAMERA_SRC)}
        alt="A silver compact camera"
        width={CAMERA_W}
        height={CAMERA_H}
        className="relative block h-auto w-full"
        draggable={false}
        loading="lazy"
        decoding="async"
      />
      {playable ? (
        <button
          type="button"
          aria-label={`Watch ${video.title}`}
          onClick={onPlay}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 h-full w-full bg-transparent focus:outline-none"
          style={finePointer ? { cursor: "none" } : undefined}
        />
      ) : null}
      <span
        aria-hidden
        className={`pointer-events-none absolute z-10 flex items-center gap-[5px] rounded-[4px] px-[7px] py-[5px] font-mono text-[9px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md transition-opacity duration-150 ${showPill ? "opacity-100" : "opacity-0"}`}
        style={{
          background: "rgba(16,27,188,0.92)",
          color: "#F9F7F1",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
          ...(pos && finePointer
            ? { left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }
            : { left: "6%", bottom: "8%" }),
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M4 2.5v11l9-5.5z" />
        </svg>
      </span>
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
      case "camera":
        return <Camera video={cfg.video} onPlay={play} />;
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
