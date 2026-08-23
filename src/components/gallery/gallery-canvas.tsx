"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { galleryItems } from "@/lib/gallery";

/*
 * The Gallery — a flight through the work (reference: Gufram's SPACE mode).
 *
 *  · Pieces float in a depth field. The camera drifts forward on its own —
 *    work slowly appears far off, comes in, scales up and sweeps past.
 *    Scrolling feeds velocity on top of the drift; it decays back.
 *  · Passing the camera recycles a piece to the far end, so the stream
 *    never runs out. Fade-in at the far edge, fade-out just before the
 *    pass, so nothing pops.
 *  · PAPER FLUTTER: as speed rises each piece sways and shears on its own
 *    phase — paper caught in the slipstream.
 *  · SOUND (WebAudio, synthesised — zero assets): a filtered-noise woosh
 *    whose volume follows speed, and a two-blade shutter click when a
 *    piece passes the camera at speed. Audio can only start after a user
 *    gesture, so it arms on the first wheel/drag; a quiet toggle sits
 *    bottom-right.
 *
 * All rAF + refs; React renders once. Reduced motion gets a plain grid
 * (and no audio).
 */

const ZSPAN = 14; // depth of the field, arbitrary units
const IDLE_SPEED = 0.35; // units/s of self-drift
const SCROLL_GAIN = 0.0045;
const BOOST_DECAY = 1.6; // /s
const MAX_BOOST = 6;
const FOV = 1.9;

/* deterministic lane per slot — golden-angle spread, centre kept clear */
function lane(i: number) {
  const a = i * 2.39996; // golden angle
  const r = 0.42 + 0.5 * ((i * 0.618034) % 1);
  return { sx: Math.cos(a) * r, sy: Math.sin(a) * r * 0.72 };
}

export function GalleryCanvas() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef(false);
  const muteBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reduce) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const tiles = [...wrap.querySelectorAll<HTMLElement>("[data-tile]")];
    const n = tiles.length;

    /* ---------------- state ---------------- */
    const z = tiles.map((_, i) => ((i + 0.5) / n) * ZSPAN); // depth slots
    let boost = 0;
    let speedNorm = 0;
    let last = performance.now();
    let raf = 0;

    /* ---------------- audio ---------------- */
    let ctx: AudioContext | null = null;
    let wooshGain: GainNode | null = null;
    let lastShutter = 0;

    const armAudio = () => {
      if (ctx) return;
      try {
        ctx = new AudioContext();
        // woosh: looped noise through a low bandpass, gain rides speed
        const len = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 320;
        bp.Q.value = 0.6;
        wooshGain = ctx.createGain();
        wooshGain.gain.value = 0;
        src.connect(bp).connect(wooshGain).connect(ctx.destination);
        src.start();
      } catch {
        ctx = null;
      }
    };

    const shutter = (strength: number) => {
      if (!ctx || mutedRef.current) return;
      const now = ctx.currentTime;
      if (now - lastShutter < 0.14) return;
      lastShutter = now;
      // two tight noise blades = curtain open/close
      for (const [dt, dur, level] of [
        [0, 0.018, 0.5],
        [0.052, 0.026, 0.32],
      ] as const) {
        const len = Math.ceil(ctx.sampleRate * dur);
        const b = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = b.getChannelData(0);
        for (let i = 0; i < len; i++)
          ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ctx.createBufferSource();
        s.buffer = b;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1800;
        const g = ctx.createGain();
        g.gain.value = level * Math.min(1, 0.3 + strength);
        s.connect(hp).connect(g).connect(ctx.destination);
        s.start(now + dt);
      }
    };

    /* ---------------- input ---------------- */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      armAudio();
      boost = Math.min(
        MAX_BOOST,
        Math.max(-2, boost + e.deltaY * SCROLL_GAIN),
      );
    };
    const onPointerDown = () => armAudio();

    /* ---------------- frame ---------------- */
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const v = IDLE_SPEED + boost;
      boost *= Math.exp(-BOOST_DECAY * dt);
      speedNorm += (Math.min(Math.abs(boost) / MAX_BOOST, 1) - speedNorm) * 0.08;

      const vw = wrap.clientWidth;
      const vh = wrap.clientHeight;
      const cx = vw / 2;
      const cy = vh / 2;
      const t = now / 1000;

      for (let i = 0; i < n; i++) {
        z[i] -= v * dt;
        if (z[i] < 0.12) {
          z[i] += ZSPAN; // recycle to the far end
          if (speedNorm > 0.3) shutter(speedNorm);
        } else if (z[i] > ZSPAN) {
          z[i] -= ZSPAN; // (reverse travel)
        }
        const d = z[i];
        const k = FOV / d;
        const { sx, sy } = lane(i);
        const x = cx + sx * cx * k * 1.15;
        const y = cy + sy * cy * k * 1.3;

        // far fade-in, near fade-out
        const fadeIn = Math.min(1, Math.max(0, (ZSPAN - d) / (ZSPAN * 0.25)));
        const fadeOut = Math.min(1, Math.max(0, (d - 0.12) / 0.5));
        const o = Math.min(fadeIn, fadeOut);

        // paper flutter in the slipstream
        const ph = i * 1.7;
        const sway = Math.sin(t * 2.6 + ph) * 8 * speedNorm;
        const shear = Math.sin(t * 3.4 + ph * 1.3) * 7 * speedNorm;

        const el = tiles[i];
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${k}) rotate(${sway}deg) skewY(${shear}deg)`;
        el.style.opacity = o.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(d * 60));
      }

      if (wooshGain && ctx) {
        wooshGain.gain.setTargetAtTime(
          mutedRef.current ? 0 : speedNorm * 0.14,
          ctx.currentTime,
          0.08,
        );
      }

      raf = requestAnimationFrame(frame);
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onPointerDown);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onPointerDown);
      ctx?.close();
    };
  }, [reduce]);

  if (reduce) {
    return (
      <div className="mx-auto max-w-5xl columns-2 gap-4 px-6 py-24 sm:columns-3">
        {galleryItems.map((it, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${it.src}${i}`}
            src={it.src}
            alt={it.alt ?? ""}
            className="mb-4 w-full rounded-md"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-10 touch-none overflow-hidden bg-background"
    >
      {galleryItems.map((it, i) => (
        <div
          key={`${it.src}${i}`}
          data-tile
          className="absolute left-0 top-0 opacity-0 will-change-transform"
          style={{ width: it.w }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- engine tiles */}
          <img
            src={it.src}
            alt={it.alt ?? ""}
            draggable={false}
            loading="eager"
            decoding="async"
            className="w-full max-w-none select-none shadow-[0_18px_50px_rgba(26,25,19,0.18)]"
          />
        </div>
      ))}

      <p className="pointer-events-none absolute bottom-6 left-6 z-20 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
        Gallery — scroll to fly
      </p>
      <button
        ref={muteBtnRef}
        onClick={() => {
          mutedRef.current = !mutedRef.current;
          if (muteBtnRef.current)
            muteBtnRef.current.textContent = mutedRef.current
              ? "sound off"
              : "sound on";
        }}
        className="absolute bottom-6 right-6 z-20 font-mono text-[10px] uppercase tracking-[0.25em] text-muted transition-colors hover:text-foreground"
      >
        sound on
      </button>
    </div>
  );
}
