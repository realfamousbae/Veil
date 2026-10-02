# Veil

A private map of the world for phones and desktops. No accounts, no cookies, no analytics.

- **Map** of the whole planet from [OpenStreetMap](https://www.openstreetmap.org/) data, rendered with [MapLibre GL JS](https://maplibre.org/) from [Protomaps](https://protomaps.com/) vector tiles.
- **Search** for places and addresses ([Photon](https://github.com/komoot/photon)); "What's here?" on long-press or right-click.
- **Where am I** — only when you tap the button; your position never leaves the device.
- **Saved places** on the device, with GeoJSON export/import as a backup instead of an account.
- **Offline maps** — download a region and use the map in airplane mode; installs as an app (PWA) on Android and iOS.
- **Themes** — light, dark and paper; a new theme is one file in `src/themes/`.
- Russian and English.

## Privacy

Veil is a static site with no backend of its own. What it does and does not do is enforced by tests
(`tests/e2e/privacy.spec.ts` runs in CI):

- No third-party requests on load. Fonts, map glyphs, icons and tiles come from the site's own origin.
- No cookies, `localStorage` or analytics. Settings, saved places and regions live in IndexedDB/OPFS on the device.
- Geolocation is requested only from the "Where am I" button and is never sent anywhere — not to the geocoder, not into the URL.
- Search queries go out after ≥3 characters and a 300 ms pause (or only on Enter, if you prefer); location bias is the map center rounded to ~10 km and can be turned off.
- Strict headers: CSP with `default-src 'self'` and `connect-src` limited to the hosts in `config.json`, `Referrer-Policy: no-referrer`.

Honest limits: the site's host sees your IP and which map areas you load (downloaded regions avoid that);
the search service sees your IP and queries. Self-hosting everything removes third parties completely.
The in-app **Privacy** page explains this for each deployment.

## Development

Requirements: Node 22+, pnpm 10, [`pmtiles`](https://github.com/protomaps/go-pmtiles) CLI (`brew install pmtiles`).

```bash
pnpm install
# Small map samples for development (≈27 MB, read over HTTP from the latest planet build):
scripts/build-regions.sh --out public/dev --maxzoom 5 world
scripts/build-regions.sh --out public/dev moscow-center
pnpm dev
```

| Command         | What it does                                                                |
| --------------- | --------------------------------------------------------------------------- |
| `pnpm dev`      | Dev server                                                                  |
| `pnpm build`    | Production build into `dist/` (+ `_headers` from `config.json`)             |
| `pnpm check`    | Type checks (app, Node scripts, Pages Function)                             |
| `pnpm lint`     | ESLint, stylelint (no literal colors/radii/shadows in components), Prettier |
| `pnpm test`     | Unit tests (Vitest)                                                         |
| `pnpm test:e2e` | End-to-end tests (Playwright), including the privacy test                   |
| `pnpm budget`   | Bundle size budget                                                          |

Project rules for contributors and Claude Code are in [`CLAUDE.md`](CLAUDE.md); the full plan is in [`PLAN.md`](PLAN.md).

### Configuration

`public/config.json` is read at runtime, so a deployment can change it without rebuilding:

```jsonc
{
  "tiles": { "world": "/tiles/world.pmtiles", "worldMaxZoom": 7 }, // low-zoom planet overview
  "regions": "/tiles/index.json", // catalog of detailed regions
  "geocoder": { "type": "photon", "url": "https://photon.komoot.io", "langs": ["en", "de", "fr"] },
  "server": null, // reserved for a self-hosted server
}
```

Regions are cut with `scripts/build-regions.sh` (definitions in `scripts/regions.tsv`); sizes are in [`docs/tile-sizes.md`](docs/tile-sizes.md).

## Deploy (Cloudflare Pages + R2)

The demo runs on Cloudflare's free tier with no custom domain: the site on Pages, map archives in R2,
served on the same origin by a Pages Function (`functions/tiles/[[path]].ts`).

One-time setup in the Cloudflare dashboard:

1. **R2** → enable R2 for the account (Cloudflare may ask for a payment method even for the free tier).
2. **R2 → Manage API tokens → Create API token** with _Object Read & Write_. Note the _Access Key ID_ and _Secret Access Key_.
3. **My Profile → API Tokens → Create Token → Custom token** with _Account → Cloudflare Pages → Edit_ and _Account → Workers R2 Storage → Edit_.
4. Copy your **Account ID** (right sidebar of the account home page).

Then in GitHub → **Settings → Secrets and variables → Actions** add:

| Secret                  | Value                         |
| ----------------------- | ----------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID                    |
| `CLOUDFLARE_API_TOKEN`  | the custom token (step 3)     |
| `R2_ACCESS_KEY_ID`      | R2 Access Key ID (step 2)     |
| `R2_SECRET_ACCESS_KEY`  | R2 Secret Access Key (step 2) |

Run **Actions → Map tiles → Run workflow** once (it also runs monthly for fresh data). Every push to
`main` that passes CI then deploys the site (**Actions → Deploy**). Keep Cloudflare Web Analytics off for the project.

## Self-hosting

Any static web server that supports HTTP Range requests works: serve `dist/` plus the `.pmtiles`
files, and point `config.json` at them. For search without third parties, run your own
[Photon](https://github.com/komoot/photon) and set `geocoder.url` (add `"ru"` to `langs` if your instance has Russian).

## License

Code: [MIT](LICENSE). Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
Basemap style: [Protomaps basemaps](https://github.com/protomaps/basemaps) (BSD-3-Clause); fonts: Noto Sans (SIL OFL, `public/assets/fonts/OFL.txt`).
