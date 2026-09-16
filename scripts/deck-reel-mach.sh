#!/bin/bash
# MACH deck reel: six cuts from the case clips — LED volume, the reveal, the worlds, the drive — seamless loop.
set -e
B=/Users/admin/test/portfolio/public/case/mach
OUT=/Users/admin/test/portfolio/public/deck
D=2.2; X=0.5
ffmpeg -v error -nostdin -y \
 -ss 2.0 -t $D -i "$B/hero.mp4" \
 -ss 12.5 -t $D -i "$B/reveal.mp4" \
 -ss 3.0 -t $D -i "$B/anywhere.mp4" \
 -ss 14.0 -t $D -i "$B/anywhere.mp4" \
 -ss 25.0 -t $D -i "$B/drive.mp4" \
 -ss 40.0 -t $D -i "$B/drive.mp4" \
 -ss 2.0 -t $D -i "$B/hero.mp4" \
 -filter_complex "
 [0:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c0];[1:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c1];[2:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c2];[3:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c3];[4:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c4];[5:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c5];[6:v]scale=-2:800:flags=lanczos,crop=1280:800,setsar=1,fps=30[c6];
 [c0][c1]xfade=transition=fade:duration=$X:offset=1.7[a];
 [a][c2]xfade=transition=slideleft:duration=$X:offset=3.4[b];
 [b][c3]xfade=transition=wipeleft:duration=$X:offset=5.1[c];
 [c][c4]xfade=transition=fadeblack:duration=$X:offset=6.8[d];
 [d][c5]xfade=transition=fade:duration=$X:offset=8.5[e];
 [e][c6]xfade=transition=fade:duration=$X:offset=10.2[f];
 [f]trim=0:10.7,setpts=PTS-STARTPTS[v]" \
 -map "[v]" -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/mach.mp4"
ffmpeg -v error -nostdin -y -i "$OUT/mach.mp4" -frames:v 1 "$OUT/mach.png" && cd /Users/admin/test/portfolio && node -e 'require("sharp")("public/deck/mach.png").webp({quality:90}).toFile("public/deck/mach.poster.webp").then(()=>{})' && rm "$OUT/mach.png"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$OUT/mach.mp4"; stat -f %z "$OUT/mach.mp4"
