import { describe, expect, it } from 'vitest';
import { decodeRoute, encodeRoute, readRouteFromHash } from '../../src/lib/routing/route-hash';

const kremlin = { id: '55.75200,37.61750', name: 'Кремль', point: { lat: 55.752, lng: 37.6175 } };

describe('route hash', () => {
  it('round-trips a route between two places', () => {
    const value = encodeRoute({
      mode: 'transit',
      from: { kind: 'place', place: kremlin },
      to: { kind: 'place', place: { ...kremlin, name: '' } },
    });
    expect(value).not.toMatch(/[&=%]/);
    expect(decodeRoute(value)).toEqual({
      mode: 'transit',
      from: { kind: 'place', place: kremlin },
      to: { kind: 'place', place: { ...kremlin, name: '' } },
    });
  });

  it('writes the user position as "me", never as coordinates', () => {
    const value = encodeRoute({ mode: 'walk', from: { kind: 'me' }, to: null });
    expect(value).toBe('walk~me~');
    expect(decodeRoute(value)).toEqual({ mode: 'walk', from: { kind: 'me' }, to: null });
  });

  it('rejects unknown modes and keeps a bad end empty', () => {
    expect(decodeRoute('fly~me~')).toBeNull();
    expect(decodeRoute('car~x,y~me')).toEqual({ mode: 'car', from: null, to: { kind: 'me' } });
  });

  it('reads from a fragment with other parameters', () => {
    expect(readRouteFromHash('#map=12/55.75/37.62&route=car~~me')).toEqual({
      mode: 'car',
      from: null,
      to: { kind: 'me' },
    });
    expect(readRouteFromHash('#map=12/55.75/37.62')).toBeNull();
  });
});
