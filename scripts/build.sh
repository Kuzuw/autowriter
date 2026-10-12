#!/usr/bin/env bash
# Chrome Web Store'a yüklenebilir zip paketi üretir: dist/autowriter-<sürüm>.zip
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/autowriter-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"
zip -qr "$OUT" \
  manifest.json engine.js content.js background.js \
  popup.html popup.css popup.js \
  icons fonts LICENSE

echo "Paket hazır: $OUT ($(du -h "$OUT" | cut -f1))"
