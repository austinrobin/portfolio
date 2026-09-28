#!/usr/bin/env python3
"""Build the Bloom Algo showreel stage (fonts/, a/, seq/) — all git-ignored.
    python3 scripts/reel/bloom/prep.py && node scripts/reel/tools/render.cjs bloom full /tmp/bloom.mkv"""
import os, shutil, subprocess
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
B = "/Users/admin/Documents/Claude/Porftfolio/Bloom Algo"
CASE = os.path.abspath(os.path.join(HERE, "../../../public/case/bloom-algo"))
MANROPE = "/Users/admin/Documents/Claude/High mails/waitlistemail/fonts/manrope"
for d in ("a", "seq", "fonts"): os.makedirs(f"{HERE}/{d}", exist_ok=True)
for w in ("Medium", "SemiBold", "Bold", "ExtraBold"): shutil.copy(f"{MANROPE}/Manrope-{w}.ttf", f"{HERE}/fonts/")
def fit(src, dst, m):
    im = Image.open(f"{B}/{src}").convert("RGBA" if dst.endswith(".png") else "RGB"); im.thumbnail((m, m), Image.LANCZOS)
    im.save(f"{HERE}/a/{dst}", **({"quality": 90} if dst.endswith(".jpg") else {"optimize": True}))
fit("okouao_Create_a_architectural_abstract_shot_in_technicolor_of_6f57fadd-eba2-41d3-b2bc-fe87cbccad39_0.png", "flowers.jpg", 2400)
fit("okooko_masterpiece_best_quality_highly_detailed_illustration__9f39d649-0881-4a11-8a8a-d3deffdfb862_0.png", "goldfish.jpg", 2400)
fit("kitmeng_A_highly_detailed_butterfly_metamorphasis_--ar_54_--p_8eaa0842-b12a-4c96-b333-b3a4b7173b72_0.png", "butterfly.jpg", 2400)
fit("Notifications baskets.png", "notif.png", 1257); fit("Frame 1948759602.png", "mtm.png", 667); fit("Frame 1948759601.png", "pl.png", 667)
fit("Frame 1948759591.png", "instances.png", 620); fit("BloomAlgo - PERCENTAGE LOSS.png", "plcard.png", 900)
# the pinwheel, keyed off the cream brand-board tile
a = np.asarray(Image.open(f"{B}/Desktop - 20.png").convert("RGB")).astype(int); cy, cx = a.shape[0] // 2, a.shape[1] // 2
crop = a[cy - 170:cy + 170, cx - 170:cx + 170]; alpha = np.clip((np.sqrt(((crop - crop[5, 5]) ** 2).sum(2)) - 18) * 6, 0, 255).astype(np.uint8)
ys, xs = np.where(alpha > 40)
Image.fromarray(np.dstack([crop.astype(np.uint8), alpha])[ys.min() - 4:ys.max() + 5, xs.min() - 4:xs.max() + 5], "RGBA").save(f"{HERE}/a/logo.png")
for n in ("strategy", "deployed", "trade", "alerts"):
    d = f"{HERE}/seq/{n}"; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", f"{CASE}/{n}.mp4", "-vf", "fps=30,scale=-2:760:flags=lanczos", "-q:v", "3", f"{d}/%04d.jpg"], check=True)
print("stage ready:", HERE)
