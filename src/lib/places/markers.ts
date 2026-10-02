import { Marker, type Map } from 'maplibre-gl';
import type { SavedPlace } from './types';

/** Star markers for saved places; clicking one selects it. Styled in global.css. */
export class SavedPlaceMarkers {
  #markers = new globalThis.Map<string, Marker>();

  constructor(
    private readonly map: Map,
    private readonly iconHref: string,
    private readonly onselect: (place: SavedPlace) => void,
  ) {}

  /** Shows `places`, except `hiddenId` (the selected place already has its own pin). */
  update(places: SavedPlace[], hiddenId: string | null, label: (p: SavedPlace) => string): void {
    const wanted = new Set(places.filter((p) => p.id !== hiddenId).map((p) => p.id));
    for (const [id, marker] of this.#markers) {
      if (!wanted.has(id)) {
        marker.remove();
        this.#markers.delete(id);
      }
    }
    for (const place of places) {
      if (!wanted.has(place.id)) continue;
      let marker = this.#markers.get(place.id);
      if (!marker) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'saved-marker';
        el.innerHTML = `<svg aria-hidden="true"><use href="${this.iconHref}"/></svg>`;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onselect(place);
        });
        marker = new Marker({ element: el }).setLngLat(place.point).addTo(this.map);
        this.#markers.set(place.id, marker);
      }
      marker.getElement().setAttribute('aria-label', label(place));
    }
  }

  remove(): void {
    for (const marker of this.#markers.values()) marker.remove();
    this.#markers.clear();
  }
}
