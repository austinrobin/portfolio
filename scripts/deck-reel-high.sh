#!/bin/bash
# High deck cover reel: seven cuts from the promo footage, 16:10, silent, seamless loop.
set -e
H="/Users/admin/Documents/Claude/Porftfolio/HIGH"
OUT=/Users/admin/test/portfolio/public/deck
D=1.9; X=0.45
cut() { # $1 file, $2 start
  echo "-ss $2 -t $D -i"; }
ffmpeg -v error -nostdin -y \
 -ss 4.2 -t $D -i "$H/HIGH APP FINAL V2.mp4" \
 -ss 9.6 -t $D -i "$H/HIGH APP FINAL V2.mp4" \
 -ss 1.2 -t $D -i "$H/austin high 50mpbs v22.mp4" \
 -ss 17.6 -t $D -i "$H/HIGH APP FINAL V2.mp4" \
 -ss 6.0 -t $D -i "$H/gethigh for promo v33.mp4" \
 -ss 33.5 -t $D -i "$H/Theunusualdinner.mp4" \
 -ss 21.5 -t $D -i "$H/HIGH APP FINAL V2.mp4" \
 -ss 4.2 -t $D -i "$H/HIGH APP FINAL V2.mp4" \
 -filter_complex "
 [0:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c0];[1:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c1];[2:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c2];[3:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c3];[4:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c4];[5:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c5];[6:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c6];[7:v]scale=-2:800,crop=1280:800,fps=30,setsar=1[c7];
 [c0][c1]xfade=transition=slideleft:duration=$X:offset=1.45[a];
 [a][c2]xfade=transition=fade:duration=$X:offset=2.9[b];
 [b][c3]xfade=transition=slideup:duration=$X:offset=4.35[c];
 [c][c4]xfade=transition=wiperight:duration=$X:offset=5.8[d];
 [d][c5]xfade=transition=fade:duration=$X:offset=7.25[e];
 [e][c6]xfade=transition=fadeblack:duration=$X:offset=8.7[f];
 [f][c7]xfade=transition=fade:duration=$X:offset=10.15[g];
 [g]trim=0:10.6,setpts=PTS-STARTPTS[v]" \
 -map "[v]" -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/high.mp4"
ffmpeg -v error -nostdin -y -i "$OUT/high.mp4" -frames:v 1 "$OUT/high.png" && cd /Users/admin/test/portfolio && node -e 'require("sharp")("public/deck/high.png").webp({quality:90}).toFile("public/deck/high.poster.webp").then(()=>console.log("poster"))' && rm "$OUT/high.png"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$OUT/high.mp4"; stat -f %z "$OUT/high.mp4"
