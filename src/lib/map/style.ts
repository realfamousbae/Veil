import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { layers } from '@protomaps/basemaps';
import type { Theme } from '../../themes/types';
import { tileUrl } from '../tiles/resolver';

export const BASEMAP_SOURCE = 'protomaps';
/** Low-zoom land and water drawn under the base map where no detailed region exists. */
export const CONTEXT_SOURCE = 'context';
const CONTEXT_LAYERS = new Set(['earth', 'landcover', 'water', 'landuse_park']);

/** Highest zoom in Protomaps basemap tiles; MapLibre overzooms beyond it. */
export const DETAIL_MAX_ZOOM = 15;

export interface StyleOptions {
  theme: Theme;
  lang: string;
  /** Absolute URL of the self-hosted assets directory, ending with "/". */
  assetsBase: string;
  /** Max zoom of the world overview archive. */
  worldMaxZoom: number;
  /** Bumped when the set of tile archives changes, so MapLibre refetches tiles. */
  tilesVersion: number;
}

/** Builds a complete MapLibre style whose glyphs, sprites and tiles come from our own origin. */
export function buildStyle(opts: StyleOptions): StyleSpecification {
  const base = layers(BASEMAP_SOURCE, opts.theme.map, { lang: opts.lang });
  const [background, ...rest] = base;
  const context = layers(CONTEXT_SOURCE, opts.theme.map, { lang: opts.lang })
    .filter((l) => CONTEXT_LAYERS.has(l.id))
    .map((l): LayerSpecification => ({
      ...l,
      id: `context-${l.id}`,
      minzoom: opts.worldMaxZoom + 1,
    }));

  return {
    version: 8,
    glyphs: `${opts.assetsBase}fonts/{fontstack}/{range}.pbf`,
    sprite: `${opts.assetsBase}sprites/v4/${opts.theme.sprite}`,
    sources: {
      [BASEMAP_SOURCE]: {
        type: 'vector',
        tiles: [tileUrl('base', opts.tilesVersion)],
        maxzoom: DETAIL_MAX_ZOOM,
      },
      [CONTEXT_SOURCE]: {
        type: 'vector',
        tiles: [tileUrl('context', opts.tilesVersion)],
        maxzoom: opts.worldMaxZoom,
      },
    },
    layers: background ? [background, ...context, ...rest] : rest,
  };
}
