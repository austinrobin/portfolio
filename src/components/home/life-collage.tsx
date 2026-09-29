"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { heroFonts, INK } from "./hero-config";
import {
  lifeConfig,
  youtubeId,
  type LifePhoto,
  type LifePieceId,
  type LifePieceLayout,
  type LifeRecord,
  type LifeSettings,
  type LifeVideo,
} from "./life-config";
import { mediaUrl } from "@/lib/media-url";
import { playSfx } from "@/lib/sfx";
import { VIDEO_TYPE } from "@/lib/video-sources";

/*
 * Studio / Life — the desk spread.
 *
 * Reference: a teaser spread of three instax prints scattered on white with
 * a cassette on the right. Translated into the site's paper world: three
 * polaroids of Austin's, the camera is his YouTube channel — its screen loops
 * moments from the film (press it, the film opens over the page) — a wax
 * seal, and a record that plays when hovered. Everything lives in
 * content/life.json.
 *
 * Every piece is draggable on desktop — pick it up, move it, the pile is
 * yours to mess up. On small screens the same pieces settle into a loose
 * static drift. Light, not cluttered: six pieces, one overlap each.
 */

type Placed =
  | { id: LifePieceId; kind: "photo"; index: number; z: number }
  | { id: LifePieceId; kind: "camera" | "seal" | "record" | "stamp"; z: number };

