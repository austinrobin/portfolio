import labDefaults from "../../../content/lab.json";

/* The Lab cascade's geometry — every number that shapes the spread and its
   hover state, editable from /studio (content/lab.json, git-backed saves). */
export interface LabExperiment {
  name: string;
  tag: string;
  title: string;
  blurb: string;
  glow?: string; // where the cover's light sits, e.g. "20% 15%"
  href?: string; // the live app — opens in a new tab
  cover?: string; // its share image, under /public
  tool?: string; // the AI tool it was built with, mentioned under the title
}

export interface LabCascadeSettings {
  /* the covers, front to back */
  experiments: LabExperiment[];
  /* placement */
  paneWidth: number; // % of the stage width
  paneAspect: number; // height / width — 1 = square cover
  stepX: number; // % step along the diagonal, per pane
  stepY: number; // % rise per pane
  /* angle */
  rotY: number; // resting Y rotation, deg
  rotX: number; // resting X tilt, deg (0 = verticals stay vertical)
  perspective: number; // px — smaller = more dramatic
  /* surface */
  radius: number; // corner radius, px
  shadowRest: number; // 0..1 shadow strength at rest
  shadowHover: number; // 0..1 shadow strength while active
  /* active state */
  slide: number; // % of the pane's own width it slides right
  activeScale: number;
  activeRotY: number; // Y rotation while active (same as rotY = pure slide)
}

export const labConfig: LabCascadeSettings = labDefaults;
