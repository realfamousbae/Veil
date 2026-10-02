import type { Map } from 'maplibre-gl';
import { getHashParam, setHashParam } from '../url-hash';

const PARAM = 'map';

export interface Camera {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Parses `zoom/lat/lng[/bearing[/pitch]]`. */
export function parseCamera(value: string | null): Camera | null {
  if (!value) return null;
  const [zoom, lat, lng, bearing = 0, pitch = 0] = value.split('/').map(Number);
  if ([zoom, lat, lng, bearing, pitch].some((n) => n === undefined || !Number.isFinite(n)))
    return null;
  if (Math.abs(lat as number) > 90 || Math.abs(lng as number) > 180) return null;
  return { center: [lng as number, lat as number], zoom: zoom as number, bearing, pitch };
}

/** Formats the camera with just enough precision for its zoom (same scheme as MapLibre). */
export function formatCamera(c: Camera): string {
  const zoom = Math.round(c.zoom * 100) / 100;
  const precision = Math.max(
    0,
    Math.ceil((zoom * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10),
  );
  const m = 10 ** precision;
  const lng = Math.round(c.center[0] * m) / m;
  const lat = Math.round(c.center[1] * m) / m;
  let s = `${zoom}/${lat}/${lng}`;
  if (c.bearing || c.pitch) s += `/${Math.round(c.bearing * 10) / 10}`;
  if (c.pitch) s += `/${Math.round(c.pitch)}`;
  return s;
}

export function readCameraFromHash(hash = location.hash): Camera | null {
  return parseCamera(getHashParam(PARAM, hash));
}

/**
 * Keeps `#map=` in sync with the camera. While `paused()` is true (the camera shows the
 * user's own position) the fragment is left alone, so it never carries their location
 * (PLAN.md §5.4). Returns a function that stops syncing.
 */
export function syncCameraHash(map: Map, paused: () => boolean): () => void {
  const write = () => {
    if (paused()) return;
    const c = map.getCenter();
    setHashParam(
      PARAM,
      formatCamera({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      }),
    );
  };
  const read = () => {
    const camera = readCameraFromHash();
    if (camera) map.jumpTo(camera);
  };
  map.on('moveend', write);
  window.addEventListener('hashchange', read);
  return () => {
    map.off('moveend', write);
    window.removeEventListener('hashchange', read);
  };
}
