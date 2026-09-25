/*
 * Where a media file is fetched from.
 *
 * Vercel's edge delivers ~200KB/s per connection to India (measured
 * 2026-09-25, Mumbai PoP, cached or not), and a browser shares one HTTP/2
 * connection per origin — so a media-heavy page crawled. jsDelivr fronts any
 * public GitHub repo and moves the same files 7× faster from here, so on
 * Vercel builds every media URL is rewritten to jsDelivr, pinned to the
 * deployed commit (the URL changes with every deploy, so nothing is ever
 * stale). jsDelivr refuses files over 20MB; those stay on the site's own
 * origin, and every <img>/<video> keeps a same-origin fallback in case the
 * CDN is unreachable. Locally the base is empty and nothing changes.
 */
import variants from "../../content/media-variants.json";

const BASE = process.env.NEXT_PUBLIC_MEDIA_BASE ?? "";
const SIZES = (variants as { sizes?: Record<string, number> }).sizes ?? {};
export const CDN_MAX_BYTES = 20_000_000;

/** true when the file may be served from the CDN (known and under the limit) */
export function onCdn(path: string): boolean {
  if (!BASE) return false;
  const bytes = SIZES[path];
  return typeof bytes === "number" && bytes <= CDN_MAX_BYTES;
}
/** the URL to fetch `path` from (CDN when possible, else the site itself) */
export function mediaUrl(path: string): string {
  return onCdn(path) ? BASE + path : path;
}
/** for <img onError>: fall back to the site's own copy once */
export function fallbackToOrigin(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (!BASE || !img.src.startsWith(BASE)) return;
  const path = img.src.slice(BASE.length);
  img.srcset = "";
  img.src = path;
}
