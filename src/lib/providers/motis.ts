import type {
  Itinerary,
  LegMode,
  LngLat,
  RouteLeg,
  RouteMode,
  RouteRequest,
  RoutingProvider,
} from './types';

// Router backed by MOTIS (https://github.com/motis-project/motis), API v6:
// GET /api/v6/plan, see its openapi.yaml.

/**
 * Route points are rounded to 4 decimals (~10 m): enough to start on the right street,
 * not enough to tell one entrance of a building from another (PRIVACY.md §10).
 */
export function roundPoint(point: LngLat): LngLat {
  const r = (v: number) => Math.round(v * 1e4) / 1e4;
  return { lng: r(point.lng), lat: r(point.lat) };
}

/** Decodes a Google encoded polyline into [lng, lat] pairs. */
export function decodePolyline(encoded: string, precision: number): [number, number][] {
  const factor = 10 ** precision;
  const points: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    points.push([lng / factor, lat / factor]);
  }
  return points;
}

interface MotisPlace {
  name: string;
  lat: number;
  lon: number;
}

interface MotisLeg {
  mode: string;
  from: MotisPlace;
  to: MotisPlace;
  startTime: string;
  endTime: string;
  distance?: number;
  headsign?: string;
  routeId?: string;
  routeColor?: string;
  routeTextColor?: string;
  routeType?: number;
  routeShortName?: string;
  displayName?: string;
  legGeometry: { points: string; precision: number };
  steps?: { relativeDirection: string; distance: number; streetName?: string }[];
}

interface MotisItinerary {
  duration: number;
  startTime: string;
  endTime: string;
  transfers: number;
  legs: MotisLeg[];
}

interface MotisPlan {
  direct: MotisItinerary[];
  itineraries: MotisItinerary[];
}

const DIRECT: Record<Exclude<RouteMode, 'transit'>, { mode: string; maxSeconds: number }> = {
  walk: { mode: 'WALK', maxSeconds: 4 * 3600 },
  car: { mode: 'CAR', maxSeconds: 8 * 3600 },
};

// GTFS extended route types for trolleybuses (11 is the basic one).
const TROLLEYBUS_TYPES = new Set([11, 800]);

function legMode(leg: MotisLeg): LegMode {
  switch (leg.mode) {
    case 'WALK':
      return 'walk';
    case 'CAR':
    case 'CAR_PARKING':
    case 'CAR_DROPOFF':
      return 'car';
    case 'BUS':
    case 'COACH':
      return leg.routeType !== undefined && TROLLEYBUS_TYPES.has(leg.routeType)
        ? 'trolleybus'
        : 'bus';
    case 'TRAM':
      return 'tram';
    case 'SUBWAY':
    case 'METRO':
      return 'metro';
    case 'RAIL':
    case 'SUBURBAN':
    case 'REGIONAL_RAIL':
    case 'REGIONAL_FAST_RAIL':
    case 'LONG_DISTANCE':
    case 'HIGHSPEED_RAIL':
    case 'NIGHT_RAIL':
      return 'rail';
    default:
      return 'other';
  }
}

const color = (hex?: string) => (hex && /^[0-9a-f]{6}$/i.test(hex) ? `#${hex}` : undefined);

export class MotisRoutingProvider implements RoutingProvider {
  private readonly base: string;

  constructor(
    url: string,
    /** Feed tags whose timetables are estimated from intervals (route ids "<tag>_…"). */
    private readonly approximateFeeds: string[] = [],
  ) {
    this.base = url.replace(/\/+$/, '');
  }

  async route(request: RouteRequest): Promise<Itinerary[]> {
    const from = roundPoint(request.from);
    const to = roundPoint(request.to);
    const params = new URLSearchParams({
      fromPlace: `${from.lat},${from.lng}`,
      toPlace: `${to.lat},${to.lng}`,
      language: request.lang,
      detailedLegs: 'true',
    });
    if (request.time) params.set('time', request.time.toISOString());
    if (request.arriveBy) params.set('arriveBy', 'true');
    if (request.mode === 'transit') {
      params.set('directModes', 'WALK');
    } else {
      const direct = DIRECT[request.mode];
      params.set('directModes', direct.mode);
      params.set('transitModes', ''); // empty: no transit connections at all
      params.set('maxDirectTime', String(direct.maxSeconds));
    }

    const res = await fetch(`${this.base}/api/v6/plan?${params}`, {
      signal: request.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) throw new Error(`MOTIS responded ${res.status}`);
    const plan = (await res.json()) as MotisPlan;
    const list = request.mode === 'transit' ? [...plan.itineraries, ...plan.direct] : plan.direct;
    return list.map((it) => this.itinerary(it));
  }

  private itinerary(it: MotisItinerary): Itinerary {
    return {
      duration: it.duration,
      start: new Date(it.startTime),
      end: new Date(it.endTime),
      transfers: it.transfers,
      legs: it.legs.map((leg) => this.leg(leg)),
    };
  }

  private leg(leg: MotisLeg): RouteLeg {
    const mode = legMode(leg);
    const place = (p: MotisPlace) => ({ name: p.name, point: { lng: p.lon, lat: p.lat } });
    const result: RouteLeg = {
      mode,
      geometry: decodePolyline(leg.legGeometry.points, leg.legGeometry.precision),
      from: place(leg.from),
      to: place(leg.to),
      start: new Date(leg.startTime),
      end: new Date(leg.endTime),
      approximate: this.approximateFeeds.some((tag) => leg.routeId?.startsWith(`${tag}_`)),
      steps: (leg.steps ?? []).map((s) => ({
        direction: s.relativeDirection,
        street: s.streetName ?? '',
        distance: s.distance,
      })),
    };
    if (leg.distance !== undefined) result.distance = leg.distance;
    if (mode !== 'walk' && mode !== 'car') {
      const line: NonNullable<RouteLeg['line']> = {
        name: leg.routeShortName || leg.displayName || '',
      };
      const bg = color(leg.routeColor);
      const fg = color(leg.routeTextColor);
      if (bg) line.color = bg;
      if (fg) line.textColor = fg;
      if (leg.headsign) line.headsign = leg.headsign;
      result.line = line;
    }
    return result;
  }
}
