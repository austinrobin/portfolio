#!/bin/bash
# Warm the CDN edge for every media file after a deploy.
#   scripts/warm-cdn.sh                  → warms jsDelivr for the current HEAD commit (what the live site serves)
#   scripts/warm-cdn.sh <base-url>       → warms any base, e.g. https://portfolio-brown-five-85.vercel.app
# jsDelivr caches per commit URL, so every deploy starts cold in each region; the first fetch of a file
# fills the edge near whoever runs this. Files over 20MB are skipped (jsDelivr refuses them).
cd "$(dirname "$0")/.." || exit 1
if [ -n "$1" ]; then U="$1"; else U="https://cdn.jsdelivr.net/gh/austinrobin/portfolio@$(git rev-parse HEAD)/public"; fi
list=$(mktemp)
{ find public/case public/deck public/footer public/gallery -type f ! -name .DS_Store -size -20000000c; for f in hero-art.webp hero-face.webp current-coin.webp; do echo public/$f; done; } | sed 's|^public||' > "$list"
n=$(wc -l < "$list" | tr -d ' '); echo "warming $n files on $U"
xargs -P 12 -I{} sh -c 'curl -s -o /dev/null "'"$U"'{}"; printf "."' < "$list"; echo
echo "second pass — cache status of 20 samples:"; for f in $(sort -R "$list" 2>/dev/null | head -20 || head -20 "$list"); do h=$(curl -s -o /dev/null -D - "$U$f" | grep -i "x-cache\|x-vercel-cache" | tr -d '\r' | head -1); printf "  %-58s %s\n" "$f" "$h"; done; rm -f "$list"
