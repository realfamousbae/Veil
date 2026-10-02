import { addProtocol } from 'maplibre-gl';
import { FetchSource, FileSource, PMTiles } from 'pmtiles';
import { contains, intersects, tileBounds, WORLD_BBOX, type BBox } from './geo';

/** One PMTiles archive the map can read tiles from. */
export interface Archive {
  id: string;
  bbox: BBox;
  maxzoom: number;
  /** Downloaded to this device (OPFS). */
  local: boolean;
  pmtiles: PMTiles;
}

export function remoteArchive(id: string, url: string, bbox: BBox, maxzoom: number): Archive {
  return { id, bbox, maxzoom, local: false, pmtiles: new PMTiles(new FetchSource(url)) };
}

export function localArchive(id: string, file: File, bbox: BBox, maxzoom: number): Archive {
  return { id, bbox, maxzoom, local: true, pmtiles: new PMTiles(new FileSource(file)) };
}

/** Local first (works offline, no requests), then the most detailed, then the smallest. */
function priority(a: Archive, b: Archive): number {
  if (a.local !== b.local) return a.local ? -1 : 1;
  if (a.maxzoom !== b.maxzoom) return b.maxzoom - a.maxzoom;
  const area = (x: Archive) => (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]);
  return area(a) - area(b);
}

/**
 * Serves map tiles from several PMTiles archives: downloaded regions, regions on the server
 * and the low-zoom world overview. Each tile comes from the first archive that covers it.
 */
export class TileResolver {
  #archives: Archive[] = [];
  #world: Archive | undefined;

  setWorld(url: string, maxzoom: number): void {
    this.#world = remoteArchive('world', url, WORLD_BBOX, maxzoom);
  }

  /** Replaces the regions (remote and local); the world archive is kept. */
  setRegions(archives: Archive[]): void {
    this.#archives = [...archives].sort(priority);
  }

  get worldMaxZoom(): number {
    return this.#world?.maxzoom ?? 0;
  }

  /** Archives that may contain the tile, best first. */
  candidates(z: number, x: number, y: number): Archive[] {
    const bounds = tileBounds(z, x, y);
    const all = this.#world ? [...this.#archives, this.#world] : this.#archives;
    return all.filter((a) => z <= a.maxzoom && intersects(bounds, a.bbox));
  }

  async tile(z: number, x: number, y: number, signal?: AbortSignal): Promise<Uint8Array> {
    let lastError: unknown;
    for (const archive of this.candidates(z, x, y)) {
      try {
        const res = await archive.pmtiles.getZxy(z, x, y, signal);
        if (res) return new Uint8Array(res.data);
      } catch (e) {
        if (signal?.aborted) throw e;
        lastError = e; // e.g. offline: try the next archive
      }
    }
    if (lastError) throw lastError;
    return new Uint8Array(); // nothing covers this tile: an empty tile
  }

  /** Whether street-level data exists for a point at a zoom (else show a hint). */
  hasDetail(lng: number, lat: number, zoom: number): boolean {
    if (zoom <= this.worldMaxZoom + 1) return true;
    return this.#archives.some((a) => contains(a.bbox, lng, lat));
  }
}

export const tileResolver = new TileResolver();

const PROTOCOL = 'veil';
let registered = false;

/** Tile URL template for a source served by the resolver. */
export function tileUrl(kind: 'base' | 'context', version: number): string {
  return `${PROTOCOL}://${kind}/{z}/{x}/{y}?v=${version}`;
}

/** Registers the `veil://` protocol with MapLibre once per page. */
export function registerTileProtocol(): void {
  if (registered) return;
  registered = true;
  addProtocol(PROTOCOL, async (params, abort) => {
    const m = /^veil:\/\/\w+\/(\d+)\/(\d+)\/(\d+)/.exec(params.url);
    if (!m) throw new Error(`Bad tile URL: ${params.url}`);
    const data = await tileResolver.tile(Number(m[1]), Number(m[2]), Number(m[3]), abort.signal);
    return { data };
  });
}
