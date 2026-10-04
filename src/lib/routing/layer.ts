import type {
  GeoJSONSourceSpecification,
  LayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { Itinerary } from '../providers/types';
import type { Theme } from '../../themes/types';

export const ROUTE_SOURCE = 'route';

type RouteData = Extract<GeoJSONSourceSpecification['data'], { type: 'FeatureCollection' }>;

/**
 * The itinerary as map features: one line per leg (colored by its transit line, if any)
 * and its two ends.
 */
export function routeData(itinerary: Itinerary | undefined): RouteData {
  if (!itinerary) return { type: 'FeatureCollection', features: [] };
  const legs = itinerary.legs.filter((leg) => leg.geometry.length > 1);
  const first = itinerary.legs[0];
  const last = itinerary.legs.at(-1);
  const end = (kind: string, point: { lng: number; lat: number }) => ({
    type: 'Feature' as const,
    properties: { end: kind },
    geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] },
  });
  return {
    type: 'FeatureCollection',
    features: [
      ...legs.map((leg) => ({
        type: 'Feature' as const,
        properties: {
          walk: leg.mode === 'walk',
          ...(leg.line?.color && { color: leg.line.color }),
        },
        geometry: { type: 'LineString' as const, coordinates: leg.geometry },
      })),
      ...(first ? [end('start', first.from.point)] : []),
      ...(last ? [end('finish', last.to.point)] : []),
    ],
  };
}

/** Route layers, drawn above roads and under labels, in the theme's colors. */
export function routeLayers(theme: Theme): LayerSpecification[] {
  const { route, routeCasing } = theme.ui.color;
  const lines = ['==', ['geometry-type'], 'LineString'];
  const walk = ['==', ['get', 'walk'], true];
  return [
    {
      id: 'route-casing',
      type: 'line',
      source: ROUTE_SOURCE,
      filter: ['all', lines, ['!', walk]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': routeCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 16, 12],
      },
    },
    {
      id: 'route-line',
      type: 'line',
      source: ROUTE_SOURCE,
      filter: ['all', lines, ['!', walk]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'color'], route],
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 16, 8],
      },
    },
    {
      id: 'route-walk',
      type: 'line',
      source: ROUTE_SOURCE,
      filter: ['all', lines, walk],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': route,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 6],
        'line-dasharray': [0.1, 2],
      },
    },
    {
      id: 'route-ends',
      type: 'circle',
      source: ROUTE_SOURCE,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 8],
        'circle-color': ['match', ['get', 'end'], 'start', routeCasing, route],
        'circle-stroke-color': ['match', ['get', 'end'], 'start', route, routeCasing],
        'circle-stroke-width': 3,
      },
    },
  ] as LayerSpecification[];
}
