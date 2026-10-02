import { describe, expect, it } from 'vitest';
import { fromGeoJSON, GeoJSONError, toGeoJSON } from '../../src/lib/places/geojson';
import type { SavedPlace } from '../../src/lib/places/types';

const saved: SavedPlace[] = [
  {
    id: 'W1',
    name: 'Red Square',
    description: 'Moscow, Russia',
    point: { lng: 37.6215, lat: 55.7536 },
    osm: { type: 'way', id: 1 },
    savedAt: Date.UTC(2026, 9, 2, 12),
  },
  { id: '55.70000,37.50000', name: '', point: { lng: 37.5, lat: 55.7 }, savedAt: 0 },
];

describe('saved places GeoJSON', () => {
  it('round-trips', () => {
    expect(fromGeoJSON(toGeoJSON(saved))).toEqual({ places: saved, invalid: 0 });
  });

  it('writes standard GeoJSON points', () => {
    const data = JSON.parse(toGeoJSON(saved));
    expect(data.type).toBe('FeatureCollection');
    expect(data.features[0]).toEqual({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [37.6215, 55.7536] },
      properties: {
        name: 'Red Square',
        description: 'Moscow, Russia',
        osm: 'way/1',
        saved_at: '2026-10-02T12:00:00.000Z',
      },
    });
  });

  it('imports points from other tools and counts what it cannot use', () => {
    const text = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [30.3, 59.9] },
          properties: { title: 'SPb' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
          properties: {},
        },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [500, 0] }, properties: {} },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 2] },
          properties: { osm: 'evil/../1' },
        },
      ],
    });
    const { places, invalid } = fromGeoJSON(text, 42);
    expect(invalid).toBe(2);
    expect(places[0]).toEqual({
      id: '59.90000,30.30000',
      name: 'SPb',
      point: { lng: 30.3, lat: 59.9 },
      savedAt: 42,
    });
    expect(places[1]?.osm).toBeUndefined();
  });

  it('rejects files that are not a FeatureCollection', () => {
    expect(() => fromGeoJSON('nope')).toThrow(GeoJSONError);
    expect(() => fromGeoJSON('{"type":"Feature"}')).toThrow(GeoJSONError);
  });
});
