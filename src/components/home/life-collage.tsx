"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { heroFonts, INK, PAPER } from "./hero-config";
import { Monogram } from "./monogram";

/*
 * Studio / Life — the desk collage.
 *
 * A scattered spread of artifacts (reference: shedsgns.me's closing wall),
 * translated into the site's banknote world: paper ground, ink accents,
 * Silk caps + Peristiwa script. Every piece is draggable inside the canvas —
 * pick it up, move it, the pile is yours to mess up. Polaroids are template
 * slots: when the real photos land in public/life/, set `photo` (and swap
 * the caption) and the frame fills itself. On small screens the same pieces
 * settle into a loose static drift — no drag, no absolute canvas.
 *
 * Intentional, not cluttered: eight pieces, one accident of overlap each.
 */

type Piece =
  | { kind: "polaroid"; id: string; caption: string; photo?: string }
  | { kind: "note"; id: string }
  | { kind: "kind-words"; id: string }
  | { kind: "channel"; id: string }
  | { kind: "specimen"; id: string };

interface Placed {
  piece: Piece;
  /** Canvas-relative position, % of width/height. */
  left: string;
  top: string;
  rotate: number;
  width: number;
}

const SPREAD: Placed[] = [
  {
    piece: { kind: "polaroid", id: "p1", caption: "on set" },
    left: "3%",
    top: "6%",
    rotate: -6,
    width: 225,
  },
  {
    piece: { kind: "note", id: "note" },
    left: "26%",
    top: "2%",
    rotate: 2.5,
    width: 205,
  },
  {
    piece: { kind: "polaroid", id: "p2", caption: "the desk" },
    left: "43%",
    top: "14%",
    rotate: 5,
    width: 235,
  },
  {
    piece: { kind: "polaroid", id: "p3", caption: "somewhere new" },
    left: "78%",
    top: "4%",
    rotate: -4,
    width: 215,
  },
  {
    piece: { kind: "kind-words", id: "kw" },
    left: "7%",
    top: "56%",
    rotate: 2,
    width: 300,
  },
  {
    piece: { kind: "specimen", id: "sp" },
    left: "38%",
    top: "72%",
    rotate: -7,
    width: 195,
  },
  {
    piece: { kind: "channel", id: "yt" },
    left: "63%",
    top: "58%",
    rotate: -3,
    width: 290,
  },
  {
    piece: { kind: "polaroid", id: "p4", caption: "off duty" },
    left: "84%",
    top: "48%",
    rotate: 6,
    width: 210,
  },
];

/* ---------------------------------------------------------------- pieces */

function PolaroidCard({
  caption,
  photo,
}: {
  caption: string;
  photo?: string;
}) {
  return (
    <div className="rounded-[3px] bg-white p-3 pb-2 shadow-[0_18px_44px_rgba(26,25,19,0.2)]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-subtle">
        {photo ? (
          /* eslint-disable-next-line @next/next/no-img-element -- collage
             photos are small local files; the frame sizes them, not next/image */
          <img
            src={photo}
            alt={caption}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
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
        className="mt-2.5 pb-1 text-center text-[22px] leading-none"
        style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
      >
        {caption}
      </p>
    </div>
  );
}

function NoteCard() {
  return (
    <div
      className="flex aspect-square flex-col items-center justify-center gap-3 rounded-[3px] p-5 shadow-[0_18px_44px_rgba(16,27,188,0.28)]"
      style={{ background: INK, color: PAPER }}
    >
      <Monogram className="h-12 w-auto" />
      <p
        className="text-center text-[19px] leading-snug"
        style={{ fontFamily: "var(--font-peristiwa)" }}
      >
        hello from the studio
      </p>
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-60">
        est. 2022
      </span>
    </div>
  );
}

function KindWordsCard() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_18px_44px_rgba(26,25,19,0.16)]">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle font-mono text-[10px] text-muted">
          ?
        </span>
        <div className="min-w-0">
          <p
            className="text-sm font-medium uppercase tracking-[0.02em]"
            style={{ fontFamily: "var(--font-silk)", color: INK }}
          >
            Kind words
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            from the people i build with
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        This frame is reserved for a good one.
      </p>
    </div>
  );
}

