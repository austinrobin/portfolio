import heroDefaults from "../../../content/hero.json";

export interface HeroSettings {
  headline: string;
  /** Tile size in css px */
  cell: number;
  /** Outer imprint radius on hover */
  hoverRadius: number;
  /** Outer radius while press-holding */
  holdRadius: number;
  holdGrowMs: number;
  /** Trail persistence — higher lingers longer */
  decay: number;
  /** Idle surface texture strength */
  textureStrength: number;
  /** Click ripple ring strength */
  rippleStrength: number;
  /** Shine zone as a fraction of the outer radius */
  nearRatio: number;
  /** Elevation/shine intensity in the near zone */
  shine: number;
}

/* Tunables live in content/hero.json — editable from /studio. */
export const heroConfig: HeroSettings = heroDefaults;
