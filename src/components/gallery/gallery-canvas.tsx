"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { WORLD, galleryItems } from "@/lib/gallery";

/*
 * The Gallery canvas — an endless field of work you wander by scrolling.
 *
 *  · The world block tiles 3x3 and the camera wraps modulo the block, so
 *    the field has no edges (the reference's infinite pan).
 *  · Wheel deltas (both axes) and pointer drags drive a camera TARGET; the
 *    camera itself eases toward it every frame, which gives the glide.
 *  · Velocity smears the artworks: each frame the motion vector sets one
 *    CSS transform (rotate . scaleX . unrotate) written to a single custom
 *    property on the world node — every tile picks it up via var(), so the
 *    fluid stretch costs one style write per frame, not one per tile.
 *  · Entrance is a slight zoom-settle straight into the canvas (no zoom-out
 *    prologue, per Austin).
 *
 * Everything runs in refs + rAF; React renders once. Reduced motion gets a
 * plain scrollable grid instead.
 */

const EASE_FACTOR = 0.085;
const WHEEL_GAIN = 1.1;
const STRETCH_GAIN = 0.0042;
const STRETCH_MAX = 0.42;

export function GalleryCanvas() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const wrap = wrapRef.current;
    const world = worldRef.current;
    if (!wrap || !world) return;

    const cam = { x: WORLD.w / 2, y: WORLD.h / 2 };
    const tgt = { x: cam.x, y: cam.y };
    const prev = { x: cam.x, y: cam.y };
    let raf = 0;
    let idle = true;

    const wake = () => {
      if (idle) {
        idle = false;
        raf = requestAnimationFrame(frame);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tgt.x += e.deltaX * WHEEL_GAIN;
      tgt.y += e.deltaY * WHEEL_GAIN;
      wake();
    };

    let dragging = false;
    let px = 0,
      py = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      wrap.setPointerCapture(e.pointerId);
      wrap.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      tgt.x -= e.clientX - px;
      tgt.y -= e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      wake();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      wrap.releasePointerCapture(e.pointerId);
      wrap.style.cursor = "grab";
    };

    const frame = () => {
      cam.x += (tgt.x - cam.x) * EASE_FACTOR;
      cam.y += (tgt.y - cam.y) * EASE_FACTOR;

      // wrap camera and target together so the world never runs out
      const wx = Math.floor(cam.x / WORLD.w) * WORLD.w;
      const wy = Math.floor(cam.y / WORLD.h) * WORLD.h;
      cam.x -= wx;
      tgt.x -= wx;
      prev.x -= wx;
      cam.y -= wy;
      tgt.y -= wy;
      prev.y -= wy;

      const vx = cam.x - prev.x;
      const vy = cam.y - prev.y;
      prev.x = cam.x;
      prev.y = cam.y;

      const vw = wrap.clientWidth;
      const vh = wrap.clientHeight;
      world.style.transform = `translate3d(${vw / 2 - cam.x}px, ${vh / 2 - cam.y}px, 0)`;

      // fluid smear along the motion vector
      const speed = Math.hypot(vx, vy);
      const s = 1 + Math.min(speed * STRETCH_GAIN, STRETCH_MAX);
      const a = Math.atan2(vy, vx);
      world.style.setProperty(
        "--smear",
        `rotate(${a}rad) scaleX(${s}) rotate(${-a}rad)`,
      );

      if (speed > 0.05 || Math.hypot(tgt.x - cam.x, tgt.y - cam.y) > 0.5) {
        raf = requestAnimationFrame(frame);
      } else {
        idle = true;
      }
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
    };
  }, [reduce]);

  /* Reduced motion: the same work as an honest scrollable grid. */
  if (reduce) {
    return (
      <div className="mx-auto max-w-5xl columns-2 gap-4 px-6 py-24 sm:columns-3">
        {galleryItems.map((it) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={it.src}
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
    <motion.div
      ref={wrapRef}
      className="fixed inset-0 z-10 cursor-grab touch-none overflow-hidden bg-[#EDECE7]"
      initial={{ scale: 1.12, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: WORLD.w, height: WORLD.h }}
      >
        {[-1, 0, 1].map((bx) =>
          [-1, 0, 1].map((by) => (
            <div key={`${bx}:${by}`}>
              {galleryItems.map((it) => (
                /* eslint-disable-next-line @next/next/no-img-element -- tiny
                   world tiles; the engine owns layout, not next/image */
                <img
                  key={`${it.src}${bx}${by}`}
                  src={it.src}
                  alt={it.alt ?? ""}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="absolute max-w-none select-none shadow-[0_10px_28px_rgba(26,25,19,0.14)] [transform:var(--smear)]"
                  style={{
                    width: it.w,
                    left: it.x + bx * WORLD.w,
                    top: it.y + by * WORLD.h,
                  }}
                />
              ))}
            </div>
          )),
        )}
      </div>

      {/* quiet furniture */}
      <p className="pointer-events-none absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[#1a1913]/45">
        Gallery — scroll to wander
      </p>
    </motion.div>
  );
}