function ChannelCard() {
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-white p-4 shadow-[0_18px_44px_rgba(26,25,19,0.16)]">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full"
        style={{ background: INK }}
      >
        {/* play glyph */}
        <span
          className="ml-0.5 block size-0 border-y-[6px] border-l-[10px] border-y-transparent"
          style={{ borderLeftColor: PAPER }}
        />
      </span>
      <div className="min-w-0">
        <p
          className="text-sm font-medium uppercase tracking-[0.02em]"
          style={{ fontFamily: "var(--font-silk)", color: INK }}
        >
          The channel
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          Design, community & the life around it
        </p>
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted/70">
          coming soon
        </p>
      </div>
    </div>
  );
}

function SpecimenTag() {
  return (
    <div
      className="rounded-[3px] border border-dashed bg-white/60 px-4 py-3 shadow-[0_12px_30px_rgba(26,25,19,0.12)]"
      style={{ borderColor: INK }}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: INK }}>
        Specimen № 000001
      </p>
      <p
        className="mt-1 text-[15px] font-bold uppercase tracking-[0.04em]"
        style={{ fontFamily: "var(--font-silk)", color: INK }}
      >
        Austin Moras
      </p>
    </div>
  );
}

function PieceBody({ piece }: { piece: Piece }) {
  switch (piece.kind) {
    case "polaroid":
      return <PolaroidCard caption={piece.caption} photo={piece.photo} />;
    case "note":
      return <NoteCard />;
    case "kind-words":
      return <KindWordsCard />;
    case "channel":
      return <ChannelCard />;
    case "specimen":
      return <SpecimenTag />;
  }
}

/* ---------------------------------------------------------------- section */

export function LifeCollage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const zTop = useRef(10);
  const [zMap, setZMap] = useState<Record<string, number>>({});

  const lift = (id: string) => {
    zTop.current += 1;
    setZMap((m) => ({ ...m, [id]: zTop.current }));
  };

  return (
    <section
      aria-label="Studio and life"
      className={`${heroFonts.silk.variable} ${heroFonts.peristiwa.variable} overflow-hidden`}
    >
      <div className="mx-auto max-w-6xl px-6 pt-20 sm:pt-24">
        <p
          className="text-center text-sm font-medium uppercase tracking-[0.18em]"
          style={{ fontFamily: "var(--font-silk)", color: INK }}
        >
          Studio / Life
        </p>
        <h2
          className="mt-3 text-center text-[clamp(44px,7.2vw,110px)] leading-none"
          style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
        >
          Beyond the desk
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-[15px] leading-relaxed text-muted">
          Who I am at work and after it — the studio, the camera, the people.
          Pick things up, move them around.
        </p>
      </div>

      {/* -------- desktop: the draggable desk -------- */}
      <div
        ref={canvasRef}
        className="relative mx-auto mt-6 hidden h-[680px] max-w-6xl md:block"
      >
        {SPREAD.map(({ piece, left, top, rotate, width }, i) => (
          <motion.div
            key={piece.id}
            className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
            style={{ left, top, width, zIndex: zMap[piece.id] ?? i + 1 }}
            initial={
              reduce
                ? false
                : { opacity: 0, y: 28, rotate: rotate + (i % 2 ? 5 : -5) }
            }
            whileInView={{ opacity: 1, y: 0, rotate }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.7,
              delay: i * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            drag
            dragConstraints={canvasRef}
            dragElastic={0.18}
            dragMomentum={false}
            whileHover={reduce ? undefined : { rotate: rotate * 0.4, y: -4 }}
            whileDrag={{ scale: 1.045, rotate: 0 }}
            onDragStart={() => lift(piece.id)}
          >
            <PieceBody piece={piece} />
          </motion.div>
        ))}
      </div>

      {/* -------- small screens: the same pieces, settled -------- */}
      <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-start justify-center gap-x-5 gap-y-8 px-6 pb-4 md:hidden">
        {SPREAD.map(({ piece, rotate }, i) => (
          <motion.div
            key={piece.id}
            className="w-[46%] min-w-[150px] max-w-[240px]"
            style={{ rotate: rotate * 0.7 }}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.6,
              delay: (i % 2) * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <PieceBody piece={piece} />
          </motion.div>
        ))}
      </div>

      <div className="pb-20 sm:pb-24" />
    </section>
  );
}
