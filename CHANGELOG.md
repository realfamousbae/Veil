# Changelog

All notable changes to Veil are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). Versions before 1.0.0 are betas.

## [Unreleased]

### Added

- Directions on foot, by public transport and by car through a configurable MOTIS router
  (`routing` in `config.json`; `null` hides directions). A route is sent only on "Build
  route", with points rounded to ~10 m; a link to a route opens without any request; a
  route from "My location" keeps the position out of the address and away from search.
  Transit legs whose times are estimated from intervals are marked as approximate.

### Changed

- On wide screens the map frames places and the user's position clear of the side panel.
- Escape leaves any focused text field, not only the search bar.

## [0.1.0] - 2026-10-03

The first public beta.

### Added

- Vector base map from self-hosted PMTiles archives: a low-zoom world overview plus detailed
  regions, with glyphs and sprites served from the site's own origin.
- Demo regions: Moscow and Moscow Oblast, Vladimir and Vladimir Oblast, Saint Petersburg and
  the other Russian cities with over a million people.
- Search through a configurable Photon geocoder with a place card, "What's here?" by long
  press or right click, and shareable place links that open without any geocoder request.
- Pressing Enter or typing a new query over an open place card shows the new results.
- "Where am I" with follow mode; the position never leaves the device.
- Saved places in IndexedDB with GeoJSON export and import, shown on the map.
- Installable PWA; regions can be downloaded for offline use (stored in OPFS).
- Light and dark themes, Russian and English interface, Liquid Glass design.
- Privacy page, strict production headers, and an e2e privacy test that fails on any
  unexpected network request or storage.
- App version in the settings dialog.

### Fixed

- A new version of the app now replaces the old one right after a deploy: the service
  worker takes over at once, and unhashed files such as the icon sprite are refreshed.
- Closing a place card never steps back twice in history, and a card opened right after
  closing another one stays open.

[Unreleased]: https://github.com/realfamousbae/Veil/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/realfamousbae/Veil/releases/tag/v0.1.0
