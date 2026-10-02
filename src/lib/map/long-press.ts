import type { Map, MapMouseEvent, MapTouchEvent } from 'maplibre-gl';
import type { LngLat } from '../providers/types';

const HOLD_MS = 500;
const MOVE_TOLERANCE_PX = 10;

/**
 * Calls `onpress` on a right-click or a touch long-press on the map.
 * Returns a function that removes the listeners.
 */
export function onLongPress(map: Map, onpress: (point: LngLat) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let start: { x: number; y: number } | undefined;
  let lastTouchPress = 0;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const touchstart = (e: MapTouchEvent) => {
    cancel();
    if (e.points.length !== 1) return;
    start = { x: e.point.x, y: e.point.y };
    const { lng, lat } = e.lngLat;
    timer = setTimeout(() => {
      lastTouchPress = Date.now();
      onpress({ lng, lat });
    }, HOLD_MS);
  };

  const touchmove = (e: MapTouchEvent) => {
    if (!start || e.points.length !== 1) return cancel();
    if (Math.hypot(e.point.x - start.x, e.point.y - start.y) > MOVE_TOLERANCE_PX) cancel();
  };

  const contextmenu = (e: MapMouseEvent) => {
    e.preventDefault();
    // Android also fires contextmenu after a long-press we already handled.
    if (Date.now() - lastTouchPress < 1000) return;
    onpress({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  map.on('touchstart', touchstart);
  map.on('touchmove', touchmove);
  map.on('touchend', cancel);
  map.on('touchcancel', cancel);
  map.on('contextmenu', contextmenu);
  return () => {
    cancel();
    map.off('touchstart', touchstart);
    map.off('touchmove', touchmove);
    map.off('touchend', cancel);
    map.off('touchcancel', cancel);
    map.off('contextmenu', contextmenu);
  };
}
