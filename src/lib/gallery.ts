/*
 * The Gallery — an endless wandering canvas of art, design and photographs.
 *
 * Items live in one WORLD block (coordinates in px of a 3200x2200 field);
 * the canvas renders a 3x3 tiling of that block and the camera wraps, so
 * the field never ends. Positions are hand-scattered into loose clusters
 * with breathing room, like the reference.
 *
 * Swapping in real work later: put optimised files in public/gallery/
 * (<=1200px longest edge — the largest tile renders ~360px wide, so that
 * covers 2x displays with margin), keep kind "image" for photos/art
 * exports, and update src/w here. SVG dummies are placeholders.
 */

export const WORLD = { w: 3200, h: 2200 } as const;

export interface GalleryItem {
  src: string;
  /** display width in world px (height follows the file's aspect) */
  w: number;
  x: number;
  y: number;
  alt?: string;
}

export const galleryItems: GalleryItem[] = [
  // cluster: top-left
  { src: "/gallery/dummy-01.svg", w: 220, x: 260, y: 240 },
  { src: "/gallery/dummy-02.svg", w: 170, x: 560, y: 150 },
  { src: "/gallery/dummy-03.svg", w: 260, x: 480, y: 480 },
  { src: "/gallery/dummy-04.svg", w: 150, x: 820, y: 360 },
  // drift: top-right
  { src: "/gallery/dummy-05.svg", w: 240, x: 1750, y: 220 },
  { src: "/gallery/dummy-06.svg", w: 165, x: 2080, y: 420 },
  { src: "/gallery/dummy-07.svg", w: 210, x: 2420, y: 180 },
  { src: "/gallery/dummy-08.svg", w: 185, x: 2760, y: 520 },
  // heart of the field
  { src: "/gallery/dummy-09.svg", w: 300, x: 1280, y: 900 },
  { src: "/gallery/dummy-10.svg", w: 180, x: 1640, y: 1120 },
  { src: "/gallery/dummy-11.svg", w: 225, x: 980, y: 1240 },
  { src: "/gallery/dummy-12.svg", w: 160, x: 1520, y: 700 },
  // lower-left cluster
  { src: "/gallery/dummy-13.svg", w: 250, x: 340, y: 1500 },
  { src: "/gallery/dummy-14.svg", w: 170, x: 660, y: 1760 },
  { src: "/gallery/dummy-15.svg", w: 205, x: 180, y: 1900 },
  // lower-right drift
  { src: "/gallery/dummy-16.svg", w: 235, x: 2280, y: 1500 },
  { src: "/gallery/dummy-17.svg", w: 155, x: 2650, y: 1780 },
  { src: "/gallery/dummy-18.svg", w: 275, x: 1980, y: 1920 },
];
