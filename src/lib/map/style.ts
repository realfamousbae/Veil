import type {
  StyleSpecification,
  VectorSourceSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { layers } from '@protomaps/basemaps';
import type { Theme } from '../../themes/types';

export const BASEMAP_SOURCE = 'protomaps';

export interface StyleOptions {
  source: VectorSourceSpecification;
  theme: Theme;
  lang: string;
  /** Absolute URL of the self-hosted assets directory, ending with "/". */
  assetsBase: string;
}

/** Builds a complete MapLibre style whose glyphs and sprites come from our own origin. */
export function buildStyle(opts: StyleOptions): StyleSpecification {
  return {
    version: 8,
    glyphs: `${opts.assetsBase}fonts/{fontstack}/{range}.pbf`,
    sprite: `${opts.assetsBase}sprites/v4/${opts.theme.sprite}`,
    sources: { [BASEMAP_SOURCE]: opts.source },
    layers: layers(BASEMAP_SOURCE, opts.theme.map, { lang: opts.lang }),
  };
}
