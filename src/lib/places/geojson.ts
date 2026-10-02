import { pointId, type OsmType } from '../providers/types';
import type { SavedPlace } from './types';

// Saved places are backed up as a plain GeoJSON FeatureCollection of points, so the file
// also opens in other tools (QGIS, geojson.io, OsmAnd, ...). This replaces an account.

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const OSM_PREFIX: Record<OsmType, string> = { node: 'N', way: 'W', relation: 'R' };
const OSM_TYPES = new Set<string>(['node', 'way', 'relation']);

interface PointFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    name: string;
    description?: string;
    /** "way/123" */
    osm?: string;
    saved_at: string;
  };
}

export function toGeoJSON(places: SavedPlace[]): string {
  const features: PointFeature[] = places.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.point.lng, p.point.lat] },
    properties: {
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      ...(p.osm ? { osm: `${p.osm.type}/${p.osm.id}` } : {}),
      saved_at: new Date(p.savedAt).toISOString(),
    },
  }));
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2) + '\n';
}

export class GeoJSONError extends Error {}

/** Parses a FeatureCollection; non-point or malformed features are counted as invalid. */
export function fromGeoJSON(
  text: string,
  now = Date.now(),
): { places: SavedPlace[]; invalid: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GeoJSONError('Not JSON');
  }
  const features = (data as { type?: unknown; features?: unknown })?.features;
  if ((data as { type?: unknown })?.type !== 'FeatureCollection' || !Array.isArray(features)) {
    throw new GeoJSONError('Not a FeatureCollection');
  }

  const places: SavedPlace[] = [];
  let invalid = 0;
  for (const f of features as unknown[]) {
    const place = toPlace(f, now);
    if (place) places.push(place);
    else invalid++;
  }
  return { places, invalid };
}

function toPlace(f: unknown, now: number): SavedPlace | null {
  const feature = f as {
    geometry?: { type?: unknown; coordinates?: unknown };
    properties?: Record<string, unknown> | null;
  };
  if (feature?.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) {
    return null;
  }
  const [lng, lat] = feature.geometry.coordinates as unknown[];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const props = feature.properties ?? {};
  const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 500) : '');
  const name = text(props['name']) || text(props['title']);
  const description = text(props['description']);
  const savedAt = Date.parse(text(props['saved_at']));

  const place: SavedPlace = {
    id: pointId({ lng, lat }),
    name,
    point: { lng, lat },
    savedAt: Number.isFinite(savedAt) ? savedAt : now,
  };
  if (description) place.description = description;

  const [type, id] = text(props['osm']).split('/');
  const osmId = Number(id);
  if (type && OSM_TYPES.has(type) && Number.isSafeInteger(osmId) && osmId > 0) {
    place.osm = { type: type as OsmType, id: osmId };
    place.id = `${OSM_PREFIX[type as OsmType]}${osmId}`;
  }
  return place;
}
