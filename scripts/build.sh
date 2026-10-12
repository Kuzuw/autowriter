#!/usr/bin/env bash
# Builds a Chrome Web Store-ready package: dist/autowriter-<version>.zip
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/autowriter-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"
zip -qr "$OUT" \
  manifest.json engine.js content.js background.js \
  popup.html popup.css popup.js \
  _locales icons fonts LICENSE

echo "Package ready: $OUT ($(du -h "$OUT" | cut -f1))"
