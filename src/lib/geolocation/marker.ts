import { Marker, type Map } from 'maplibre-gl';
import type { Fix } from './locator.svelte';

const EARTH_CIRCUMFERENCE = 40_075_016.686;
const MAX_DIAMETER_PX = 4000;

/** Meters per CSS pixel at a latitude and zoom (512px tiles). */
export function metersPerPixel(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
}

/**
 * The user's position: a dot and an accuracy circle. DOM markers survive style swaps
 * (theme changes), unlike style layers. Styled in global.css with theme tokens.
 */
export class UserLocationMarker {
  #dot: Marker;
  #accuracy: Marker;
  #fix: Fix | null = null;
  #resize = () => this.#size();

  constructor(
    private readonly map: Map,
    label: string,
  ) {
    const dot = document.createElement('div');
    dot.className = 'user-dot';
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', label);
    const accuracy = document.createElement('div');
    accuracy.className = 'user-accuracy';
    this.#accuracy = new Marker({ element: accuracy });
    this.#dot = new Marker({ element: dot });
    map.on('zoom', this.#resize);
  }

  update(fix: Fix | null): void {
    this.#fix = fix;
    if (!fix) {
      this.#accuracy.remove();
      this.#dot.remove();
      return;
    }
    this.#accuracy.setLngLat(fix).addTo(this.map);
    this.#dot.setLngLat(fix).addTo(this.map);
    this.#size();
  }

  #size(): void {
    if (!this.#fix) return;
    const d = Math.min(
      MAX_DIAMETER_PX,
      (2 * this.#fix.accuracy) / metersPerPixel(this.#fix.lat, this.map.getZoom()),
    );
    const el = this.#accuracy.getElement();
    el.style.width = el.style.height = `${Math.round(d)}px`;
  }

  remove(): void {
    this.map.off('zoom', this.#resize);
    this.update(null);
  }
}
