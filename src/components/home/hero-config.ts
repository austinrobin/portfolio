import localFont from "next/font/local";
import heroDefaults from "../../../content/hero.json";

/* Banknote palette, fixed by the design (the hero stays paper-coloured in
   both themes; #F9F7F1 matches the currency art's baked background). */
export const PAPER = "#F9F7F1";
export const INK = "#101BBC";

/* Design fonts from the Figma reference. Both are trial/personal-use
   licences — flagged for purchase before public launch. */
const silk = localFont({
  src: [
    { path: "../../fonts/SilkSansDisplay-Medium.ttf", weight: "500" },
    { path: "../../fonts/SilkSansDisplay-Bold.ttf", weight: "700" },
  ],
  variable: "--font-silk",
  display: "swap",
});
const peristiwa = localFont({
  src: "../../fonts/Peristiwa.otf",
  variable: "--font-peristiwa",
  display: "swap",
});
export const heroFonts = { silk, peristiwa };

export interface HeroSettings {
  /* text (rendered as normal DOM per the banknote design) */
  headline: string; // name, letterspaced caps — left block
  role: string; // script line under the name
  sub: string; // script tagline — right block

  /* layout — where the portrait sits inside the hero (fractions of the
     1512x982 design canvas: width 0.481, centered, 6.4% bottom bleed) */
  slotWidthFrac: number; // portrait width as a fraction of hero width
  portraitScale: number; // multiplier on that width
  anchorX: number; // 0.5 = centered (the design centers exactly)
  anchorY: number; // 1 = bottom-anchored
  bleedFrac: number; // fraction of portrait height pushed below the fold

  /* mask + trail */
  brushRadius: number; // css px
  trailPersistence: number; // higher = the reveal lingers
  threshold: number; // lower = larger reveal
  edgeSoft: number; // boundary softness in field units

  /* torn edge */
  tearScale: number; // low-frequency warp frequency
  tearAmp: number; // warp amplitude (portrait uv)
  tearDrift: number; // ambient crawl of the noise field
  crumbScale: number; // high-frequency threshold noise
  crumbAmp: number;

  /* datamosh */
  bandPx: number; // band height, css px
  bandRate: number; // band re-rolls per second (0 = frozen)
  bandDensity: number; // fraction of bands that smear
  smearPx: number; // max horizontal offset, css px
  edgeBand: number; // reach from the threshold, field units
  maskSmearMix: number; // 0 skips the second mask fetch
  rgbSplitPx: number; // 0 skips the chroma fetches
  edgeGlow: number; // bright fringe along the tear

  /* guilloché pattern around the portrait (edge lathe-work; hover inks it) */
  patternOpacity: number; // resting alpha — very light
  patternHover: number; // alpha where the torn hover mask colours it
  patternSpacing: number; // ring spacing, css px
  patternSpeed: number; // machined phase drift, rad/s (0 = still)
  patternWobble: number; // strand undulation amount
  patternFadeIn: number; // radius where the pattern starts appearing
  patternFadeOut: number; // radius where it reaches full strength

  /* auto-scan */
  autoScan: boolean;
  autoScanDesktop: boolean;
  scanSpeed: number;
  idleMs: number;

  /* scan path (JSON-only — no Studio slider) */
  scanCenterX: number;
  scanCenterY: number;
  scanRadiusX: number;
  scanRadiusY: number;
}

/* Tunables live in content/hero.json — editable from /studio. */
export const heroConfig: HeroSettings = heroDefaults;
