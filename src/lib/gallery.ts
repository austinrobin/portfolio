/*
 * The Gallery — a slow flight through the work.
 *
 * Items float in a depth field; the camera drifts forward through them on
 * its own, and scrolling feeds the speed. Each item only declares its file
 * and a base width — the engine deals lanes (spread positions) and depth
 * slots deterministically, so adding a piece is one line.
 *
 * Real work later: optimised files (<=1200px longest edge) into
 * public/gallery/, one entry here per piece. Order matters only as the
 * stream's sequence.
 */

export interface GalleryItem {
  src: string;
  /** base width in px at arm's length (the engine scales with depth) */
  w: number;
  alt?: string;
}

/* Real work, encoded to ≤1200px WebP (24–162 KB each). Widths are the
   base size at arm's length: squares and the one landscape run wider,
   portraits narrower, mixed for rhythm in the stream. */
export const galleryItems: GalleryItem[] = [
  { src: "/gallery/main-frame.webp", w: 260 },
  { src: "/gallery/bloomalgo-deployed.webp", w: 320 },
  { src: "/gallery/ig-post-29.webp", w: 230 },
  { src: "/gallery/signup.webp", w: 360 },
  { src: "/gallery/company-infographic.webp", w: 240 },
  { src: "/gallery/in-app.webp", w: 300 },
  { src: "/gallery/frame-5921.webp", w: 220 },
  { src: "/gallery/art-01.webp", w: 310 },
  { src: "/gallery/inactive-day2-push.webp", w: 250 },
  { src: "/gallery/ig-post-4.webp", w: 290 },
  { src: "/gallery/company-infographic-1.webp", w: 240 },
  { src: "/gallery/subscription-plan.webp", w: 280 },
  { src: "/gallery/frame-2697.webp", w: 230 },
  { src: "/gallery/ig-post-5.webp", w: 330 },
  { src: "/gallery/wtp.webp", w: 220 },
  { src: "/gallery/art-02.webp", w: 270 },
  { src: "/gallery/bloomalgo-percentage-loss.webp", w: 210 },
  { src: "/gallery/inactive-day2-push-1.webp", w: 250 },
  { src: "/gallery/ig-post-55.webp", w: 240 },
  /* batch 2 */
  { src: "/gallery/art-03.webp", w: 240 },
  { src: "/gallery/art-07.webp", w: 300 },
  { src: "/gallery/art-06.webp", w: 210 },
  { src: "/gallery/art-11.webp", w: 290 },
  { src: "/gallery/art-04.webp", w: 250 },
  { src: "/gallery/art-08.webp", w: 230 },
  { src: "/gallery/art-05.webp", w: 310 },
  { src: "/gallery/art-09.webp", w: 220 },
  { src: "/gallery/art-10.webp", w: 300 },
  { src: "/gallery/art-12.webp", w: 240 },
];
