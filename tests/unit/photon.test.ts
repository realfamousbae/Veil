import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotonGeocodeProvider, roundBias, toPlace } from '../../src/lib/providers/photon';

const feature = (properties: object, coordinates: [number, number] = [37.6, 55.75]) => ({
  geometry: { coordinates },
  properties,
});

function mockFetch(features: object[]) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json({ type: 'FeatureCollection', features }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('roundBias', () => {
  it('rounds the map center to 0.1°', () => {
    expect(roundBias({ lng: 37.61734, lat: 55.75582 })).toEqual({ lng: 37.6, lat: 55.8 });
  });
});

describe('toPlace', () => {
  it('builds a name and an address line without repeats', () => {
    const place = toPlace(
      feature({
        name: 'Арбат',
        street: 'Кривоникольский переулок',
        housenumber: '1',
        district: 'Арбат',
        city: 'Москва',
        state: 'Москва',
        country: 'Россия',
        osm_type: 'N',
        osm_id: 42,
      }),
    );
    expect(place).toEqual({
      id: 'N42',
      name: 'Арбат',
      description: 'Кривоникольский переулок 1, Москва, Россия',
      point: { lng: 37.6, lat: 55.75 },
      osm: { type: 'node', id: 42 },
    });
  });

  it('names an address by street and house number', () => {
    expect(toPlace(feature({ street: 'Тверская улица', housenumber: '7' })).name).toBe(
      'Тверская улица 7',
    );
  });

  it('converts the extent to [minLng, minLat, maxLng, maxLat]', () => {
    expect(toPlace(feature({ name: 'X', extent: [37.5, 55.8, 37.7, 55.7] })).extent).toEqual([
      37.5, 55.7, 37.7, 55.8,
    ]);
  });
});

describe('PhotonGeocodeProvider', () => {
  const signal = new AbortController().signal;

  it('sends the query with a rounded bias and an explicit language', async () => {
    const fetch = mockFetch([]);
    await new PhotonGeocodeProvider('https://photon.test/').search('кафе', {
      lang: 'en',
      bias: { lng: 37.61734, lat: 55.75582 },
      signal,
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    const u = new URL(url ?? '');
    expect(u.origin + u.pathname).toBe('https://photon.test/api');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      q: 'кафе',
      lang: 'en',
      limit: '10',
      lat: '55.8',
      lon: '37.6',
    });
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', signal });
  });

  it('falls back to local names for unsupported languages and omits bias when off', async () => {
    const fetch = mockFetch([]);
    await new PhotonGeocodeProvider('https://photon.test').search('кафе', { lang: 'ru', signal });
    const u = new URL(fetch.mock.calls[0]?.[0] ?? '');
    expect(u.searchParams.get('lang')).toBe('default');
    expect(u.searchParams.has('lat')).toBe(false);
  });

  it('uses a configured language when the instance supports it', async () => {
    const fetch = mockFetch([]);
    await new PhotonGeocodeProvider('https://photon.test', ['ru']).search('кафе', {
      lang: 'ru',
      signal,
    });
    expect(new URL(fetch.mock.calls[0]?.[0] ?? '').searchParams.get('lang')).toBe('ru');
  });

  it('removes duplicate and indistinguishable results', async () => {
    const f = feature({ name: 'A', city: 'X', osm_type: 'W', osm_id: 1 });
    const lookalike = feature({ name: 'A', city: 'X', osm_type: 'W', osm_id: 2 });
    mockFetch([f, f, lookalike]);
    const results = await new PhotonGeocodeProvider('https://photon.test').search('aaa', {
      lang: 'en',
      signal,
    });
    expect(results).toHaveLength(1);
  });

  it('reverse geocodes a point', async () => {
    const fetch = mockFetch([feature({ name: 'B', osm_type: 'R', osm_id: 7 })]);
    const place = await new PhotonGeocodeProvider('https://photon.test').reverse(
      { lng: 37.123456, lat: 55.987654 },
      { lang: 'en', signal },
    );
    const u = new URL(fetch.mock.calls[0]?.[0] ?? '');
    expect(u.pathname).toBe('/reverse');
    expect(u.searchParams.get('lat')).toBe('55.98765');
    expect(place?.osm).toEqual({ type: 'relation', id: 7 });
  });

  it('throws on HTTP errors', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 429 }));
    await expect(
      new PhotonGeocodeProvider('https://photon.test').search('aaa', { lang: 'en', signal }),
    ).rejects.toThrow('429');
  });
});
