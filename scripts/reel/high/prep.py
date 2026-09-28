#!/usr/bin/env python3
"""Build the HIGH showreel stage (fonts/, a/, seq/) from Austin's handover files.

    python3 scripts/reel/high/prep.py
    node scripts/reel/tools/render.cjs high full /tmp/high-master.mkv

Nothing this writes is committed: fonts are licensed files and everything else
is derived from the handover folder, the HIGH email SVGs and the waitlist site.
"""
import base64, glob, hashlib, io, os, re, shutil, subprocess, sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REEL = os.path.dirname(HERE)
HANDOVER = "/Users/admin/Documents/Claude/Porftfolio/HIGH"
MAILS = "/Users/admin/Documents/Claude/High mails"
WAITLIST = "/Users/admin/test/high-waitlist/assets"
PUBLIC = os.path.abspath(os.path.join(REEL, "../../public"))
A = os.path.join(HERE, "a")
TMP = os.path.join(HERE, ".prep")
for d in ("fonts", "a/st", "a/obj", "a/post", "a/bg", "seq", ".prep/emb"):
    os.makedirs(os.path.join(HERE, d), exist_ok=True)


def run(*cmd):
    subprocess.run(cmd, check=True)


# ---------------------------------------------------------------- fonts
roc = f"{MAILS}/waitlistemail/fonts/roc"
for w in ("Black", "Heavy", "ExtraBold", "Bold", "Medium"):
    src = next(p for p in glob.glob(f"{roc}/**/fonnts.com-Roc_Grotesk_Compressed_{w}.otf", recursive=True) if "__MACOSX" not in p)
    shutil.copy(src, f"{HERE}/fonts/Roc-{w}.otf")
for w in ("Regular", "Medium", "SemiBold", "Bold", "ExtraBold"):
    shutil.copy(f"{MAILS}/waitlistemail/fonts/manrope/Manrope-{w}.ttf", f"{HERE}/fonts/")

# ---------------------------------------------------------------- the HI*H mark (vector, from an email SVG)
run("node", f"{REEL}/tools/extract-logo.cjs", f"{MAILS}/Modification/Modification.svg", f"{A}/logo.svg", "470", "30", "620", "130")

# ---------------------------------------------------------------- embedded images in the email SVGs
for svg in sorted(glob.glob(f"{MAILS}/**/*.svg", recursive=True)):
    s = open(svg, encoding="utf8", errors="ignore").read()
    for m in re.finditer(r'(?:xlink:)?href="data:image/(png|jpeg|jpg|webp);base64,([^"]+)"', s):
        raw = base64.b64decode(m.group(2))
        h = hashlib.md5(raw).hexdigest()[:10]
        out = f"{TMP}/emb/{h}.png"
        if not os.path.exists(out):
            try:
                Image.open(io.BytesIO(raw)).convert("RGBA").save(out)
            except Exception:
                pass
E = f"{TMP}/emb"


def trim(im, thr=24, pad=6):
    a = np.asarray(im.getchannel("A"))
    ys, xs = np.where(a > thr)
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1)))


def save(im, path, maxd):
    im = trim(im)
    if max(im.size) > maxd:
        im.thumbnail((maxd, maxd), Image.LANCZOS)
    im.save(path, optimize=True)


