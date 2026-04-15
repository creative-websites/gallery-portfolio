#!/usr/bin/env bash
# Renames image files in public/ into public/images/01.jpg, 02.jpg, ...
# Re-running continues from the last numbered file (won't rename already-numbered ones).

PUBLIC="$(dirname "$0")/public"
DEST="$PUBLIC/images"
mkdir -p "$DEST"

# Find the highest number already used
last=0
for f in "$DEST"/[0-9][0-9].jpg; do
  [ -f "$f" ] || continue
  n=$(basename "$f" .jpg)
  n=$((10#$n))  # strip leading zero
  [ $n -gt $last ] && last=$n
done

next=$((last + 1))

# Collect un-numbered images from public/ (any .jpg/.jpeg/.png/.webp not matching NN.ext)
shopt -s nullglob
candidates=()
for f in "$PUBLIC"/*.jpg "$PUBLIC"/*.jpeg "$PUBLIC"/*.png "$PUBLIC"/*.webp; do
  base=$(basename "$f")
  # Skip if already looks like 01.jpg .. 99.jpg
  [[ "$base" =~ ^[0-9]{2}\.(jpg|jpeg|png|webp)$ ]] && continue
  candidates+=("$f")
done

if [ ${#candidates[@]} -eq 0 ]; then
  echo "No un-numbered images found in public/ — nothing to rename."
  exit 0
fi

for f in "${candidates[@]}"; do
  ext="${f##*.}"
  dest=$(printf "%s/%02d.jpg" "$DEST" "$next")
  echo "  $f  →  $dest"
  cp "$f" "$dest"
  next=$((next + 1))
done

echo "Done. $((next - last - 1)) image(s) added. Total in public/images: $((next - 1))."
