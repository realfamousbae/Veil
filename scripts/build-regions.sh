#!/usr/bin/env bash
# Cuts regions out of a Protomaps planet build with `pmtiles extract`, reading
# only the needed byte ranges over HTTP (the planet is never downloaded).
#
# Usage:
#   scripts/build-regions.sh [--dry-run] [--build YYYYMMDD] [--out DIR] [--maxzoom N] ID...
#
# Region definitions live in scripts/regions.tsv. Writes DIR/<id>.pmtiles and
# DIR/index.json (catalog for the "Offline maps" screen). The whole-planet
# overview (bbox "-") is written but not listed: it is the base layer, not a region.
# Requires: pmtiles CLI (brew install pmtiles), node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGIONS="$ROOT/scripts/regions.tsv"
OUT="$ROOT/dist-regions"
BUILD=""
DRY_RUN=0
MAXZOOM_OVERRIDE=""
IDS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --build) BUILD="$2"; shift ;;
    --out) OUT="$2"; shift ;;
    --maxzoom) MAXZOOM_OVERRIDE="$2"; shift ;;
    -h | --help) sed -n '2,11p' "$0"; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) IDS+=("$1") ;;
  esac
  shift
done

if [[ ${#IDS[@]} -eq 0 ]]; then
  echo "No region ids given. Known ids:" >&2
  grep -v '^#' "$REGIONS" | cut -f1 >&2
  exit 2
fi

if [[ -z "$BUILD" ]]; then
  BUILD="$(curl -fsSL https://build-metadata.protomaps.dev/builds.json |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s);console.log(b[b.length-1].key.replace(".pmtiles",""))})')"
fi
SRC="https://build.protomaps.com/$BUILD.pmtiles"
echo "Source: $SRC"

mkdir -p "$OUT"
INDEX="$OUT/index.json"
[[ -f "$INDEX" ]] || echo '[]' > "$INDEX"

for id in "${IDS[@]}"; do
  line="$(awk -F'\t' -v id="$id" '$1 == id' "$REGIONS")"
  if [[ -z "$line" ]]; then
    echo "Unknown region: $id" >&2
    exit 2
  fi
  IFS=$'\t' read -r _ name_en name_ru bbox maxzoom <<< "$line"
  maxzoom="${MAXZOOM_OVERRIDE:-$maxzoom}"

  args=(--maxzoom="$maxzoom")
  [[ "$bbox" == "-" ]] || args+=(--bbox="$bbox")

  echo "== $id (maxzoom $maxzoom)"
  if [[ $DRY_RUN -eq 1 ]]; then
    pmtiles extract "$SRC" /dev/null --dry-run "${args[@]}" 2>&1 | grep 'archive size'
    continue
  fi

  file="$OUT/$id.pmtiles"
  pmtiles extract "$SRC" "$file" "${args[@]}"
  size="$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")"

  # The planet overview is the base layer (config.json → tiles.world), not a region.
  [[ "$bbox" == "-" ]] && continue

  ID="$id" NAME_EN="$name_en" NAME_RU="$name_ru" BBOX="$bbox" MAXZOOM="$maxzoom" \
    SIZE="$size" BUILD="$BUILD" INDEX="$INDEX" node -e '
      const fs = require("node:fs");
      const e = process.env;
      const index = JSON.parse(fs.readFileSync(e.INDEX, "utf8")).filter((r) => r.id !== e.ID);
      index.push({
        id: e.ID,
        name: { en: e.NAME_EN, ru: e.NAME_RU },
        bbox: e.BBOX === "-" ? [-180, -85.0511, 180, 85.0511] : e.BBOX.split(",").map(Number),
        maxzoom: Number(e.MAXZOOM),
        size: Number(e.SIZE),
        build: e.BUILD,
        file: `${e.ID}.pmtiles`,
      });
      index.sort((a, b) => a.id.localeCompare(b.id));
      fs.writeFileSync(e.INDEX, JSON.stringify(index, null, 2) + "\n");
    '
done
