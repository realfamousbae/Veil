import { setWorkerUrl } from 'maplibre-gl';
// MapLibre 6 resolves its worker relative to its own module URL, which breaks once
// Vite bundles the library. Let Vite bundle the worker (with its shared chunk) and
// hand MapLibre the resulting same-origin URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let done = false;

/** One-time, page-wide MapLibre setup. Call before creating the first map. */
export function setupMapLibre(): void {
  if (done) return;
  setWorkerUrl(workerUrl);
  done = true;
}
