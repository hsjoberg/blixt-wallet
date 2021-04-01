#!/bin/bash

mkdir webp 2>/dev/null

for f in *.{png,jpg}
do
  echo ""
  title=$(echo $f | sed 's/\.[^.]*$//')
  echo "Processing $f..."
  cwebp "$f" -q 30 -resize 225 225 -o webp/"$(echo $f | cut -f 1 -d ".").webp"
  echo ""
done
