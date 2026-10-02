import { describe, expect, it } from 'vitest';
import { BASEMAP_SOURCE, buildStyle, CONTEXT_SOURCE } from '../../src/lib/map/style';
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
      if ('source' in layer) expect([BASEMAP_SOURCE, CONTEXT_SOURCE]).toContain(layer.source);
    }
  });
});
