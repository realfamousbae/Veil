import type {
  StyleSpecification,
  VectorSourceSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { layers, type Flavor } from '@protomaps/basemaps';

export const BASEMAP_SOURCE = 'protomaps';

export interface StyleOptions {
  source: VectorSourceSpecification;
  flavor: Flavor;
  /** Sprite sheet name under assets/sprites/v4/, e.g. "light". */
  sprite: string;
  lang: string;
  /** Absolute URL of the self-hosted assets directory, ending with "/". */
  assetsBase: string;
}

/** Builds a complete MapLibre style whose glyphs and sprites come from our own origin. */
export function buildStyle(opts: StyleOptions): StyleSpecification {
  return {
    version: 8,
    glyphs: `${opts.assetsBase}fonts/{fontstack}/{range}.pbf`,
    sprite: `${opts.assetsBase}sprites/v4/${opts.sprite}`,
    sources: { [BASEMAP_SOURCE]: opts.source },
    layers: layers(BASEMAP_SOURCE, opts.flavor, { lang: opts.lang }),
  };
}
