import lifeDefaults from "../../../content/life.json";

/* Studio / Life — the desk spread. Everything on the desk is editable from
   /studio (content/life.json, git-backed saves): the three polaroids, the
   camera that plays the YouTube film, the wax seal and the record. */
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

export interface LifeRecord {
  cover: string; // the album sleeve, square (≤800px WebP); empty hides the record
  audio: string; // the cut of the song, /life/… (mp3)
  title: string; // on the label
  artist: string;
  from: number; // seconds into the file where the cut starts
  to: number; // …and where it stops (loops back to `from` while hovered)
  resume: number; // seconds — hover again within this and the song carries on, later and it starts over
}

export type LifePieceId = "p1" | "p2" | "p3" | "camera" | "seal" | "record" | "stamp";
export interface LifePieceLayout {
  x: number; // % of the desk's width, the piece's left edge
  y: number; // % of the desk's height, the piece's top edge
  w: number; // width, px
  r?: number; // tilt, deg (photos take theirs from LifePhoto.rotate)
}
export type LifeLayout = Record<LifePieceId, LifePieceLayout>;

export interface LifeSettings {
  seal: string; // the wax seal (a cut-out with alpha); empty hides it
  stamp: string; // a postage stamp (a cut-out with alpha); empty hides it
  deskHeight: number; // px, the desktop canvas
  layout: LifeLayout; // where every piece sits on the desk
  photos: LifePhoto[]; // three
  video: LifeVideo;
  record: LifeRecord; // the album on the desk — hover and it plays
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
