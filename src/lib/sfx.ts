/*
 * The site's three sounds — a typewriter key under every press on a link
 * or button, a shutter on the camera, a whoosh when a piece is dragged
 * across the desk. Each is a short cut of Austin's sound files (the first
 * spike only), a tiny mono WAV decoded once into Web Audio, so there is no
 * decoder delay between the press and the sound.
 *
 * Browsers only let a page make sound after a press; every trigger here is
 * one, and the context resumes on the first. Nothing plays for reduced
 * motion, and nothing plays in Studio.
 */
export type Sfx = "key" | "shutter" | "whoosh";

const SRC: Record<Sfx, string> = {
  key: "/sfx/key.wav",
  shutter: "/sfx/shutter.wav",
  whoosh: "/sfx/whoosh.wav",
};
const GAIN: Record<Sfx, number> = { key: 0.32, shutter: 0.55, whoosh: 0.45 };

let ctx: AudioContext | null = null;
const buffers = new Map<Sfx, Promise<AudioBuffer | null>>();

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function load(name: Sfx): Promise<AudioBuffer | null> {
  let p = buffers.get(name);
  if (!p) {
    p = (async () => {
      const c = context();
      if (!c) return null;
      try {
        const res = await fetch(SRC[name]);
        return await c.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(name, p);
  }
  return p;
}

/** fetch and decode the three sounds ahead of the first press */
export function warmSfx(): void {
  (Object.keys(SRC) as Sfx[]).forEach((n) => void load(n));
}

const quiet = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** play one sound now (from a press — the context needs a gesture to resume) */
export function playSfx(name: Sfx): void {
  if (quiet()) return;
  const c = context();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  void load(name).then((buf) => {
    if (!buf || c.state !== "running") return;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = GAIN[name];
    src.connect(gain).connect(c.destination);
    src.start();
  });
}
