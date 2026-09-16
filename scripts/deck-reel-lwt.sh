#!/bin/bash
# LWT deck reel: the mark, then the identity in the world — six stills with slow camera moves, seamless 10.6s loop.
set -e
B=/Users/admin/test/portfolio/public/case/lwt
OUT=/Users/admin/test/portfolio/public/deck
D=2.3; F=69; X=0.55
ffmpeg -v error -nostdin -y \
 -loop 1 -t $D -i "$B/mark-gradient.webp" \
 -loop 1 -t $D -i "$B/mark-colourways.webp" \
 -loop 1 -t $D -i "$B/building-sign.webp" \
 -loop 1 -t $D -i "$B/stage-screen.webp" \
 -loop 1 -t $D -i "$B/hoarding.webp" \
 -loop 1 -t $D -i "$B/product-display.webp" \
 -loop 1 -t $D -i "$B/mark-gradient.webp" \
 -filter_complex "
 [0:v]scale=1600:-2,crop=1280:800:'(in_w-1280)/2':'(in_h-800)/2',scale=1280:800,zoompan=z='1.08-0.08*on/$F':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x800:fps=30,setsar=1[c0];
 [1:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*t/$D':'(in_h-800)/2',setsar=1,fps=30[c1];
 [2:v]scale=1422:-2,crop=1280:800:'(in_w-1280)/2':0,scale=1280:800,zoompan=z='1+0.14*on/$F':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x800:fps=30,setsar=1[c2];
 [3:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*(1-t/$D)':'(in_h-800)/2',setsar=1,fps=30[c3];
 [4:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*t/$D':'(in_h-800)*(0.6-0.4*t/$D)',setsar=1,fps=30[c4];
 [5:v]scale=1600:-2,crop=1280:800:'(in_w-1280)*(0.5+0.5*t/$D)':'(in_h-800)/2',setsar=1,fps=30[c5];
 [6:v]scale=1600:-2,crop=1280:800:'(in_w-1280)/2':'(in_h-800)/2',scale=1280:800,zoompan=z='1.08':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x800:fps=30,setsar=1[c6];
 [c0][c1]xfade=transition=slideleft:duration=$X:offset=1.75[a];
 [a][c2]xfade=transition=fade:duration=$X:offset=3.5[b];
 [b][c3]xfade=transition=slideup:duration=$X:offset=5.25[c];
 [c][c4]xfade=transition=smoothright:duration=$X:offset=7.0[d];
 [d][c5]xfade=transition=fade:duration=$X:offset=8.75[e];
 [e][c6]xfade=transition=fade:duration=$X:offset=10.5[f];
 [f]trim=0:11.05,setpts=PTS-STARTPTS[v]" \
 -map "[v]" -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/lwt.mp4"
ffmpeg -v error -nostdin -y -i "$OUT/lwt.mp4" -frames:v 1 "$OUT/lwt.png" && cd /Users/admin/test/portfolio && node -e 'require("sharp")("public/deck/lwt.png").webp({quality:90}).toFile("public/deck/lwt.poster.webp").then(()=>{})' && rm "$OUT/lwt.png"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$OUT/lwt.mp4"; stat -f %z "$OUT/lwt.mp4"
