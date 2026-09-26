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
  /* graphic work and photographs woven together — no runs of one kind
     (the canvas re-deals per visit; this is the order the static grid uses) */
  { src: "/gallery/photo-05.webp", w: 250, alt: "Waves on the rocks at dusk" },
  { src: "/gallery/art-10.webp", w: 300 },
  { src: "/gallery/ig-post-4.webp", w: 290 },
  { src: "/gallery/photo-13.webp", w: 250, alt: "A lit palace at night" },
  { src: "/gallery/ig-post-29.webp", w: 230 },
  { src: "/gallery/photo-15.webp", w: 300, alt: "A herd from above" },
  { src: "/gallery/art-12.webp", w: 240 },
  { src: "/gallery/bloomalgo-deployed.webp", w: 320 },
  { src: "/gallery/photo-14.webp", w: 330, alt: "A Madhubani mural" },
  { src: "/gallery/art-01.webp", w: 310 },
  { src: "/gallery/photo-09.webp", w: 300, alt: "A building at dusk" },
  { src: "/gallery/art-08.webp", w: 230 },
  { src: "/gallery/photo-07.webp", w: 220, alt: "A window seat" },
  { src: "/gallery/frame-2697.webp", w: 230 },
  { src: "/gallery/company-infographic.webp", w: 240 },
  { src: "/gallery/photo-12.webp", w: 230, alt: "Prawns at the market" },
  { src: "/gallery/art-02.webp", w: 270 },
  { src: "/gallery/photo-21.webp", w: 230, alt: "A river over rocks" },
  { src: "/gallery/ig-post-5.webp", w: 330 },
  { src: "/gallery/art-07.webp", w: 300 },
  { src: "/gallery/photo-10.webp", w: 240, alt: "A camper van on a mountain road" },
  { src: "/gallery/main-frame.webp", w: 260 },
  { src: "/gallery/photo-04.webp", w: 210, alt: "A concert from the crowd" },
  { src: "/gallery/art-06.webp", w: 210 },
  { src: "/gallery/photo-18.webp", w: 240, alt: "A still sea at sunset" },
  { src: "/gallery/art-04.webp", w: 250 },
  { src: "/gallery/inactive-day2-push.webp", w: 250 },
  { src: "/gallery/photo-16.webp", w: 290, alt: "A street dog, black and white" },
  { src: "/gallery/subscription-plan.webp", w: 280 },
  { src: "/gallery/photo-20.webp", w: 360, alt: "A cloudscape over the shore" },
  { src: "/gallery/company-infographic-1.webp", w: 240 },
  { src: "/gallery/photo-19.webp", w: 360, alt: "Fishermen and their boat" },
  { src: "/gallery/bloomalgo-percentage-loss.webp", w: 210 },
  { src: "/gallery/signup.webp", w: 360 },
  { src: "/gallery/photo-11.webp", w: 260, alt: "A jeep under snow" },
  { src: "/gallery/art-05.webp", w: 310 },
  { src: "/gallery/photo-06.webp", w: 310, alt: "A river through a mountain valley" },
  { src: "/gallery/in-app.webp", w: 300 },
  { src: "/gallery/wtp.webp", w: 220 },
  { src: "/gallery/photo-17.webp", w: 210, alt: "The moon and a bird" },
  { src: "/gallery/art-09.webp", w: 220 },
  { src: "/gallery/photo-08.webp", w: 320, alt: "A bar at night" },
  { src: "/gallery/ig-post-55.webp", w: 240 },
  { src: "/gallery/photo-01.webp", w: 240, alt: "A church cross against a grey sky" },
  { src: "/gallery/frame-5921.webp", w: 220 },
  { src: "/gallery/art-03.webp", w: 240 },
  { src: "/gallery/photo-02.webp", w: 250, alt: "Palms from below" },
  { src: "/gallery/inactive-day2-push-1.webp", w: 250 },
  { src: "/gallery/photo-03.webp", w: 230, alt: "A church facade in the sun" },
  { src: "/gallery/art-11.webp", w: 290 },
];
