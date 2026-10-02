# Tile sizes

Measured 2026-10-02 with `pmtiles extract --dry-run` (pmtiles CLI 1.31.2) against the
Protomaps planet build `20261002.pmtiles` (138.5 GB, basemap schema v4.15.2).
Reproduce with `scripts/build-regions.sh --dry-run [--maxzoom N] <id>`.

| Region                     | bbox                    | maxzoom | Tiles   | Size   |
| -------------------------- | ----------------------- | ------- | ------- | ------ |
| World (overview)           | whole planet            | 7       | 10 667  | 189 MB |
| Moscow (incl. New Moscow)  | 36.80,55.14,37.97,56.02 | 14      | 5 373   | 68 MB  |
| Moscow (incl. New Moscow)  | 36.80,55.14,37.97,56.02 | 15      | 20 784  | 138 MB |
| Saint Petersburg           | 29.42,59.63,30.76,60.25 | 14      | 4 334   | 42 MB  |
| Saint Petersburg           | 29.42,59.63,30.76,60.25 | 15      | 16 105  | 84 MB  |
| Moscow + Moscow Oblast     | 35.14,54.25,40.21,56.96 | 14      | 68 386  | 299 MB |
| Moscow + Moscow Oblast     | 35.14,54.25,40.21,56.96 | 15      | 267 909 | 572 MB |
| Moscow center (dev sample) | 37.55,55.72,37.70,55.78 | 15      | —       | 12 MB  |

Notes:

- Sizes are for a rectangular bbox. The oblast bbox is noticeably larger than the oblast
  itself; cutting by its polygon (`pmtiles extract --region <geojson>`) should shrink it.
- z15 roughly doubles the size versus z14. Protomaps tiles max out at z15; MapLibre
  overzooms beyond that, so z15 is enough for street-level detail.

## Demo set

The public demo covers the whole world at overview zooms and Moscow with Moscow Oblast in detail.

| File                          | Size        |
| ----------------------------- | ----------- |
| `world.pmtiles` (z0–7)        | 189 MB      |
| `moscow-oblast.pmtiles` (z15) | 572 MB      |
| **Total**                     | **~761 MB** |

Fits comfortably in Cloudflare R2's free storage tier. As an offline download for a phone, 572 MB is large;
the "Offline maps" screen may later offer Moscow alone (138 MB) as a lighter option.

## Web bundle (first prototype)

| Chunk           | gzip   |
| --------------- | ------ |
| main JS         | 300 KB |
| MapLibre worker | 145 KB |
| CSS             | 11 KB  |

The worker currently duplicates MapLibre's shared chunk; worth revisiting when the bundle
budget is added to CI.
