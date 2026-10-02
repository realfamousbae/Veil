import { namedFlavor } from '@protomaps/basemaps';
import { describe, expect, it } from 'vitest';
import { BASEMAP_SOURCE, buildStyle } from '../../src/lib/map/style';

describe('buildStyle', () => {
  const style = buildStyle({
    source: { type: 'vector', url: 'pmtiles://https://veil.test/world.pmtiles' },
    flavor: namedFlavor('light'),
    sprite: 'light',
    lang: 'ru',
    assetsBase: 'https://veil.test/assets/',
  });

  it('loads glyphs and sprites from our own origin only', () => {
    expect(style.glyphs).toBe('https://veil.test/assets/fonts/{fontstack}/{range}.pbf');
    expect(style.sprite).toBe('https://veil.test/assets/sprites/v4/light');
  });

  it('uses a single base map source referenced by every layer', () => {
    expect(Object.keys(style.sources)).toEqual([BASEMAP_SOURCE]);
    expect(style.layers.length).toBeGreaterThan(0);
    for (const layer of style.layers) {
      if ('source' in layer) expect(layer.source).toBe(BASEMAP_SOURCE);
    }
  });
});
