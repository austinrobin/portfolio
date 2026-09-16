#!/bin/bash
# StockBee deck reel: five shots, camera moves keyed to each frame, seamless 10.6s loop, 1280x800.
set -e
B=/Users/admin/test/portfolio/public/case/stockbee
OUT=/Users/admin/test/portfolio/public/deck
D=2.6; F=78; X=0.6
ffmpeg -v error -nostdin -y \
 -loop 1 -t $D -i "$B/meet-stockbee.webp" \
 -loop 1 -t $D -i "$B/terminal.webp" \
 -loop 1 -t $D -i "$B/no-noise.webp" \
 -loop 1 -t $D -i "$B/get-started.webp" \
 -loop 1 -t $D -i "$B/lightning-fast.webp" \
 -loop 1 -t $D -i "$B/meet-stockbee.webp" \
 -filter_complex "
 [0:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*t/$D':'(in_h-800)/2',setsar=1,fps=30[c0];
 [1:v]scale=1543:-2,crop=1388:868:78:0,scale=1280:800,zoompan=z='1+0.16*on/$F':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x800:fps=30,setsar=1[c1];
 [2:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*(1-t/$D)':'(in_h-800)/2',setsar=1,fps=30[c2];
 [3:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*(1-t/$D)':'(in_h-800)*(0.8-0.6*t/$D)',setsar=1,fps=30[c3];
 [4:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*t/$D':'(in_h-800)*(0.2+0.6*t/$D)',setsar=1,fps=30[c4];
 [5:v]scale=1600:-2,crop=1280:800:0:'(in_h-800)/2',setsar=1,fps=30[c5];
 [c0][c1]xfade=transition=zoomin:duration=$X:offset=2.0[a];
 [a][c2]xfade=transition=slideup:duration=$X:offset=4.0[b];
 [b][c3]xfade=transition=fade:duration=$X:offset=6.0[c];
 [c][c4]xfade=transition=smoothleft:duration=$X:offset=8.0[d];
 [d][c5]xfade=transition=fade:duration=$X:offset=10.0[e];
 [e]trim=0:10.6,setpts=PTS-STARTPTS[v]" \
 -map "[v]" -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/stockbee.mp4"
ffmpeg -v error -nostdin -y -i "$OUT/stockbee.mp4" -frames:v 1 "$OUT/stockbee.png" && cd /Users/admin/test/portfolio && node -e 'require("sharp")("public/deck/stockbee.png").webp({quality:90}).toFile("public/deck/stockbee.poster.webp").then(()=>{})' && rm "$OUT/stockbee.png"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$OUT/stockbee.mp4"; stat -f %z "$OUT/stockbee.mp4"
