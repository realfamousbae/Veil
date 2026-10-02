import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import { addProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type { TileProvider } from './types';

export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>';

let protocol: Protocol | null = null;

/** Registers the `pmtiles://` protocol with MapLibre once per page. */
export function registerPmtilesProtocol(): Protocol {
  if (!protocol) {
    protocol = new Protocol();
    addProtocol('pmtiles', protocol.tile);
  }
  return protocol;
}

/** Base map tiles from a single PMTiles archive, read with HTTP range requests. */
export class PmtilesTileProvider implements TileProvider {
  constructor(private readonly url: string) {}

  async source(): Promise<VectorSourceSpecification> {
    registerPmtilesProtocol();
    return {
      type: 'vector',
      url: `pmtiles://${this.url}`,
      attribution: OSM_ATTRIBUTION,
    };
  }
}
