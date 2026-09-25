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
import { mediaUrl, onCdn } from "./media-url";

export type VideoVariants = Record<
  string,
  { av1?: boolean; hevc?: boolean; p1440?: { hevc?: boolean; av1?: boolean }; p1080?: { h264: boolean; av1?: boolean; hevc?: boolean } }
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
/**
 * `h264` is the .mp4 the manifest is keyed by. `tile` says how big the video
 * is drawn: a half-width tile never needs the full master, so it gets the
 * 1080 cut even on desktop — a third of the pixels to decode and to fetch.
 *
 * Order of preference is hardware first: HEVC decodes in silicon on every
 * Mac, iPhone and most Windows machines; AV1 is the lightest file but Apple
 * silicon before M3 has no AV1 decoder, so Chrome there decodes it on the CPU
 * and several streams at once stutter. AV1 stays for browsers without HEVC
 * (Firefox, Chrome on Linux/older Windows) where it is the best option.
 */
export function pickVideoSources(h264: string, tile: "full" | "half" = "full"): VideoSource[] {
  const v = V.videos[h264];
  const phone = window.matchMedia("(max-width: 767px)").matches;
  const can = canDecode();
  const stem = h264.replace(/\.mp4$/, "");
  const small = phone || tile === "half";
  // candidates in preference order; a rendition the CDN cannot serve (over
  // 20MB) drops behind the ones it can, since the origin is the slow path
  const wanted: { path: string; codec: Codec }[] = [];
  if (small && v?.p1080) {
    if (v.p1080.hevc && can.hevc) wanted.push({ path: `${stem}.p1080.hevc.mp4`, codec: "hevc" });
    if (v.p1080.h264) wanted.push({ path: `${stem}.p1080.mp4`, codec: "h264" });
  } else if (v) {
    if (v.hevc && can.hevc) wanted.push({ path: `${stem}.hevc.mp4`, codec: "hevc" });
    if (v.p1440?.hevc && can.hevc) wanted.push({ path: `${stem}.p1440.hevc.mp4`, codec: "hevc" });
    if (v.av1 && can.av1 && !phone && !can.hevc) wanted.push({ path: `${stem}.av1.mp4`, codec: "av1" });
    if (v.p1440?.av1 && can.av1 && !phone && !can.hevc) wanted.push({ path: `${stem}.p1440.av1.mp4`, codec: "av1" });
    if (v.p1080?.h264) wanted.push({ path: `${stem}.p1080.mp4`, codec: "h264" });
  }
  wanted.push({ path: h264, codec: "h264" });
  const cdn = wanted.filter((w) => onCdn(w.path));
  const origin = wanted.filter((w) => !onCdn(w.path));
  const ordered = process.env.NEXT_PUBLIC_MEDIA_BASE ? [...cdn, ...origin] : wanted;
  const out: VideoSource[] = ordered.map((w) => ({ src: mediaUrl(w.path), type: VIDEO_TYPE[w.codec] }));
  // and the site's own H.264 as the last resort if the CDN is unreachable
  if (out[out.length - 1].src !== h264) out.push({ src: h264, type: VIDEO_TYPE.h264 });
  return out;
}

/* At most this many clips decode at once on a page; the rest hold their
   poster/last frame until one of the playing ones scrolls away. */
const MAX_PLAYING = 3;
const playing = new Set<HTMLVideoElement>();
export function requestPlay(el: HTMLVideoElement): void {
  if (playing.has(el)) return;
  if (playing.size >= MAX_PLAYING) {
    // drop the one farthest from the viewport centre
    const mid = window.innerHeight / 2;
    let far: HTMLVideoElement | null = null, farD = -1;
    for (const p of playing) {
      const r = p.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d > farD) { farD = d; far = p; }
    }
    const r = el.getBoundingClientRect();
    if (far && Math.abs((r.top + r.bottom) / 2 - mid) < farD) { far.pause(); playing.delete(far); }
    else return;
  }
  playing.add(el);
  el.play().catch(() => { playing.delete(el); });
}
export function releasePlay(el: HTMLVideoElement): void {
  el.pause();
  playing.delete(el);
}
