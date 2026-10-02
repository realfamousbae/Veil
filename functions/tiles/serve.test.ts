import { describe, expect, it } from 'vitest';
import { rangeSpan, serve } from './[[path]]';

const DATA = new TextEncoder().encode('PMTiles\x03-and-the-rest-of-the-archive');

/** A minimal in-memory R2 bucket honoring Range and If-None-Match headers. */
function bucket(etag = '"abc"'): R2Bucket {
  return {
    async get(key: string, opts?: R2GetOptions) {
      if (key !== 'moscow.pmtiles' && key !== 'index.json') return null;
      const headers = opts?.range instanceof Headers ? opts.range : new Headers();
      const base = {
        size: DATA.length,
        httpEtag: etag,
        writeHttpMetadata: (h: Headers) => h.set('content-type', 'application/octet-stream'),
      };
      if (headers.get('if-none-match') === etag) return base;
      const m = /bytes=(\d+)-(\d*)/.exec(headers.get('range') ?? '');
      if (!m) return { ...base, body: new Blob([DATA]).stream() };
      const offset = Number(m[1]);
      const length = m[2] ? Number(m[2]) - offset + 1 : DATA.length - offset;
      return {
        ...base,
        range: { offset, length },
        body: new Blob([DATA.slice(offset, offset + length)]).stream(),
      };
    },
  } as unknown as R2Bucket;
}

const req = (headers: Record<string, string> = {}, method = 'GET') =>
  new Request('https://veil.test/tiles/x', { method, headers });

describe('tiles function', () => {
  it('serves a byte range with 206', async () => {
    const res = await serve(req({ range: 'bytes=0-6' }), bucket(), 'moscow.pmtiles');
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe(`bytes 0-6/${DATA.length}`);
    expect(res.headers.get('content-length')).toBe('7');
    expect(await res.text()).toBe('PMTiles');
  });

  it('serves the whole file for downloads', async () => {
    const res = await serve(req(), bucket(), 'moscow.pmtiles');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe(String(DATA.length));
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.headers.get('etag')).toBe('"abc"');
  });

  it('answers conditional requests with 304', async () => {
    const res = await serve(req({ 'if-none-match': '"abc"' }), bucket(), 'moscow.pmtiles');
    expect(res.status).toBe(304);
  });

  it('serves only archives and the catalog', async () => {
    for (const key of ['../secret', 'notes.txt', 'a/b.pmtiles', 'Index.json']) {
      expect((await serve(req(), bucket(), key)).status, key).toBe(404);
    }
    expect((await serve(req(), bucket(), 'index.json')).headers.get('cache-control')).toBe(
      'public, max-age=300',
    );
    expect((await serve(req(), bucket(), 'missing.pmtiles')).status).toBe(404);
  });

  it('sends no body for HEAD', async () => {
    const res = await serve(req({}, 'HEAD'), bucket(), 'moscow.pmtiles');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('computes range spans', () => {
    expect(rangeSpan({ offset: 10, length: 5 }, 100)).toEqual([10, 14]);
    expect(rangeSpan({ offset: 90 }, 100)).toEqual([90, 99]);
    expect(rangeSpan({ suffix: 20 }, 100)).toEqual([80, 99]);
  });
});
