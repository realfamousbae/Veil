#!/usr/bin/env bash
# Downloads map glyphs and sprites from protomaps/basemaps-assets into
# public/assets/ so the map never requests them from a third-party origin
# (PLAN.md §5.1). Run once and commit the result; re-run only to upgrade.
set -euo pipefail

# Pinned commit of https://github.com/protomaps/basemaps-assets
REV="${1:-028c18f713baecad011301ff7a69acc39bcc2ae7}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/assets"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "https://codeload.github.com/protomaps/basemaps-assets/tar.gz/$REV" |
  tar -xz -C "$TMP" --strip-components=1

rm -rf "$DEST/fonts" "$DEST/sprites"
mkdir -p "$DEST/sprites"
cp -R "$TMP/fonts" "$DEST/fonts"
cp -R "$TMP/sprites/v4" "$DEST/sprites/v4"
echo "$REV" > "$DEST/BASEMAPS_ASSETS_REV"

du -sh "$DEST/fonts" "$DEST/sprites"
