import { describe, expect, it } from 'vitest';
import {
  decodePlace,
  encodePlace,
  readPlaceFromHash,
  withPlace,
} from '../../src/lib/search/place-hash';

const place = {
  id: 'N1',
  name: 'Кафе «Пушкинъ» & Co = 100%',
  point: { lat: 55.7637, lng: 37.6047 },
};

describe('place hash', () => {
  it('round-trips a place with any characters in its name', () => {
    expect(decodePlace(encodePlace(place))).toMatchObject({ name: place.name, point: place.point });
  });

  it('encodes without characters that break the fragment', () => {
    expect(encodePlace(place)).toMatch(/^[\d.,A-Za-z_-]+$/);
  });

  it('adds, replaces and removes the place next to the map parameter', () => {
    const hash = withPlace('#map=15/55.76/37.6', place);
    expect(hash.startsWith('#map=15/55.76/37.6&place=55.76370,37.60470,')).toBe(true);
    expect(readPlaceFromHash(hash)?.name).toBe(place.name);
    expect(withPlace(hash, null)).toBe('#map=15/55.76/37.6');
  });

  it('rejects malformed coordinates', () => {
    expect(decodePlace('abc,def')).toBeNull();
    expect(decodePlace('95,10')).toBeNull();
  });
});
