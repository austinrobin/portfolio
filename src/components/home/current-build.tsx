import Image from "next/image";
import { heroFonts, INK } from "./hero-config";

/*
 * "Currently Building HIGH" — the current-experience block between the hero
 * and Selected Work. Layout, type scale and palette follow the Figma export
 * (Porftfolio/current.svg, 550x201): High Club silver coin at left with a
 * soft glow behind it, Peristiwa script "Currently / Building" beside it and
 * HIGH in Silk Sans Bold closing the second line. Everything scales with the
 * viewport exactly as the 1512 design does.
 */
export function CurrentBuild() {
  return (
    <section
      aria-label="Currently building — High"
      className={`${heroFonts.silk.variable} ${heroFonts.peristiwa.variable}`}
    >
      <div className="mx-auto flex w-fit items-center px-6 pt-12 pb-16 sm:pt-14 sm:pb-24">
        <div className="relative w-[clamp(120px,15.15vw,229px)] shrink-0">
          {/* soft glow — the design's blurred duplicate behind the coin */}
          <Image
            src="/current-coin.png"
            alt=""
            aria-hidden
            width={246}
            height={201}
            className="absolute inset-0 scale-105 blur-md opacity-70"
          />
          <Image
            src="/current-coin.png"
            alt="The High Club — 999.9 fine silver coin"
            width={246}
            height={201}
            className="relative"
          />
        </div>
        <p
          className="text-[clamp(28px,3.57vw,54px)] leading-[1.22]"
          style={{ fontFamily: "var(--font-peristiwa)", color: INK }}
        >
          Currently
          <br />
          Building{" "}
          <span
            className="font-bold tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-silk)" }}
          >
            HIGH
          </span>
        </p>
      </div>
    </section>
  );
}
