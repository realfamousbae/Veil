import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodePolyline, MotisRoutingProvider, roundPoint } from '../../src/lib/providers/motis';

afterEach(() => vi.unstubAllGlobals());

function mockFetch(body: object) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const place = (name: string, lat: number, lon: number) => ({ name, lat, lon });

const walkLeg = {
  mode: 'WALK',
  from: place('START', 55.7512, 37.6184),
  to: place('Охотный Ряд', 55.757, 37.6156),
  startTime: '2026-10-04T10:00:00Z',
  endTime: '2026-10-04T10:08:00Z',
  distance: 640,
  // Google's documented example: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453).
  legGeometry: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', precision: 5, length: 3 },
  steps: [{ relativeDirection: 'DEPART', distance: 120, streetName: 'Тверская улица' }],
};

const metroLeg = {
  mode: 'SUBWAY',
  from: place('Охотный Ряд', 55.757, 37.6156),
  to: place('Университет', 55.6926, 37.5345),
  startTime: '2026-10-04T10:08:00Z',
  endTime: '2026-10-04T10:24:00Z',
  routeId: 'rail_m1',
  routeColor: 'E42313',
  routeTextColor: 'ffffff',
  routeShortName: '1',
  headsign: 'Коммунарка',
  legGeometry: { points: '', precision: 6 },
};

describe('roundPoint', () => {
  it('rounds to 4 decimals (~10 m)', () => {
    expect(roundPoint({ lng: 37.617345, lat: 55.755821 })).toEqual({ lng: 37.6173, lat: 55.7558 });
  });
});

describe('decodePolyline', () => {
  it('decodes into [lng, lat] pairs at the given precision', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
    expect(decodePolyline('', 6)).toEqual([]);
  });
});

describe('MotisRoutingProvider', () => {
  it('asks only for direct walking routes, with rounded points and no credentials', async () => {
    const fetch = mockFetch({ direct: [], itineraries: [] });
    await new MotisRoutingProvider('https://route.example.org/').route({
      from: { lng: 37.618412, lat: 55.751244 },
      to: { lng: 37.534512, lat: 55.692611 },
      mode: 'walk',
      lang: 'ru',
      signal: new AbortController().signal,
    });
    const [url = '', init] = fetch.mock.calls[0] ?? [];
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://route.example.org/api/v6/plan');
    expect(u.searchParams.get('fromPlace')).toBe('55.7512,37.6184');
    expect(u.searchParams.get('toPlace')).toBe('55.6926,37.5345');
    expect(u.searchParams.get('directModes')).toBe('WALK');
    expect(u.searchParams.get('transitModes')).toBe('');
    expect(u.searchParams.has('time')).toBe(false);
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
  });

  it('drives with CAR and sends a chosen time', async () => {
    const fetch = mockFetch({ direct: [], itineraries: [] });
    await new MotisRoutingProvider('https://r.example').route({
      from: { lng: 37.6, lat: 55.7 },
      to: { lng: 37.5, lat: 55.6 },
      mode: 'car',
      time: new Date('2026-10-04T08:30:00Z'),
      arriveBy: true,
      lang: 'en',
      signal: new AbortController().signal,
    });
    const u = new URL(fetch.mock.calls[0]?.[0] ?? '');
    expect(u.searchParams.get('directModes')).toBe('CAR');
    expect(u.searchParams.get('time')).toBe('2026-10-04T08:30:00.000Z');
    expect(u.searchParams.get('arriveBy')).toBe('true');
  });

  it('maps transit itineraries, line colors and estimated feeds', async () => {
    const fetch = mockFetch({
      direct: [],
      itineraries: [
        {
          duration: 1440,
          startTime: '2026-10-04T10:00:00Z',
          endTime: '2026-10-04T10:24:00Z',
          transfers: 0,
          legs: [walkLeg, metroLeg],
        },
      ],
    });
    const [it] = await new MotisRoutingProvider('https://r.example', ['rail']).route({
      from: { lng: 37.6184, lat: 55.7512 },
      to: { lng: 37.5345, lat: 55.6926 },
      mode: 'transit',
      lang: 'ru',
      signal: new AbortController().signal,
    });
    expect(new URL(fetch.mock.calls[0]?.[0] ?? '').searchParams.has('transitModes')).toBe(false);
    expect(it?.duration).toBe(1440);
    const [walk, metro] = it?.legs ?? [];
    expect(walk).toMatchObject({
      mode: 'walk',
      distance: 640,
      approximate: false,
      steps: [{ direction: 'DEPART', street: 'Тверская улица', distance: 120 }],
    });
    expect(walk?.geometry).toHaveLength(3);
    expect(walk?.line).toBeUndefined();
    expect(metro).toMatchObject({
      mode: 'metro',
      approximate: true,
      line: { name: '1', color: '#E42313', textColor: '#ffffff', headsign: 'Коммунарка' },
      to: { name: 'Университет', point: { lng: 37.5345, lat: 55.6926 } },
    });
  });

  it('fails on an error response', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    await expect(
      new MotisRoutingProvider('https://r.example').route({
        from: { lng: 0, lat: 0 },
        to: { lng: 1, lat: 1 },
        mode: 'walk',
        lang: 'en',
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('500');
  });
});
