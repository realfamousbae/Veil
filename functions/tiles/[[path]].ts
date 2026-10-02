// Cloudflare Pages Function: serves map archives from the R2 bucket bound as TILES, on the
// site's own origin (/tiles/...). Same origin means no CORS and no extra third party: the
// CSP stays connect-src 'self' plus the geocoder. PMTiles reads tiles with HTTP Range
// requests; region downloads fetch whole files.

interface Env {
  TILES: R2Bucket;
}

/** Only map archives and the region catalog are served. */
const ALLOWED_KEY = /^(?:[a-z0-9-]+\.pmtiles|index\.json)$/;

function cacheControl(key: string): string {
  // Archives are rebuilt under the same name; PMTiles detects changes by ETag.
  return key.endsWith('.json') ? 'public, max-age=300' : 'public, max-age=86400';
}

/** Byte span [start, end] (inclusive) of a returned R2 range. */
export function rangeSpan(range: R2Range, size: number): [number, number] {
  if ('suffix' in range && range.suffix !== undefined) {
    return [Math.max(0, size - range.suffix), size - 1];
  }
  const r = range as { offset?: number; length?: number };
  const start = r.offset ?? 0;
  return [start, r.length !== undefined ? Math.min(size, start + r.length) - 1 : size - 1];
}

export async function serve(request: Request, bucket: R2Bucket, key: string): Promise<Response> {
  if (!ALLOWED_KEY.test(key)) return new Response('Not found', { status: 404 });

  const object = await bucket.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', cacheControl(key));
  headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('content-type')) {
    headers.set(
      'content-type',
      key.endsWith('.json') ? 'application/json' : 'application/octet-stream',
    );
  }

  // A failed precondition returns metadata without a body.
  if (!('body' in object) || !object.body) {
    const status = request.headers.has('if-none-match') ? 304 : 412;
    return new Response(null, { status, headers });
  }

  const body = request.method === 'HEAD' ? null : object.body;
  if (request.headers.has('range') && object.range) {
    const [start, end] = rangeSpan(object.range, object.size);
    headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
    headers.set('content-length', String(end - start + 1));
    return new Response(body, { status: 206, headers });
  }
  headers.set('content-length', String(object.size));
  return new Response(body, { status: 200, headers });
}

export const onRequestGet: PagesFunction<Env> = ({ request, env, params }) => {
  const path = Array.isArray(params['path']) ? params['path'].join('/') : String(params['path']);
  return serve(request, env.TILES, path);
};

export const onRequestHead = onRequestGet;
