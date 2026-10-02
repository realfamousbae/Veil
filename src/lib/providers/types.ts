import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';

export interface LngLat {
  lng: number;
  lat: number;
}

export type OsmType = 'node' | 'way' | 'relation';

export interface Place {
  id: string;
  /** Display name; empty for an unnamed point (the UI shows a generic label). */
  name: string;
  point: LngLat;
  /** Human-readable address or locality, if known. */
  description?: string;
  /** Source OpenStreetMap object, if any (used for the "Fix in OpenStreetMap" link). */
  osm?: { type: OsmType; id: number };
  /** Bounding box [minLng, minLat, maxLng, maxLat] for areas such as cities. */
  extent?: [number, number, number, number];
}

export interface TileProvider {
  /** Returns a MapLibre source definition for the base map. */
  source(): Promise<VectorSourceSpecification>;
}

export interface GeocodeProvider {
  search(
    query: string,
    opts: { lang: string; bias?: LngLat; signal: AbortSignal },
  ): Promise<Place[]>;
  reverse(point: LngLat, opts: { lang: string; signal: AbortSignal }): Promise<Place | null>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SyncProvider {
  // Reserved for the optional self-hosted server. Not implemented in MVP.
}
