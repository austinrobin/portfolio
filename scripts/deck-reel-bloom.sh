#!/bin/bash
set -e
B=/Users/admin/test/portfolio/public/case/bloom-algo
OUT=/Users/admin/test/portfolio/public/deck
D=2.6; F=78; X=0.6   # seconds per shot, frames, crossfade
# shots: order tells the story — the metamorphosis idea, the promise, the product, the system, the person
# 1 butterfly: flies right → camera pans right with it
# 2 landing: headline above the dashboard → camera tilts down
# 3 laptop dashboard: → camera pushes in
# 4 brand board: a grid → enters from the right, camera drifts left
# 5 desk scene: wide and calm → slow diagonal drift
ffmpeg -v error -nostdin -y \
 -loop 1 -t $D -i "$B/butterfly.webp" \
 -loop 1 -t $D -i "$B/landing.webp" \
 -loop 1 -t $D -i "$B/dashboard.webp" \
 -loop 1 -t $D -i "$B/brand-board.webp" \
 -loop 1 -t $D -i "$B/calm.webp" \
 -loop 1 -t $D -i "$B/butterfly.webp" \
 -filter_complex "
 [0:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*t/$D':'(in_h-800)/2',setsar=1,fps=30[c0];
 [1:v]scale=1280:-2,crop=1280:800:0:'(in_h-800)*t/$D',setsar=1,fps=30[c1];
 [2:v]scale=1550:-2,crop=1395:872:78:0,scale=1280:800,zoompan=z='1+0.18*on/$F':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x800:fps=30,setsar=1[c2];
 [3:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*(1-t/$D)':'(in_h-800)/2',setsar=1,fps=30[c3];
 [4:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*t/$D':'(in_h-800)*(0.3+0.4*t/$D)',setsar=1,fps=30[c4];
 [5:v]scale=1600:-2,crop=1280:800:0:'(in_h-800)/2',setsar=1,fps=30[c5];
 [c0][c1]xfade=transition=slideup:duration=$X:offset=2.0[a];
 [a][c2]xfade=transition=zoomin:duration=$X:offset=4.0[b];
 [b][c3]xfade=transition=slideleft:duration=$X:offset=6.0[c];
 [c][c4]xfade=transition=smoothleft:duration=$X:offset=8.0[d];
 [d][c5]xfade=transition=fade:duration=$X:offset=10.0[e];
 [e]trim=0:10.6,setpts=PTS-STARTPTS[v]" \
 -map "[v]" -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/bloom-algo.mp4"
ffmpeg -v error -nostdin -y -i "$OUT/bloom-algo.mp4" -frames:v 1 -c:v libwebp -quality 90 "$OUT/bloom-algo.poster.webp"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration,nb_frames -of csv=p=0 "$OUT/bloom-algo.mp4"; ls -la "$OUT" | awk '{print $5,$9}'
