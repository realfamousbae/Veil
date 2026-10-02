// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { Locator, type Fix } from '../../src/lib/geolocation/locator.svelte';
import { metersPerPixel } from '../../src/lib/geolocation/marker';

const position = (lat: number, lng: number, accuracy = 20) =>
  ({ coords: { latitude: lat, longitude: lng, accuracy } }) as GeolocationPosition;

function fakeGeolocation() {
  let success: PositionCallback | undefined;
  let failure: PositionErrorCallback | null | undefined;
  const geo = {
    getCurrentPosition: vi.fn((s: PositionCallback, e?: PositionErrorCallback | null) => {
      success = s;
      failure = e;
    }),
    watchPosition: vi.fn((s: PositionCallback, e?: PositionErrorCallback | null) => {
      success = s;
      failure = e;
      return 7;
    }),
    clearWatch: vi.fn(),
  };
  return {
    geo,
    succeed: (p: GeolocationPosition) => success?.(p),
    fail: (code: number) => failure?.({ code } as GeolocationPositionError),
  };
}

function setup() {
  const fake = fakeGeolocation();
  const fixes: [Fix, boolean][] = [];
  const locator = new Locator(
    (fix, follow) => fixes.push([fix, follow]),
    () => fake.geo as unknown as Geolocation,
  );
  return { ...fake, locator, fixes };
}

describe('Locator', () => {
  it('does not touch the Geolocation API until pressed', () => {
    const { geo } = setup();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it('locates once, then follows, then stops following', () => {
    const { locator, geo, succeed, fixes } = setup();

    locator.press();
    expect(locator.mode).toBe('locating');
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geo.watchPosition).not.toHaveBeenCalled();
    succeed(position(55.75, 37.62));
    expect(locator.mode).toBe('shown');
    expect(fixes).toEqual([[{ lat: 55.75, lng: 37.62, accuracy: 20 }, false]]);

    locator.press();
    expect(locator.mode).toBe('follow');
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
    succeed(position(55.76, 37.63));
    expect(fixes[1]?.[1]).toBe(true);

    locator.press();
    expect(locator.mode).toBe('shown');
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('stops watching when the tab is hidden', () => {
    const { locator, geo, succeed } = setup();
    locator.press();
    succeed(position(55.75, 37.62));
    locator.press();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
    expect(locator.mode).toBe('shown');
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('reports a denied permission and returns to off', () => {
    const { locator, fail } = setup();
    locator.press();
    fail(1);
    expect(locator.error).toBe('denied');
    expect(locator.mode).toBe('off');
  });

  it('reports a missing Geolocation API', () => {
    const locator = new Locator(
      () => {},
      () => undefined,
    );
    locator.press();
    expect(locator.error).toBe('unsupported');
  });
});

describe('metersPerPixel', () => {
  it('matches the Web Mercator scale', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.5, 0);
    expect(metersPerPixel(60, 10)).toBeCloseTo(78271.5 / 1024 / 2, 1);
  });
});
