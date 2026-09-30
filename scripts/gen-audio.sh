#!/usr/bin/env bash
# Sinh audio tiếng Việt offline bằng giọng Linh của macOS.
# Nguồn: scripts/audio-manifest.txt (câu chung) + scripts/audio/*.txt (câu riêng từng phòng + _words.gen.txt tự sinh).
# Dùng: bash scripts/gen-audio.sh           (chỉ sinh clip CHƯA có)
#       FORCE=1 bash scripts/gen-audio.sh   (sinh lại tất cả)
#       ONLY=rapunzel bash scripts/gen-audio.sh  (chỉ file scripts/audio/rapunzel.txt; vẫn sinh lại _words.gen.txt)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/audio
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
VOICE=${VOICE:-Linh}
RATE=${RATE:-150}
FORCE=${FORCE:-0}
mkdir -p "$OUT"

node scripts/word-audio.mjs

if [[ -n "${ONLY:-}" ]]; then
  SOURCES=(scripts/audio/"$ONLY".txt scripts/audio/_words.gen.txt)
else
  SOURCES=(scripts/audio-manifest.txt scripts/audio/*.txt)
fi

# gộp nguồn, bỏ comment/dòng trống, key trùng giữ bản đầu (báo nếu khác chữ) – awk chạy được với bash 3.2 của macOS
awk -F'|' '
  /^[[:space:]]*#/ || NF < 2 { next }
  { k = $1; sub(/[[:space:]]+$/, "", k); t = substr($0, index($0, "|") + 1)
    if (k in seen) { if (seen[k] != t) printf("! trùng key %s (%s): giữ bản đầu\n", k, FILENAME) > "/dev/stderr"; next }
    seen[k] = t; print k "|" t }
' "${SOURCES[@]}" > "$TMP/all.txt"

n=0; skip=0
while IFS='|' read -r key text; do
  if [[ "$FORCE" != "1" && -s "$OUT/$key.m4a" ]]; then skip=$((skip+1)); continue; fi
  say -v "$VOICE" -r "$RATE" -o "$TMP/$key.aiff" "$text"
  afconvert -f m4af -d aac -b 64000 "$TMP/$key.aiff" "$OUT/$key.m4a"
  n=$((n+1))
done < "$TMP/all.txt"
echo "generated $n clips, skipped $skip existing -> $OUT"
