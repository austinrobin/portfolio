#!/usr/bin/env python3
"""Build the LWT showreel stage (fonts/, a/) — git-ignored.
    python3 scripts/reel/lwt/prep.py && node scripts/reel/tools/render.cjs lwt full /tmp/lwt.mkv
Aeonik (LWT's typeface) comes from ~/Library/Fonts; it is licensed, never committed."""
import os, shutil
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
H = "/Users/admin/Documents/Claude/Porftfolio/LWT"
CASE = os.path.abspath(os.path.join(HERE, "../../../public/case/lwt"))
for d in ("a", "fonts"): os.makedirs(f"{HERE}/{d}", exist_ok=True)
for w in ("Light", "Regular", "Medium"): shutil.copy(os.path.expanduser(f"~/Library/Fonts/Aeonik-{w}.ttf"), f"{HERE}/fonts/")
# the mark: white on the gradient slide → alpha at 3x with a steep edge (recoloured in CSS through a mask)
a = np.asarray(Image.open(f"{H}/85.png").convert("RGB")).astype(float)
alpha = np.clip((a.min(2) - 170) * 4.0, 0, 255)
ys, xs = np.where(alpha > 60); x0, x1, y0, y1 = xs.min() - 6, xs.max() + 7, ys.min() - 6, ys.max() + 7
al = np.asarray(Image.fromarray(alpha[y0:y1, x0:x1].astype(np.uint8)).resize(((x1 - x0) * 3, (y1 - y0) * 3), Image.LANCZOS)).astype(float)
al = np.clip((al - 128) * 2.2 + 128, 0, 255).astype(np.uint8)
Image.fromarray(np.dstack([np.full(al.shape, 255, np.uint8)] * 3 + [al]), "RGBA").save(f"{HERE}/a/mark.png")
for k in ["building-sign", "stage-screen", "flags", "lightbox", "hoarding", "business-cards", "auditorium", "meter", "poster-family"]:
    Image.open(f"{CASE}/{k}.webp").convert("RGB").save(f"{HERE}/a/{k}.jpg", quality=92)
print("stage ready:", HERE)
