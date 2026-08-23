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

const d = (i: number) => `/gallery/dummy-${String(i).padStart(2, "0")}.svg`;

export const galleryItems: GalleryItem[] = [
  { src: d(1), w: 300 },
  { src: d(2), w: 230 },
  { src: d(3), w: 340 },
  { src: d(4), w: 210 },
  { src: d(5), w: 280 },
  { src: d(6), w: 240 },
  { src: d(7), w: 320 },
  { src: d(8), w: 220 },
  { src: d(9), w: 360 },
  { src: d(10), w: 230 },
  { src: d(11), w: 290 },
  { src: d(12), w: 210 },
  { src: d(13), w: 350 },
  { src: d(14), w: 250 },
  { src: d(15), w: 220 },
  { src: d(16), w: 310 },
  { src: d(17), w: 230 },
  { src: d(18), w: 330 },
];
