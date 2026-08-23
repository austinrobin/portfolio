/*
 * The Gallery — beauty in chaos: a dense, overlapping field of work on an
 * endless canvas.
 *
 * Items live in one WORLD block; the canvas tiles it 3x3 and the camera
 * wraps, so the field never ends. `depth` sorts items into three parallax
 * bands (far 0.82 / mid 1.0 / near 1.22): while panning, near items move
 * faster than far ones, which is what gives the field its depth.
 *
 * Swapping in real work later: optimised files into public/gallery/
 * (<=1200px longest edge), then place them here. Big pieces read as near
 * (depth 1.22, w 300+), small ones as far (depth 0.82, w <=170).
 */

export const WORLD = { w: 2300, h: 1650 } as const;

export interface GalleryItem {
  src: string;
  /** display width in world px */
  w: number;
  x: number;
  y: number;
  /** parallax band: 0.82 far · 1.0 mid · 1.22 near */
  depth: number;
  alt?: string;
}

const d = (i: number) => `/gallery/dummy-${String(i).padStart(2, "0")}.svg`;

export const galleryItems: GalleryItem[] = [
  /* ---- cluster A (top-left) ---- */
  { src: d(1), w: 210, x: 180, y: 160, depth: 1.0 },
  { src: d(2), w: 150, x: 360, y: 90, depth: 0.82 },
  { src: d(3), w: 300, x: 330, y: 300, depth: 1.22 },
  { src: d(4), w: 130, x: 600, y: 200, depth: 0.82 },
  { src: d(5), w: 190, x: 560, y: 430, depth: 1.0 },
  /* ---- drift between A and B ---- */
  { src: d(6), w: 140, x: 900, y: 120, depth: 0.82 },
  { src: d(7), w: 230, x: 1060, y: 300, depth: 1.0 },
  /* ---- cluster B (top-right) ---- */
  { src: d(8), w: 170, x: 1450, y: 180, depth: 1.0 },
  { src: d(9), w: 330, x: 1630, y: 330, depth: 1.22 },
  { src: d(10), w: 150, x: 1930, y: 150, depth: 0.82 },
  { src: d(11), w: 200, x: 2050, y: 420, depth: 1.0 },
  { src: d(12), w: 135, x: 1350, y: 480, depth: 0.82 },
  /* ---- heart (centre) ---- */
  { src: d(13), w: 360, x: 1000, y: 720, depth: 1.22 },
  { src: d(14), w: 170, x: 1330, y: 850, depth: 1.0 },
  { src: d(15), w: 145, x: 860, y: 620, depth: 0.82 },
  { src: d(16), w: 250, x: 1480, y: 1050, depth: 1.22 },
  { src: d(17), w: 155, x: 700, y: 950, depth: 0.82 },
  { src: d(18), w: 205, x: 1180, y: 1120, depth: 1.0 },
  /* ---- cluster C (bottom-left) ---- */
  { src: d(3), w: 160, x: 260, y: 1180, depth: 0.82 },
  { src: d(7), w: 290, x: 420, y: 1290, depth: 1.22 },
  { src: d(11), w: 180, x: 180, y: 1440, depth: 1.0 },
  { src: d(15), w: 220, x: 640, y: 1490, depth: 1.0 },
  { src: d(1), w: 130, x: 480, y: 1080, depth: 0.82 },
  /* ---- cluster D (bottom-right) ---- */
  { src: d(9), w: 165, x: 1780, y: 1240, depth: 0.82 },
  { src: d(5), w: 310, x: 1930, y: 1380, depth: 1.22 },
  { src: d(13), w: 175, x: 2140, y: 1180, depth: 1.0 },
  { src: d(2), w: 225, x: 1620, y: 1470, depth: 1.0 },
  /* ---- connective scatter ---- */
  { src: d(16), w: 140, x: 60, y: 700, depth: 0.82 },
  { src: d(8), w: 235, x: 130, y: 880, depth: 1.22 },
  { src: d(12), w: 200, x: 2180, y: 800, depth: 1.0 },
  { src: d(17), w: 260, x: 1980, y: 640, depth: 1.22 },
  { src: d(4), w: 150, x: 850, y: 1350, depth: 0.82 },
  { src: d(14), w: 240, x: 1100, y: 1440, depth: 1.22 },
  { src: d(6), w: 185, x: 1620, y: 700, depth: 1.0 },
];
