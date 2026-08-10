import heroDefaults from "../../../content/hero.json";

export interface HeroSettings {
  /* text (rendered as normal DOM in the left column) */
  headline: string;
  sub: string;

  /* layout — where the portrait sits inside the hero */
  slotWidthFrac: number; // right-hand slot as a fraction of hero width
  portraitScale: number; // fill within that slot
  anchorX: number; // 0..1 horizontal anchor inside the slot
  anchorY: number; // 1 = bottom-anchored (keeps the chin on a stable baseline)

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