/* what sits on the desk; where and how big comes from content/life.json */
const SPREAD: Placed[] = [
  { id: "p1", kind: "photo", index: 0, z: 2 },
  { id: "p2", kind: "photo", index: 1, z: 3 },
  { id: "p3", kind: "photo", index: 2, z: 1 },
  { id: "camera", kind: "camera", z: 5 },
  { id: "seal", kind: "seal", z: 7 },
  { id: "record", kind: "record", z: 8 },
  { id: "stamp", kind: "stamp", z: 6 },
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


/* The camera: a photographed compact with its backdrop removed, its screen
   playing a muted loop cut from the film. The screen rect is measured on the
   cutout (percent of the image). Hovering shows a cursor pill like the case
   studies' sound toggle; pressing opens the film on YouTube, in a new tab. */
const CAMERA_SRC = "/life/camera.webp";
const CAMERA_W = 1081;
const CAMERA_H = 451;
const SCREEN = { left: 4.44, top: 15.3, width: 47.18, height: 76.5 }; // % of the cutout
const REEL = {
  h264: "/life/camera-reel.mp4",
  hevc: "/life/camera-reel.hevc.mp4",
  poster: "/life/camera-reel.poster.webp",
};

function Camera({ video, href }: { video: LifeVideo; href?: string }) {
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
  const playable = !!href;
  const showPill = pos !== null || !finePointer || focused;
  const label = playable ? "WATCH" : "WATCH · SOON";
  return (
    <div
      ref={ref}
      className="relative"
      style={{
        aspectRatio: `${CAMERA_W} / ${CAMERA_H}`,
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
          preload={near ? (finePointer ? "auto" : "metadata") : "none"}
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
        style={{ filter: "drop-shadow(0 22px 26px rgba(26,25,19,0.26)) drop-shadow(0 3px 5px rgba(26,25,19,0.12))" }}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
      {playable ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${video.title} on YouTube (opens in a new tab)`}
          data-sfx="shutter"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 block h-full w-full focus:outline-none"
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


/* the wax seal: a cut-out lying flat, so a tight shadow and a faint ink halo */
function Seal({ src }: { src: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a cut-out at its own size */
    <img
      src={mediaUrl(src)}
      alt="A blue wax seal with the AR monogram"
      width={900}
      height={898}
      className="block h-auto w-full"
      style={{ aspectRatio: "900 / 898", filter: "drop-shadow(0 6px 10px rgba(16,27,188,0.28)) drop-shadow(0 1px 2px rgba(20,0,60,0.25))" }}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}

/* The record: an album sleeve lying on the desk. Hover it and the vinyl slides
   out and spins while a short cut of the song plays; leave and it stops. Come
   back within a few seconds and the song carries on, later and it starts over.
   A page may only make sound after a click or tap, so if the first hover is
   refused a "press to play" pill appears — one press primes it. On phones the
   tap is the switch. */
const DISC =
  "conic-gradient(from 210deg, rgba(255,255,255,0.12), transparent 22%, rgba(255,255,255,0.05) 48%, transparent 72%, rgba(255,255,255,0.12)), " +
  "repeating-radial-gradient(circle at 50% 50%, #121212 0 1.4px, #222 1.4px 2.8px)";

/* a postage stamp lying flat: a tight shadow, nothing more */
function Stamp({ src }: { src: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a cut-out at its own size */
    <img
      src={mediaUrl(src)}
      alt="A postage stamp from Himachal, October 2025"
      width={640}
      height={769}
      className="block h-auto w-full"
      style={{ aspectRatio: "640 / 769", filter: "drop-shadow(0 3px 6px rgba(26,25,19,0.28)) drop-shadow(0 1px 1px rgba(26,25,19,0.2))" }}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}

function Record({ record }: { record: LifeRecord }) {
  const ref = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const leftAt = useRef(0); // when the pointer last left, for the resume window
  const wanted = useRef(false); // is the pointer on the sleeve right now
  const fade = useRef(0); // the volume ramp's frame
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  /* the cut only downloads once the record is about a viewport away */
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
  useEffect(() => () => cancelAnimationFrame(fade.current), []);

  /* a short volume ramp so the song neither pops in nor cuts off */
  const ramp = (a: HTMLAudioElement, to: number, ms: number, then?: () => void) => {
    cancelAnimationFrame(fade.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / ms));
      a.volume = from + (to - from) * k;
      if (k < 1) fade.current = requestAnimationFrame(step);
      else then?.();
    };
    fade.current = requestAnimationFrame(step);
  };
  const start = async () => {
    const a = audioRef.current;
    wanted.current = true;
    if (!a || !a.paused) return;
    const within = leftAt.current > 0 && performance.now() - leftAt.current < record.resume * 1000;
    if (!within || a.currentTime < record.from || a.currentTime >= record.to) a.currentTime = record.from;
    a.volume = 0;
    try {
      await a.play();
      if (!wanted.current) { a.pause(); return; } // the pointer left while play() was pending
      ramp(a, 1, 250);
      setPlaying(true);
    } catch {
      /* refused before any press on the site, or interrupted by leaving
         again — the first press anywhere unlocks it, and the next hover plays */
    }
  };
  const stop = () => {
    const a = audioRef.current;
    wanted.current = false;
    if (!a || a.paused) return;
    leftAt.current = performance.now();
    setPlaying(false);
    ramp(a, 0, 140, () => a.pause());
  };
  /* browsers only let a page make sound after a press somewhere. The first
     press anywhere on the site (a link, a drag on the desk, a key) unlocks
     the record silently, so hovering it afterwards simply plays. */
  useEffect(() => {
    if (!near) return;
    let unlocked = false;
    const unlock = () => {
      const a = audioRef.current;
      if (!a || unlocked) return;
      unlocked = true;
      const v = a.volume;
      a.volume = 0;
      a.play()
        .then(() => {
          if (!wanted.current) { a.pause(); a.currentTime = record.from; a.volume = v; }
          else { a.volume = 0; ramp(a, 1, 250); setPlaying(true); }
        })
        .catch(() => { unlocked = false; a.volume = v; });
    };
    const evs = ["pointerdown", "keydown", "touchend"] as const;
    evs.forEach((e) => document.addEventListener(e, unlock, { capture: true, passive: true }));
    return () => evs.forEach((e) => document.removeEventListener(e, unlock, { capture: true }));
  }, [near, record.from]);
  const onTime = () => {
    const a = audioRef.current;
    if (a && a.currentTime >= record.to) a.currentTime = record.from;
  };
  const toggle = () => (playing ? stop() : start());
  const out = playing;
  /* desktop never asks for a press: the hover is the switch, and the first
     press anywhere on the site has already unlocked the sound */
  const pill = coarse && !playing ? "tap to play" : null;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`${playing ? "Stop" : "Play"} a clip of ${record.title} by ${record.artist}`}
      aria-pressed={playing}
      data-sfx="none"
      className="relative"
      style={{ aspectRatio: "1 / 1" }}
      onPointerEnter={(e) => { if (e.pointerType !== "touch") void start(); }}
      onPointerLeave={(e) => { if (e.pointerType !== "touch") stop(); }}
      onClick={() => { if (coarse) toggle(); else if (!playing) void start(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
    >
      {/* the vinyl, behind the sleeve, sliding out to the right */}
      <motion.div
        className="absolute inset-[3%] rounded-full"
        animate={{ x: out ? "44%" : "0%" }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        style={{ boxShadow: "0 8px 22px rgba(26,25,19,0.32), 0 1px 2px rgba(26,25,19,0.3)" }}
      >
        <motion.div
          className="relative h-full w-full rounded-full"
          animate={playing && !reduce ? { rotate: 360 } : {}}
          transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
          style={{ background: DISC }}
        >
          {/* the label */}
          <div
            className="absolute inset-[32%] flex flex-col items-center justify-center rounded-full text-center"
            style={{ background: "#101BBC", boxShadow: "inset 0 0 0 1.5px rgba(249,247,241,0.85)" }}
          >
            <span className="font-mono text-[6px] uppercase leading-none tracking-[0.2em]" style={{ color: "#F9F7F1" }}>
              {record.artist}
            </span>
            <span className="mt-[3px] text-[11px] leading-none" style={{ fontFamily: "var(--font-peristiwa)", color: "#F9F7F1" }}>
              {record.title}
            </span>
            <span className="absolute left-1/2 top-1/2 size-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "#F9F7F1" }} />
          </div>
        </motion.div>
      </motion.div>
      {/* the sleeve */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a small square cover at its own size */}
      <img
        src={mediaUrl(record.cover)}
        alt={`${record.title} by ${record.artist}, the album cover`}
        width={640}
        height={640}
        className="relative z-10 block h-auto w-full rounded-[3px]"
        style={{ aspectRatio: "1 / 1", boxShadow: PRINT_SHADOW }}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
      {pill ? (
        <span
          className="pointer-events-none absolute bottom-[7%] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ background: "rgba(249,247,241,0.92)", color: INK, boxShadow: "0 2px 8px rgba(26,25,19,0.25)" }}
        >
          {pill}
        </span>
      ) : null}
      {near && record.audio ? (
        <audio ref={audioRef} src={mediaUrl(record.audio)} preload="auto" onTimeUpdate={onTime} onEnded={onTime} aria-hidden />
      ) : null}
    </div>
  );
}



/* ---------------------------------------------------------------- section */

export function LifeCollage({
  overrides,
  editable = false,
  onLayout,
}: {
  overrides?: Partial<LifeSettings>;
  /** Studio: no entrance animation, and dragging a piece reports where it landed */
  editable?: boolean;
  onLayout?: (id: LifePieceId, patch: Partial<LifePieceLayout>) => void;
}) {
  const cfg: LifeSettings = { ...lifeConfig, ...overrides };
  const layout = { ...lifeConfig.layout, ...(cfg.layout ?? {}) };
  const deskHeight = cfg.deskHeight ?? lifeConfig.deskHeight;
  const canvasRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const zTop = useRef(10);
  const [zMap, setZMap] = useState<Record<string, number>>({});
  /* the camera links out only when the URL is a real YouTube link */
  const filmHref = youtubeId(cfg.video.url) ? cfg.video.url : undefined;

  const lift = (id: string) => {
    zTop.current += 1;
    setZMap((m) => ({ ...m, [id]: zTop.current }));
  };

  const rotateOf = (p: Placed) =>
    p.kind === "photo" ? (cfg.photos[p.index]?.rotate ?? 0) : (layout[p.id]?.r ?? 0);

  /* where a dragged piece came to rest, as desk percentages — measured from
     its centre, which rotation and the drag scale leave untouched */
  const settle = (id: LifePieceId, el: HTMLElement) => {
    const desk = canvasRef.current;
    if (!desk || !onLayout) return;
    const d = desk.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - d.left;
    const cy = r.top + r.height / 2 - d.top;
    const x = ((cx - el.offsetWidth / 2) / d.width) * 100;
    const y = ((cy - el.offsetHeight / 2) / d.height) * 100;
    onLayout(id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  };

  const body = (p: Placed) => {
    switch (p.kind) {
      case "photo": {
        const photo = cfg.photos[p.index];
        return photo ? <Polaroid photo={photo} /> : null;
      }
      case "camera":
        return <Camera video={cfg.video} href={filmHref} />;
      case "seal":
        return cfg.seal ? <Seal src={cfg.seal} /> : null;
      case "record":
        return cfg.record?.cover ? <Record record={cfg.record} /> : null;
      case "stamp":
        return cfg.stamp ? <Stamp src={cfg.stamp} /> : null;
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
        className="relative mx-auto mt-16 hidden max-w-6xl lg:block"
        style={{ height: deskHeight }}
      >
        {SPREAD.map((p, i) => {
          if (p.kind === "seal" && !cfg.seal) return null;
          if (p.kind === "record" && !cfg.record?.cover) return null;
          if (p.kind === "stamp" && !cfg.stamp) return null;
          const rotate = rotateOf(p);
          const lay = layout[p.id];
          return (
            <motion.div
              /* in Studio the key carries the position, so a piece remounts
                 where it was dropped and the drag offset resets to zero */
              key={editable ? `${p.id}-${lay.x}-${lay.y}` : p.id}
              className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
              /* widths are stored as px on the 1152px desk and rendered as a share of
                 it, so Studio's narrower preview and the live desk agree */
              style={{ left: `${lay.x}%`, top: `${lay.y}%`, width: `${(lay.w / 1152) * 100}%`, zIndex: zMap[p.id] ?? p.z }}
              initial={reduce || editable ? false : { opacity: 0, y: 28, rotate: rotate + (i % 2 ? 5 : -5) }}
              whileInView={{ opacity: 1, y: 0, rotate }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: editable ? 0 : 0.7, delay: editable ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              drag
              dragConstraints={canvasRef}
              dragElastic={editable ? 0 : 0.18}
              dragMomentum={false}
              whileHover={reduce || editable ? undefined : { rotate: rotate * 0.4, y: -4 }}
              whileDrag={{ scale: 1.04, rotate: 0 }}
              onDragStart={() => { lift(p.id); playSfx("whoosh"); }}
              onDragEnd={editable ? (e) => settle(p.id, (e.target as HTMLElement).closest("[data-piece]") as HTMLElement) : undefined}
              data-piece={p.id}
            >
              {body(p)}
            </motion.div>
          );
        })}
      </div>

      {/* -------- small screens: the same pieces, settled -------- */}
      <div className="mx-auto mt-12 flex max-w-xl flex-wrap items-start justify-center gap-x-5 gap-y-10 px-6 pb-4 lg:hidden">
        {SPREAD.map((p, i) => {
          const rotate = rotateOf(p);
          if (p.kind === "seal" && !cfg.seal) return null;
          if (p.kind === "record" && !cfg.record?.cover) return null;
          if (p.kind === "stamp" && !cfg.stamp) return null;
          const wide = p.kind !== "photo" && p.kind !== "seal" && p.kind !== "record" && p.kind !== "stamp";
          return (
            <motion.div
              key={p.id}
              className={p.kind === "seal" || p.kind === "stamp" ? "w-[38%] max-w-[180px]" : p.kind === "record" ? "mr-[28%] w-[52%] max-w-[240px]" : wide ? "w-full max-w-[380px]" : "w-[46%] min-w-[150px] max-w-[240px]"}
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

    </section>
  );
}
