import { describe, expect, it } from 'vitest';
import { formatCamera, parseCamera } from '../../src/lib/map/hash';
import { getHashParam, withHashParam } from '../../src/lib/url-hash';

describe('url hash params', () => {
  it('sets in place, appends and removes', () => {
    expect(withHashParam('#map=1/2/3&place=x', 'map', '4/5/6')).toBe('#map=4/5/6&place=x');
    expect(withHashParam('', 'map', '1/2/3')).toBe('#map=1/2/3');
    expect(withHashParam('#map=1/2/3&place=x', 'map', null)).toBe('#place=x');
    expect(withHashParam('#place=x', 'place', null)).toBe('');
    expect(getHashParam('place', '#map=1/2/3&place=a,b')).toBe('a,b');
    expect(getHashParam('nope', '#map=1')).toBeNull();
  });
});

describe('camera hash', () => {
  it('parses zoom/lat/lng with optional bearing and pitch', () => {
    expect(parseCamera('14/55.75/37.62')).toEqual({
      center: [37.62, 55.75],
      zoom: 14,
      bearing: 0,
      pitch: 0,
    });
    expect(parseCamera('14/55.75/37.62/30/45')).toMatchObject({ bearing: 30, pitch: 45 });
  });

  it('rejects garbage', () => {
    expect(parseCamera('a/b/c')).toBeNull();
    expect(parseCamera('14/95/37')).toBeNull();
    expect(parseCamera('14/55')).toBeNull();
    expect(parseCamera(null)).toBeNull();
  });

  it('formats with zoom-dependent precision', () => {
    expect(formatCamera({ center: [37.617698, 55.755826], zoom: 14, bearing: 0, pitch: 0 })).toBe(
      '14/55.75583/37.6177',
    );
    expect(formatCamera({ center: [37.6, 55.7], zoom: 3, bearing: 10, pitch: 0 })).toBe(
      '3/55.7/37.6/10',
    );
  });
});
