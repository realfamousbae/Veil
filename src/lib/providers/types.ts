import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Place {
  id: string;
  name: string;
  point: LngLat;
  /** Human-readable address or locality, if known. */
  description?: string;
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
