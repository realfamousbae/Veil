# Veil — rules for AI coding assistants

Guidance for Claude Code and other AI assistants working in this repository. Human
contributors: see [CONTRIBUTING.md](CONTRIBUTING.md); the same rules apply.

## Communication

- Reply in the language the user writes in. Code, comments, commit messages and file names
  are in English.
- Before a larger change, give a short plan and wait for confirmation.

## Privacy comes first

[PRIVACY.md](PRIVACY.md) is a contract: breaking any rule there is a bug. When a feature
conflicts with it, stop and ask instead of working around it. In particular:

- no requests to third-party hosts on load; assets and tiles come from the site's origin;
- no analytics, error collectors, cookies or web storage; local data goes to IndexedDB/OPFS;
- geolocation only from the "Where am I" button; the position never leaves the device;
- external service URLs come from the runtime `public/config.json`, never hard-coded;
- `tests/e2e/privacy.spec.ts` must keep passing; extend it when adding anything that talks
  to the network.

## Code rules

- Stack: Vite, Svelte 5 (runes), TypeScript strict, MapLibre GL JS, PMTiles.
- No literal colors, radii or shadows in components — only theme tokens (CSS custom
  properties from `src/themes/*`); stylelint enforces it. A new theme is one file in
  `src/themes/`. The glass material and shared UI parts are in `src/app/glass.css` and
  `src/app/ui.css`.
- UI strings go through `src/lib/i18n` (`ru` and `en` must have the same keys).
- Icons live in `public/assets/icons.svg`, styled with presentation attributes only (Safari
  ignores a sprite's internal styles).
- Add dependencies only when needed, with a one-line reason in the pull request. Never add
  dependencies that make network requests on their own (analytics, font or CDN loaders).
- Check the current API of `maplibre-gl`, `pmtiles`, `@protomaps/basemaps` and
  `vite-plugin-pwa` against their docs or type definitions, not from memory.
- Do not download planet-scale map files locally; cut regions with
  `scripts/build-regions.sh`, which reads only the needed byte ranges.

## Before you finish

`pnpm check && pnpm lint && pnpm test && pnpm test:e2e && pnpm budget` must pass.
Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
