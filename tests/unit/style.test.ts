import { describe, expect, it } from 'vitest';
import { BASEMAP_SOURCE, buildStyle, CONTEXT_SOURCE } from '../../src/lib/map/style';
import { ROUTE_SOURCE } from '../../src/lib/routing/layer';
import dark from '../../src/themes/dark';

describe('buildStyle', () => {
  const style = buildStyle({
    theme: dark,
    lang: 'ru',
    assetsBase: 'https://veil.test/assets/',
    worldMaxZoom: 7,
    tilesVersion: 3,
  });

  it('loads glyphs and sprites from our own origin only', () => {
    expect(style.glyphs).toBe('https://veil.test/assets/fonts/{fontstack}/{range}.pbf');
    expect(style.sprite).toBe('https://veil.test/assets/sprites/v4/dark');
  });

  it('reads tiles through the veil:// resolver, versioned', () => {
    expect(style.sources[BASEMAP_SOURCE]).toMatchObject({
      tiles: ['veil://base/{z}/{x}/{y}?v=3'],
      maxzoom: 15,
    });
    expect(style.sources[CONTEXT_SOURCE]).toMatchObject({
      tiles: ['veil://context/{z}/{x}/{y}?v=3'],
      maxzoom: 7,
    });
  });

  it('puts context land/water right above the background, only beyond the world zooms', () => {
    expect(style.layers[0]?.type).toBe('background');
    const context = style.layers.filter((l) => 'source' in l && l.source === CONTEXT_SOURCE);
    expect(context.map((l) => l.id)).toContain('context-water');
    expect(context.every((l) => l.minzoom === 8)).toBe(true);
    expect(style.layers[1]?.id).toBe(context[0]?.id);
  });

  it('references only its own sources', () => {
    for (const layer of style.layers) {
      if ('source' in layer)
        expect([BASEMAP_SOURCE, CONTEXT_SOURCE, ROUTE_SOURCE]).toContain(layer.source);
    }
  });

  it('draws the route under the labels, in theme colors, empty by default', () => {
    expect(style.sources[ROUTE_SOURCE]).toEqual({
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    const ids = style.layers.map((l) => l.id);
    const firstLabel = style.layers.findIndex((l) => l.type === 'symbol');
    expect(ids.indexOf('route-line')).toBeLessThan(firstLabel);
    expect(ids.indexOf('route-line')).toBeGreaterThan(ids.indexOf('roads_highway'));
    expect(JSON.stringify(style.layers)).toContain(dark.ui.color.route);
  });

  it('puts a route into the source: legs with line colors and both ends', () => {
    const point = (lng: number, lat: number) => ({ name: '', point: { lng, lat } });
    const leg = { start: new Date(0), end: new Date(0), approximate: false, steps: [] };
    const routed = buildStyle({
      theme: dark,
      lang: 'ru',
      assetsBase: 'https://veil.test/assets/',
      worldMaxZoom: 7,
      tilesVersion: 3,
      route: {
        duration: 60,
        start: new Date(0),
        end: new Date(0),
        transfers: 0,
        legs: [
          {
            ...leg,
            mode: 'walk',
            from: point(0, 0),
            to: point(1, 1),
            geometry: [
              [0, 0],
              [1, 1],
            ],
          },
          {
            ...leg,
            mode: 'metro',
            from: point(1, 1),
            to: point(2, 2),
            line: { name: '1', color: '#e42313' },
            geometry: [
              [1, 1],
              [2, 2],
            ],
          },
        ],
      },
    });
    const source = routed.sources[ROUTE_SOURCE] as { data: { features: { properties: object }[] } };
    expect(source.data.features.map((f) => f.properties)).toEqual([
      { walk: true },
      { walk: false, color: '#e42313' },
      { end: 'start' },
      { end: 'finish' },
    ]);
  });
});
