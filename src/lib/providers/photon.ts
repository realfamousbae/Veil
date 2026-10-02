import type { GeocodeProvider, LngLat, OsmType, Place } from './types';

/** Languages of the public photon.komoot.io instance besides "default" (local names). */
export const PUBLIC_PHOTON_LANGS = ['en', 'de', 'fr'];

const RESULT_LIMIT = 10;

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  osm_type?: 'N' | 'W' | 'R';
  osm_id?: number;
  /** [west, north, east, south] */
  extent?: [number, number, number, number];
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

const OSM_TYPES: Record<string, OsmType> = { N: 'node', W: 'way', R: 'relation' };

/**
 * Location bias is the map center rounded to 0.1° (~10 km), so the geocoder never
 * learns where exactly the user is looking (PLAN.md §5.5).
 */
export function roundBias(point: LngLat): LngLat {
  const r = (v: number) => Math.round(v * 10) / 10;
  return { lng: r(point.lng), lat: r(point.lat) };
}

function join(...parts: (string | undefined)[]): string | undefined {
  const s = parts.filter(Boolean).join(' ');
  return s || undefined;
}

export function toPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const streetLine = join(p.street, p.housenumber);
  const name = p.name ?? streetLine ?? p.city ?? p.state ?? p.country ?? '';

  const lines = [
    p.name ? streetLine : undefined,
    p.district ?? p.locality,
    p.city,
    p.state,
    p.country,
  ];
  const seen = new Set([name]);
  const description = lines
    .filter((l): l is string => !!l && !seen.has(l) && !!seen.add(l))
    .join(', ');

  const type = p.osm_type && OSM_TYPES[p.osm_type];
  const place: Place = {
    id: type && p.osm_id !== undefined ? `${p.osm_type}${p.osm_id}` : `${lat},${lng}`,
    name,
    point: { lng, lat },
  };
  if (description) place.description = description;
  if (type && p.osm_id !== undefined) place.osm = { type, id: p.osm_id };
  if (p.extent) {
    const [w, n, e, s] = p.extent;
    place.extent = [w, s, e, n];
  }
  return place;
}

/** Geocoder backed by Photon (https://github.com/komoot/photon). */
export class PhotonGeocodeProvider implements GeocodeProvider {
  private readonly base: string;

  constructor(
    url: string,
    private readonly langs: string[] = PUBLIC_PHOTON_LANGS,
  ) {
    this.base = url.replace(/\/+$/, '');
  }

  /** Photon falls back to local names with "default"; always sent explicitly so the
   * browser's Accept-Language header is never what decides. */
  private lang(lang: string): string {
    return this.langs.includes(lang) ? lang : 'default';
  }

  async search(
    query: string,
    opts: { lang: string; bias?: LngLat; signal: AbortSignal },
  ): Promise<Place[]> {
    const params = new URLSearchParams({
      q: query,
      lang: this.lang(opts.lang),
      limit: String(RESULT_LIMIT),
    });
    if (opts.bias) {
      const b = roundBias(opts.bias);
      params.set('lat', String(b.lat));
      params.set('lon', String(b.lng));
    }
    const places = (await this.get(`/api?${params}`, opts.signal)).map(toPlace);
    // Drop repeats: the same object, or different OSM objects that would look identical
    // in the list (e.g. a square mapped as an area and as several pedestrian ways).
    const seen = new Set<string>();
    return places.filter((p) => {
      const keys = [p.id, `${p.name}\n${p.description ?? ''}`];
      if (keys.some((k) => seen.has(k))) return false;
      keys.forEach((k) => seen.add(k));
      return true;
    });
  }

  async reverse(point: LngLat, opts: { lang: string; signal: AbortSignal }): Promise<Place | null> {
    const params = new URLSearchParams({
      lat: point.lat.toFixed(5),
      lon: point.lng.toFixed(5),
      lang: this.lang(opts.lang),
      limit: '1',
    });
    const [feature] = await this.get(`/reverse?${params}`, opts.signal);
    return feature ? toPlace(feature) : null;
  }

  private async get(path: string, signal: AbortSignal): Promise<PhotonFeature[]> {
    const res = await fetch(`${this.base}${path}`, {
      signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) throw new Error(`Photon responded ${res.status}`);
    const body = (await res.json()) as { features?: PhotonFeature[] };
    return body.features ?? [];
  }
}
