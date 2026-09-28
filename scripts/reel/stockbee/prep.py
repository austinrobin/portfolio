#!/usr/bin/env python3
"""Build the StockBee showreel stage (fonts/, a/) — git-ignored.
    python3 scripts/reel/stockbee/prep.py && node scripts/reel/tools/render.cjs stockbee full /tmp/stockbee.mkv
Neue Haas Display and Proto Mono come from ~/Library/Fonts; they are licensed, never committed."""
import os, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
CASE = os.path.abspath(os.path.join(HERE, "../../../public/case/stockbee"))
FONTS = os.path.expanduser("~/Library/Fonts")
for d in ("a", "a/obj", "fonts"): os.makedirs(f"{HERE}/{d}", exist_ok=True)
for f in ("NeueHaasDisplayRoman.ttf", "NeueHaasDisplayMediu.ttf", "NeueHaasDisplayBold.ttf", "ProtoMono-Regular.ttf", "ProtoMono-Medium.ttf"):
    shutil.copy(f"{FONTS}/{f}", f"{HERE}/fonts/")
shutil.copy(os.path.join(HERE, "../shared/phone.png"), f"{HERE}/a/obj/phone.png")
# the product, as the case study shows it
for k in ["dashboard-ui", "terminal", "fno-table", "options-chart", "oi-gainers", "breakouts", "uptrend", "news-impact",
          "stock-list", "no-noise", "get-started", "lightning-fast", "ai-section", "tablet-feed", "radar", "funnel"]:
    im = Image.open(f"{CASE}/{k}.webp").convert("RGB"); im.thumbnail((1400, 1400), Image.LANCZOS)
    im.save(f"{HERE}/a/{k}.jpg", quality=90)
print("stage ready:", HERE)