def components(alpha, min_area, grow=9):
    g = np.asarray(Image.fromarray(((alpha > 40) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(grow))) > 0
    H, W = g.shape
    lab = np.zeros((H, W), np.int32)
    n, boxes = 0, []
    for y0 in range(0, H, 3):
        for x0 in range(0, W, 3):
            if g[y0, x0] and not lab[y0, x0]:
                n += 1
                q = deque([(y0, x0)]); lab[y0, x0] = n
                x1 = x2 = x0; y1 = y2 = y0; cnt = 0
                while q:
                    y, x = q.popleft(); cnt += 1
                    x1, x2, y1, y2 = min(x1, x), max(x2, x), min(y1, y), max(y2, y)
                    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                        if 0 <= ny < H and 0 <= nx < W and g[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                if cnt >= min_area:
                    boxes.append((n, x1, y1, x2, y2))
    return lab, boxes


# ---------------------------------------------------------------- stickers
singles = {"thumbs": "1c5c19c378", "skull": "1e158ea94f", "peace": "a6c29f6ec1", "coins": "a008036593", "disco": "63bf26c26f", "tentacle1": "97c3b583bc", "tentacle2": "a13fb5c96a",
           "popsicle": "b8c44e4baf", "bag": "869bff050f", "dripx": "7b08c27cad", "shades": "a0313f5662", "pacman": "65226faaf6", "cash": "eb21a65fe5", "nimbu": "d2759b23e0", "mappin": "fc5c8eb150", "bank": "18cd2ccde6"}
for k, h in singles.items():
    save(Image.open(f"{E}/{h}.png").convert("RGBA"), f"{A}/st/{k}.png", 720 if k in ("disco", "tentacle1", "tentacle2", "coins", "cash") else 560)
sheets = {"s24": "24cb2bbe2c", "s60": "a60e33c2d0", "s95": "9536946224", "s89": "893a92cb1f", "s9b": "9b1f8afebd", "scb": "cb0d1e2700"}
for k, h in sheets.items():
    im = Image.open(f"{E}/{h}.png").convert("RGBA")
    a = np.asarray(im.getchannel("A"))
    lab, boxes = components(a, int(a.size * 0.002))
    for j, (n, x1, y1, x2, y2) in enumerate(sorted(boxes, key=lambda b: (b[2] // 80, b[1]))):
        sub = im.crop((x1, y1, x2 + 1, y2 + 1))
        mask = Image.fromarray(((lab[y1:y2 + 1, x1:x2 + 1] == n) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
        arr = np.asarray(sub).copy(); arr[..., 3] = np.minimum(arr[..., 3], np.asarray(mask))
        save(Image.fromarray(arr), f"{A}/st/{k}-{j}.png", 520)
for k, f, tol in (("box", "Box.png", 38), ("sheet", "gtrfedw.png", 22)):
    im = Image.open(f"{HANDOVER}/{f}").convert("RGBA")
    rgb = np.asarray(im.convert("RGB")).astype(int)
    H, W, _ = rgb.shape
    same = np.abs(rgb - rgb[4, 4]).sum(2) <= tol
    vis = np.zeros((H, W), bool); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if same[y, x] and not vis[y, x]: vis[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if same[y, x] and not vis[y, x]: vis[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < H and 0 <= nx < W and same[ny, nx] and not vis[ny, nx]:
                vis[ny, nx] = True; q.append((ny, nx))
    alpha = np.asarray(Image.fromarray(np.where(vis, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6)))
    arr = np.asarray(im).copy(); arr[..., 3] = alpha
    full = Image.fromarray(arr)
    lab, boxes = components(alpha, int(alpha.size * 0.003), grow=5)
    for j, (n, x1, y1, x2, y2) in enumerate(sorted(boxes, key=lambda b: (b[2] // 60, b[1]))):
        save(full.crop((x1, y1, x2 + 1, y2 + 1)), f"{A}/st/{k}-{j}.png", 520)

# ---------------------------------------------------------------- hero objects, posters, backgrounds
objs = {"card": (f"{E}/510130b379.png", 1300), "chain": (f"{WAITLIST}/hero-chain.png", 1000), "coin": (f"{PUBLIC}/current-coin.webp", 655),
        "hand-cards": (f"{E}/2a1d51a823.png", 1300), "hand-titan": (f"{E}/5e007dd6d7.png", 1300), "phone-purple": (f"{E}/6892d60aa0.png", 1400)}
for k, (p, m) in objs.items():
    im = trim(Image.open(p).convert("RGBA"), thr=40, pad=4)
    if max(im.size) > m: im.thumbnail((m, m), Image.LANCZOS)
    im.save(f"{A}/obj/{k}.png", optimize=True)
# the HIGH phone mockup, display cut out (944×1850, display 79,50 790×1734, r118)
shutil.copy(os.path.join(REEL, "shared/phone.png"), f"{A}/obj/phone.png")
posts = {"blink-dark": "Frame 1948762835.png", "crush": "Frame 1948762836.png", "heat": "Frame 1948762837.png", "noone": "Frame 1948762838.png", "blink-purple": "Frame 1948762839.png",
         "toohigh": "tyghbrcejdxs.png", "break": "tyrfed.png", "h72": "1.png", "didit": "3.png", "h48": "5gt4frec.png"}
for k, f in posts.items():
    im = Image.open(f"{HANDOVER}/{f}").convert("RGB"); im.thumbnail((1200, 1200), Image.LANCZOS); im.save(f"{A}/post/{k}.jpg", quality=92)
for k, f in {"star-purple": "1000049577.png", "star-green": "1000049578.png", "star-white": "1000049579.png", "star-black": "1000049580.png"}.items():
    shutil.copy(f"{HANDOVER}/backgrounds/{f}", f"{A}/bg/{k}.png")

# ---------------------------------------------------------------- footage as 60fps frame sequences
seqs = {"stock": ("ScreenRecording_09-24-2026 21-37-54_1.MP4", 20.4, 2.0), "collect": ("ScreenRecording_09-24-2026 20-43-09_1.MP4", 5.3, 2.4),
        "ipo": ("ScreenRecording_09-24-2026 21-34-06_1.mov", 3.4, 2.6), "watch": ("ScreenRecording_09-24-2026 20-19-47_1.MP4", 5.6, 2.0),
        "port": ("ScreenRecording_09-24-2026 20-20-18_1.MP4", 5.5, 2.0)}
for n, (f, ss, dur) in seqs.items():
    d = f"{HERE}/seq/{n}"; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    run("ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(ss), "-i", f"{HANDOVER}/{f}", "-t", str(dur), "-vf", "fps=60,scale=-2:960:flags=lanczos", "-q:v", "3", f"{d}/%04d.jpg")
d = f"{HERE}/seq/goat"; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", f"{PUBLIC}/case/high/meme-goat.mp4", "-t", "1.77", "-vf", "fps=60,scale=800:1000", "-q:v", "3", f"{d}/%04d.jpg")
print("stage ready:", HERE)
