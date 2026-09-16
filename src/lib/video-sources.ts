/*
 * Codec-aware sources for the site's videos.
 *
 * content/media-variants.json (npm run media:variants) lists, per H.264 file,
 * which companions exist: AV1 and HEVC beside it, a 1080-long-edge phone cut,
 * and the phone cut's HEVC. The browser reports what it can decode; we hand it
 * the lightest file it plays: AV1 on desktops that support it (about half the
 * bytes of the H.264 at measurably equal fidelity), HEVC for Safari and
 * phones with the hardware, H.264 everywhere else. Phones get the 1080 cut and
 * never AV1 (software decode stutters on cheap Androids).
 */
import variants from "../../content/media-variants.json";

export type VideoVariants = Record<
  string,
  { av1?: boolean; hevc?: boolean; p1080?: { h264: boolean; av1?: boolean; hevc?: boolean } }
>;
export type StillVariants = Record<string, { w: number; widths: number[] }>;
export type PosterVariants = Record<string, string>;
const V = variants as unknown as { stills: StillVariants; posters: PosterVariants; videos: VideoVariants };
export const STILLS = V.stills;
export const POSTERS = V.posters;

export type Codec = "av1" | "hevc" | "h264";
export const VIDEO_TYPE: Record<Codec, string> = {
  av1: 'video/mp4; codecs="av01.0.08M.08"',
  hevc: 'video/mp4; codecs="hvc1.1.6.L120.B0"',
  h264: 'video/mp4; codecs="avc1.640028"',
};
let decodeCache: Record<Codec, boolean> | null = null;
export function canDecode(): Record<Codec, boolean> {
  if (decodeCache) return decodeCache;
  const v = document.createElement("video");
  const ok = (c: Codec) => v.canPlayType(VIDEO_TYPE[c]) === "probably";
  decodeCache = { av1: ok("av1"), hevc: ok("hevc"), h264: true };
  return decodeCache;
}
export type VideoSource = { src: string; type: string };
/** `h264` is the .mp4 the manifest is keyed by. */
export function pickVideoSources(h264: string): VideoSource[] {
  const v = V.videos[h264];
  const phone = window.matchMedia("(max-width: 767px)").matches;
  const can = canDecode();
  const out: VideoSource[] = [];
  const stem = h264.replace(/\.mp4$/, "");
  if (phone && v?.p1080) {
    if (v.p1080.hevc && can.hevc) out.push({ src: `${stem}.p1080.hevc.mp4`, type: VIDEO_TYPE.hevc });
    if (v.p1080.h264) out.push({ src: `${stem}.p1080.mp4`, type: VIDEO_TYPE.h264 });
  } else if (v) {
    if (v.av1 && can.av1 && !phone) out.push({ src: `${stem}.av1.mp4`, type: VIDEO_TYPE.av1 });
    if (v.hevc && can.hevc) out.push({ src: `${stem}.hevc.mp4`, type: VIDEO_TYPE.hevc });
  }
  out.push({ src: h264, type: VIDEO_TYPE.h264 });
  return out;
}
