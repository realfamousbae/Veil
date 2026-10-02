// Bundle budget: fails when the app grows past these gzip sizes.
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = {
  main: 350, // app + MapLibre + basemaps
  'maplibre-gl-worker': 160,
  other: 20, // each remaining chunk (download worker, workbox-window, ...)
};
const PRECACHE_BUDGET_KB = 3500;

const dir = new URL('../dist/', import.meta.url);
const assets = await readdir(new URL('assets/', dir));
let failed = false;
for (const file of assets.filter((f) => f.endsWith('.js'))) {
  const kb = gzipSync(await readFile(new URL(`assets/${file}`, dir))).length / 1024;
  const kind = file.startsWith('index-')
    ? 'main'
    : file.startsWith('maplibre-gl-worker')
      ? 'maplibre-gl-worker'
      : 'other';
  const ok = kb <= BUDGET_KB[kind];
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'OVER'} ${file.padEnd(40)} ${kb.toFixed(0).padStart(4)} KB gzip (budget ${BUDGET_KB[kind]})`,
  );
}

const sw = await readFile(new URL('sw.js', dir), 'utf8');
let precache = 0;
for (const [, url] of sw.matchAll(/\{url:"([^"]+)"/g)) {
  precache += (await readFile(new URL(decodeURI(url), dir))).length;
}
const precacheKb = precache / 1024;
const ok = precacheKb <= PRECACHE_BUDGET_KB;
failed ||= !ok;
console.log(
  `${ok ? 'ok  ' : 'OVER'} service worker precache ${precacheKb.toFixed(0)} KB (budget ${PRECACHE_BUDGET_KB})`,
);
if (failed) process.exit(1);
