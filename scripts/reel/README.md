# Showreels

Deck covers are rendered, not edited: each project is a small web page whose
every frame is a pure function of time (`window.renderFrame(i)`), captured
frame-by-frame in headless Chromium and piped into ffmpeg. That gives the
real brand fonts, SVG sticker type, CSS 3D and live phone screens at an exact
60 fps, and any frame can be re-rendered on its own.

- `lib.js` — the shared motion kit: easing, springs, `put()` placement,
  `StickerText` (letter-by-letter type with layered outlines), procedural
  swirl / waves / rays, and a `Phone` with a live screen.
- `<project>/scenes.js` — the storyboard as code; `<project>/index.html` boots it.
- `<project>/prep.py` — builds the stage (`fonts/`, `a/`, `seq/`) from the
  handover folder. Those folders are git-ignored: fonts are licensed files and
  the rest is derived.
- `tools/render.cjs` — `node scripts/reel/tools/render.cjs high stills /tmp/s 0,4.2,9.9`
  for storyboard frames, `… high full /tmp/high.mkv` for the 4:4:4 master.

Web encodes from the master (see the HIGH commit for the exact settings):
`public/deck/<id>.mp4` (H.264), `.hevc.mp4`, `.av1.mp4`, `.p1080.mp4`,
`.p1080.hevc.mp4` and `.poster.webp`, then `npm run media:variants`.
