# Veil — rules for Claude Code

Full plan: `PLAN.md`. Talk to the author in Russian; code, comments, commits and file names are in English.

## Workflow

- Before each stage: a short plan; implement only after the author confirms.
- Each stage is a separate branch and PR, ending in a working state.
- Commits follow Conventional Commits, in English.
- Check the current API of external libraries (`maplibre-gl`, `pmtiles`, `@protomaps/basemaps`, `vite-plugin-pwa`) against docs or the published type definitions, not from memory.
- Dev machine is a MacBook Air M2 / 8 GB: never download planet files locally, never run heavy containers (Photon, Valhalla, planet builds).

## Dependencies

- Add a dependency only when needed; give a one-line "why" for each new one in the PR.
- Forbidden: dependencies that make network requests on their own (analytics, font loaders, CDN loaders).

## Privacy (PLAN.md §5) — violations are bugs

Privacy beats implementation convenience. On any conflict: stop and ask.

1. Zero third-party requests on load. Fonts, map glyphs, sprites, icons are served from our own origin only. No CDNs, no Google Fonts, no external scripts.
2. No analytics or error collectors (Sentry, Plausible, GA, etc.), not even "anonymous" ones.
3. No cookies. Local storage is IndexedDB / OPFS only, on device only.
4. Geolocation:
   - `getCurrentPosition` only from the "Where am I" button click handler;
   - `watchPosition` only while follow mode is on; stop it when leaving the mode or when the tab is hidden;
   - on startup, call neither the Geolocation API nor `navigator.permissions.query({name: 'geolocation'})`;
   - user coordinates are never sent anywhere: not to the geocoder, not into the URL.
5. Search:
   - query goes to the geocoder only after ≥3 chars and a 300 ms debounce;
   - setting "search on Enter only";
   - location bias uses the map center rounded to 1 decimal (~10 km) and can be disabled;
   - search history is off by default; if on, stored locally only.
6. Map state lives in the URL hash (`#map=12/55.75/37.62`).
7. Security headers in `public/_headers` (CSP, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `nosniff`); `connect-src` is generated from `config.json`.
8. Playwright privacy test (all requests go to allow-listed hosts, cookies empty) is mandatory in CI.
9. A short, honest "Privacy" page in the UI.

## Code rules

- All external services sit behind provider interfaces; URLs come from runtime `public/config.json`, not from the build.
- If `config.server === null`, account/sync UI is not rendered at all.
- No literal colors, radii or shadows in components — theme tokens (CSS custom properties) only. Enforced by stylelint.
- "© OpenStreetMap" attribution is always visible on the map.
