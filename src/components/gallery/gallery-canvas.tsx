"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { WORLD, galleryItems, type GalleryItem } from "@/lib/gallery";

/*
 * The Gallery canvas — beauty in chaos.
 *
 *  · Items sit in three parallax bands (depth 0.82 / 1.0 / 1.22). Each band
 *    is one layer div; the frame loop writes one transform per layer, with
 *    the camera scaled by the band's depth — near work outruns far work and
 *    the flat field becomes a space.
 *  · Each band wraps independently (camera x depth, modulo the world), so
 *    the parallax never breaks the infinity.
 *  · Wheel (both axes) and drags drive the camera target; the camera glides
 *    after it. The cursor alone steers too: hovering toward an edge eases
 *    the camera that way (the reference's hover-look).
 *  · Velocity smears the artwork along the motion vector via ONE custom
 *    property all tiles inherit.
 *  · Entrance: the whole field starts far out (all the chaos visible at
 *    once) and dives in — the reference's zoom-in.
 *
 * All rAF + refs; React renders once. Reduced motion gets a plain grid.
 */

const DEPTHS = [0.82, 1.0, 1.22] as const;
const EASE_CAM = 0.075;
const WHEEL_GAIN = 1.65;
const LOOK_REACH = 170; // px of camera drift at the viewport's edge
const EASE_LOOK = 0.05;
const STRETCH_GAIN = 0.006;
const STRETCH_MAX = 0.55;

function Tile({ it }: { it: GalleryItem }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- engine-owned tiles */
    <img
      src={it.src}
      alt={it.alt ?? ""}
      draggable={false}
      loading="lazy"
      decoding="async"
      className="absolute max-w-none select-none [transform:var(--smear)]"
      style={{
        width: it.w,
        left: it.x,
        top: it.y,
        boxShadow: `0 ${8 * it.depth}px ${26 * it.depth}px rgba(26,25,19,${0.1 + it.depth * 0.07})`,
      }}
    />
  );
}

export function GalleryCanvas() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const layers =
      wrap.querySelectorAll<HTMLDivElement>("[data-depth-layer]");

    const cam = { x: WORLD.w / 2, y: WORLD.h / 2 };
    const tgt = { x: cam.x, y: cam.y };
    const prev = { x: cam.x, y: cam.y };
    const look = { x: 0, y: 0 };
    const lookTgt = { x: 0, y: 0 };
    let raf = 0;
    let running = false;

    const wake = () => {
      if (!running) {
        running = true;
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
      if (dragging) {
        tgt.x -= (e.clientX - px) * 1.15;
        tgt.y -= (e.clientY - py) * 1.15;
        px = e.clientX;
        py = e.clientY;
      } else {
        // hover-look: the cursor's offset from centre steers the camera
        lookTgt.x = ((e.clientX / wrap.clientWidth) * 2 - 1) * LOOK_REACH;
        lookTgt.y = ((e.clientY / wrap.clientHeight) * 2 - 1) * LOOK_REACH;
      }
      wake();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      wrap.releasePointerCapture(e.pointerId);
      wrap.style.cursor = "grab";
    };
    const onLeave = () => {
      lookTgt.x = 0;
      lookTgt.y = 0;
      wake();
    };

    const mod = (v: number, m: number) => ((v % m) + m) % m;

    const frame = () => {
      cam.x += (tgt.x - cam.x) * EASE_CAM;
      cam.y += (tgt.y - cam.y) * EASE_CAM;
      look.x += (lookTgt.x - look.x) * EASE_LOOK;
      look.y += (lookTgt.y - look.y) * EASE_LOOK;

      // keep the numbers bounded (positions themselves wrap per layer)
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
      const cx = cam.x + look.x;
      const cy = cam.y + look.y;

      layers.forEach((layer, i) => {
        const depth = DEPTHS[i];
        const lx = mod(cx * depth, WORLD.w);
        const ly = mod(cy * depth, WORLD.h);
        layer.style.transform = `translate3d(${vw / 2 - lx}px, ${vh / 2 - ly}px, 0)`;
      });

      // fluid smear along the motion vector
      const speed = Math.hypot(vx, vy);
      const s = 1 + Math.min(speed * STRETCH_GAIN, STRETCH_MAX);
      const a = Math.atan2(vy, vx);
      wrap.style.setProperty(
        "--smear",
        `rotate(${a}rad) scaleX(${s}) rotate(${-a}rad)`,
      );

      const busy =
        speed > 0.04 ||
        Math.hypot(tgt.x - cam.x, tgt.y - cam.y) > 0.4 ||
        Math.hypot(lookTgt.x - look.x, lookTgt.y - look.y) > 0.4;
      if (busy) raf = requestAnimationFrame(frame);
      else running = false;
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("pointerleave", onLeave);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("pointerleave", onLeave);
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
    <div className="fixed inset-0 z-10 overflow-hidden bg-[#EDECE7]">
      {/* the dive: all the chaos at once, then in */}
      <motion.div
        ref={wrapRef}
        className="absolute inset-0 cursor-grab touch-none"
        initial={{ scale: 0.42, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {DEPTHS.map((depth) => (
          <div
            key={depth}
            data-depth-layer
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: WORLD.w, height: WORLD.h }}
          >
            {[-1, 0, 1].map((bx) =>
              [-1, 0, 1].map((by) => (
                <div
                  key={`${bx}:${by}`}
                  className="absolute"
                  style={{ left: bx * WORLD.w, top: by * WORLD.h }}
                >
                  {galleryItems
                    .filter((it) => it.depth === depth)
                    .map((it, i) => (
                      <Tile key={`${it.src}${i}`} it={it} />
                    ))}
                </div>
              )),
            )}
          </div>
        ))}
      </motion.div>

      <p className="pointer-events-none absolute bottom-6 left-6 z-10 font-mono text-[10px] uppercase tracking-[0.25em] text-[#1a1913]/45">
        Gallery — scroll to wander
      </p>
    </div>
  );
}
