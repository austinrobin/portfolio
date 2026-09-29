/* The loader plate: six engravings (a coastline, palms, a gathering, a
   valley, a summit, a wave) flipped through at speed, like riffling a stack
   of banknote plates. Three sprites of cream lines on transparency — 1x,
   retina 2x, and a phone crop of each plate's centre — tinted by CSS,
   stepped by CSS; no JavaScript runs while it plays (scripts/loader-plates.mjs
   rebuilds them from the handover folder). */

export const PLATE_FRAMES = 6;
const SPRITE = "/loader/plates.webp"; // 1672px frames, 1x screens
const SPRITE_2X = "/loader/plates-2x.webp"; // 3344px frames, retina desktops
const SPRITE_M = "/loader/plates-m.webp"; // phones: the central 40% of each plate at 2x
const AR = 1672 / 941, AR_M = 1338 / 1882; // frame aspect: the cover box is the smallest box of that shape covering the viewport

/* the step animation lives with the component (0 → 120% lands exactly on
   frames 0…5 with steps(6)); people who prefer reduced motion get a still */
const CSS = `@keyframes plate-run{from{background-position-y:0%}to{background-position-y:120%}}
.plate-sprite{width:max(100vw,calc(100vh * ${AR}));height:max(100vh,calc(100vw / ${AR}));background-image:url(${SPRITE});background-image:-webkit-image-set(url(${SPRITE}) 1x,url(${SPRITE_2X}) 2x);background-image:image-set(url(${SPRITE}) 1x,url(${SPRITE_2X}) 2x)}
@media (max-width:640px){.plate-sprite{width:max(100vw,calc(100vh * ${AR_M}));height:max(100vh,calc(100vw / ${AR_M}));background-image:url(${SPRITE_M})}}
.plate-run{animation:plate-run .84s steps(${PLATE_FRAMES}) infinite}
@media (prefers-reduced-motion: reduce){.plate-run{animation:none}}`;

/* The plates fill the whole screen: the smallest 16:9 box that covers the
   viewport, centred, so each engraving is cropped like a cover image rather
   than stretched. */
export function PlateRun({ running = true }: { running?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={{ background: "#101BBC" }}>
      <style>{CSS}</style>
      <div
        className={`plate-sprite absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${running ? "plate-run" : ""}`}
        style={{
          backgroundSize: `100% ${PLATE_FRAMES * 100}%`,
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}

/** The full-screen curtain the plates run on. `lift` slides it away. */
export function Curtain({ lift, running = true }: { lift: boolean; running?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background: "#101BBC",
        transform: lift ? "translateY(-101%)" : "translateY(0)",
        transition: lift ? "transform 720ms cubic-bezier(0.76, 0, 0.24, 1)" : "none",
        willChange: "transform",
      }}
    >
      <PlateRun running={running && !lift} />
    </div>
  );
}
