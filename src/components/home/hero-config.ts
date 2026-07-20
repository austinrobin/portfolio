import heroDefaults from "../../../content/hero.json";

export interface HeroSettings {
  headline: string;
  cell: number;
  hoverRadius: number;
  holdRadius: number;
  holdGrowMs: number;
  decay: number;
  textureStrength: number;
  rippleStrength: number;
  deform: number;
}

/* Tunables live in content/hero.json — editable from /studio. */
export const heroConfig: HeroSettings = heroDefaults;
