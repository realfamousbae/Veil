import { describe, expect, it } from 'vitest';
import { contains, intersects, tileBounds } from '../../src/lib/tiles/geo';
import { TileResolver, type Archive } from '../../src/lib/tiles/resolver';

const archive = (
  id: string,
  bbox: Archive['bbox'],
  maxzoom: number,
  local = false,
  data?: number,
) =>
  ({
    id,
    bbox,
    maxzoom,
    local,
    pmtiles: {
      getZxy: async () =>
        data === undefined ? undefined : { data: new Uint8Array([data]).buffer },
    },
  }) as unknown as Archive;

const MOSCOW: Archive['bbox'] = [36.8, 55.14, 37.97, 56.02];

describe('tile geometry', () => {
  it('computes tile bounds', () => {
    const [w, s, e, n] = tileBounds(1, 1, 0);
    expect([w, e]).toEqual([0, 180]);
    expect(s).toBeCloseTo(0);
    expect(n).toBeCloseTo(85.0511, 3);
  });

  it('tests bbox relations', () => {
    expect(intersects([0, 0, 2, 2], [1, 1, 3, 3])).toBe(true);
    expect(intersects([0, 0, 1, 1], [2, 2, 3, 3])).toBe(false);
    expect(contains(MOSCOW, 37.62, 55.75)).toBe(true);
  });
});

describe('TileResolver', () => {
  // z12 tile containing central Moscow
  const MOSCOW_TILE = [12, 2476, 1283] as const;

  it('prefers a downloaded region, then the most detailed remote one', async () => {
    const r = new TileResolver();
    r.setRegions([
      archive('remote-oblast', [35, 54, 40, 57], 15, false, 1),
      archive('local-moscow', MOSCOW, 15, true, 2),
    ]);
    expect(r.candidates(...MOSCOW_TILE).map((a) => a.id)).toEqual([
      'local-moscow',
      'remote-oblast',
    ]);
    expect(await r.tile(...MOSCOW_TILE)).toEqual(new Uint8Array([2]));
  });

  it('falls through when an archive lacks the tile or fails', async () => {
    const r = new TileResolver();
    const failing = archive('broken', MOSCOW, 15, true);
    failing.pmtiles.getZxy = async () => {
      throw new Error('offline');
    };
    r.setRegions([
      failing,
      archive('missing', MOSCOW, 14, false),
      archive('ok', [35, 54, 40, 57], 13, false, 9),
    ]);
    expect(await r.tile(...MOSCOW_TILE)).toEqual(new Uint8Array([9]));
  });

  it('returns an empty tile where nothing covers it', async () => {
    const r = new TileResolver();
    r.setRegions([archive('moscow', MOSCOW, 15, false, 1)]);
    expect(await r.tile(12, 0, 0)).toEqual(new Uint8Array());
  });

  it('knows where street-level detail exists', () => {
    const r = new TileResolver();
    r.setRegions([archive('moscow', MOSCOW, 15, false, 1)]);
    expect(r.hasDetail(37.62, 55.75, 14)).toBe(true);
    expect(r.hasDetail(30.3, 59.9, 14)).toBe(false);
    expect(r.hasDetail(30.3, 59.9, 1)).toBe(true);
  });
});
