/* The loader plate: six engravings (a coastline, palms, a gathering, a
   valley, a summit, a wave) flipped through at speed, like riffling a stack
   of banknote plates. One tiny 1-bit sprite — cream lines on transparency —
   tinted by CSS, stepped by CSS; no JavaScript runs while it plays. */

export const PLATE_FRAMES = 6;
const SPRITE = "/loader/plates.webp";

/* the step animation lives with the component (0 → 120% lands exactly on
   frames 0…5 with steps(6)); people who prefer reduced motion get a still */
const CSS = `@keyframes plate-run{from{background-position-y:0%}to{background-position-y:120%}}
.plate-run{animation:plate-run .84s steps(${PLATE_FRAMES}) infinite}
@media (prefers-reduced-motion: reduce){.plate-run{animation:none}}`;

export function PlateRun({ running = true }: { running?: boolean }) {
  return (
    <div
      aria-hidden
      className="relative aspect-video w-[min(72vw,560px)] overflow-hidden rounded-[3px]"
      style={{ background: "#101BBC", boxShadow: "inset 0 0 0 1px rgba(249,247,241,0.35), 0 40px 80px rgba(0,0,40,0.35)" }}
    >
      <style>{CSS}</style>
      <div
        className={`absolute inset-0 ${running ? "plate-run" : ""}`}
        style={{
          backgroundImage: `url(${SPRITE})`,
          backgroundSize: `100% ${PLATE_FRAMES * 100}%`,
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}

/** The full-screen curtain the plate sits on. `lift` slides it away. */
export function Curtain({ lift, running = true }: { lift: boolean; running?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
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
