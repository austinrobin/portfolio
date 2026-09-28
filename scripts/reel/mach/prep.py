#!/usr/bin/env python3
"""Build the MACH showreel stage (fonts/, seq/) — git-ignored.
    python3 scripts/reel/mach/prep.py && node scripts/reel/tools/render.cjs mach full /tmp/mach.mkv
Benzin and Proto Mono come from ~/Library/Fonts; they are licensed, never committed.
Every shot is cut from the case-study films at 30 fps; letterboxed shots are
cropped to 2.39:1 (1280x536), the 'anywhere' worlds keep their full 16:9."""
import os, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
CASE = os.path.abspath(os.path.join(HERE, "../../../public/case/mach"))
FONTS = os.path.expanduser("~/Library/Fonts")
for d in ("fonts", "seq"): os.makedirs(f"{HERE}/{d}", exist_ok=True)
for f in ("Benzin-ExtraBold.ttf", "Benzin-Bold.ttf", "Benzin-Medium.ttf", "Benzin-Regular.ttf", "ProtoMono-Regular.ttf"):
    shutil.copy(f"{FONTS}/{f}", f"{HERE}/fonts/")
WIDE = "crop=iw:iw/2.39,scale=1280:536:flags=lanczos"
FULL = "scale=1280:720:flags=lanczos"
# name: (film, start s, frames, framing)
CUTS = {
    "cube":    ("hero", 0.2, 84, WIDE),       # the LED-tile cube (the anchor)
    "led1":    ("hero", 8.5, 36, WIDE),       # the volume's ceiling lights up at sunset
    "led2":    ("hero", 11.1, 30, WIDE),      # the curved wall, the set in front of it
    "lcd":     ("reveal", 3.2, 42, WIDE),     # the camera's monitor: green screen
    "final":   ("reveal", 13.8, 36, WIDE),    # the finished world
    "street":  ("anywhere", 1.2, 16, FULL),   # same two people, five worlds
    "desert":  ("anywhere", 6.0, 16, FULL),
    "jungle":  ("anywhere", 14.0, 16, FULL),
    "globe":   ("anywhere", 21.0, 16, FULL),
    "room":    ("anywhere", 25.0, 18, FULL),
    "dune":    ("drive", 30.6, 15, WIDE),     # the Defender, side-on, three worlds
    "lake":    ("drive", 32.6, 15, WIDE),
    "market":  ("drive", 35.6, 15, WIDE),
    "road":    ("drive", 12.6, 15, WIDE),
    "jet":     ("mark", 1.9, 21, WIDE),       # the MACH jet
    "tail":    ("mark", 5.1, 24, WIDE),       # its tail livery
}
for name, (film, ss, n, vf) in CUTS.items():
    d = f"{HERE}/seq/{name}"; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(ss), "-i", f"{CASE}/{film}.mp4",
                    "-vf", f"fps=30,{vf}", "-frames:v", str(n), "-q:v", "3", f"{d}/%04d.jpg"], check=True)
    got = len(os.listdir(d)); assert got == n, (name, got, n)
print("stage ready:", HERE, {k: v[2] for k, v in CUTS.items()})
