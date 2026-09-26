import lifeDefaults from "../../../content/life.json";

/* Studio / Life — the desk spread. Everything on the desk is editable from
   /studio (content/life.json, git-backed saves): the three polaroids, the
   short note top-right, the handwritten line, and the cassette that plays
   the YouTube video. */
export interface LifePhoto {
  src: string; // /life/… or any public path (≤1200px WebP)
  caption: string; // handwritten under the photo
  date: string; // optional, handwritten beside the frame ("2025.04.11")
  rotate: number; // resting tilt, deg
  framed?: boolean; // true = the white frame is part of the image (a photographed print)
  w?: number; // pixel size of the file (reserves the print's shape before it loads)
  h?: number;
}

export interface LifeVideo {
  url: string; // any YouTube link (watch, youtu.be, shorts, embed); empty = coming soon
  title: string; // on the cassette label
  sub: string; // small line under the title
}

export interface LifeSettings {
  lines: string[]; // the note top-right, one line per entry
  signoff: string; // "Studio / Life."
  handle: string; // "/austin"
  note: string[]; // the handwritten line by the clover
  photos: LifePhoto[]; // three
  video: LifeVideo;
}

export const lifeConfig: LifeSettings = lifeDefaults;

/** YouTube id from any common link shape; null when it isn't one. */
export function youtubeId(url: string): string | null {
  const s = url.trim();
  if (!s) return null;
  const m =
    s.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) ??
    (/^[A-Za-z0-9_-]{11}$/.test(s) ? [s, s] : null);
  return m ? m[1] : null;
}
