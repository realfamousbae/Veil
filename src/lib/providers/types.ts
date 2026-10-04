export interface LngLat {
  lng: number;
  lat: number;
}

/** Stable id for a place without an OpenStreetMap object: its coordinates to ~1 m. */
export function pointId(point: LngLat): string {
  return `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
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

export interface GeocodeProvider {
  search(
    query: string,
    opts: { lang: string; bias?: LngLat; signal: AbortSignal },
  ): Promise<Place[]>;
  reverse(point: LngLat, opts: { lang: string; signal: AbortSignal }): Promise<Place | null>;
}

export type RouteMode = 'walk' | 'car' | 'transit';

/** What a leg moves by. Transit kinds follow GTFS route types; `rail` covers МЦД and trains. */
export type LegMode = 'walk' | 'car' | 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'other';

export interface RouteStep {
  /** Turn to make at the start of the step, e.g. "LEFT"; see the router's API. */
  direction: string;
  street: string;
  /** Meters. */
  distance: number;
}

export interface RouteLeg {
  mode: LegMode;
  /** [lng, lat] pairs. */
  geometry: [number, number][];
  from: { name: string; point: LngLat };
  to: { name: string; point: LngLat };
  start: Date;
  end: Date;
  /** Meters; set for walking and driving legs. */
  distance?: number;
  /** Transit line, for transit legs. Colors are "#rrggbb" from the timetable data. */
  line?: { name: string; color?: string; textColor?: string; headsign?: string };
  /** Times are estimated from intervals, not taken from a timetable. */
  approximate: boolean;
  steps: RouteStep[];
}

export interface Itinerary {
  /** Seconds. */
  duration: number;
  start: Date;
  end: Date;
  transfers: number;
  legs: RouteLeg[];
}

export interface RouteRequest {
  from: LngLat;
  to: LngLat;
  mode: RouteMode;
  /** Departure time (arrival time with `arriveBy`); now when omitted. */
  time?: Date;
  arriveBy?: boolean;
  lang: string;
  signal: AbortSignal;
}

/** Computes routes on a router server. It learns both points, so it is called only on an
 * explicit "Build route" (PRIVACY.md §10). */
export interface RoutingProvider {
  route(request: RouteRequest): Promise<Itinerary[]>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SyncProvider {
  // Reserved for the optional self-hosted server. Not implemented in MVP.
}
