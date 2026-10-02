// Writes dist/_headers (Cloudflare Pages) from dist/config.json, so the CSP allows exactly
// the external hosts the runtime config points at (PRIVACY.md §7). Runs after every build
// and again at deploy time, after the production config is swapped in.
import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);

/** Origins of all absolute http(s) URLs in the config. */
export function externalOrigins(config) {
  const urls = [];
  const walk = (v) => {
    if (typeof v === 'string' && /^https?:\/\//.test(v)) urls.push(new URL(v).origin);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(config);
  return [...new Set(urls)].sort();
}

export function buildHeaders(config) {
  const connect = ["'self'", ...externalOrigins(config)].join(' ');
  const csp = [
    "default-src 'self'",
    `connect-src ${connect}`,
    "img-src 'self' data: blob:",
    // MapLibre falls back to a blob: worker where module workers are unsupported.
    "worker-src 'self' blob:",
    // No 'unsafe-inline': Svelte's styles are extracted to CSS files, and inline styles
    // set from JS (style: directives, MapLibre) go through CSSOM, which CSP allows.
    "style-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  return `/*
  Content-Security-Policy: ${csp}
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(self), camera=(), microphone=(), browsing-topics=(), interest-cohort=()
  X-Content-Type-Options: nosniff
  Cross-Origin-Opener-Policy: same-origin

/sw.js
  Cache-Control: no-cache

/config.json
  Cache-Control: no-cache
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(await readFile(new URL('config.json', dist), 'utf8'));
  await writeFile(new URL('_headers', dist), buildHeaders(config));
  console.log(`dist/_headers: connect-src 'self' ${externalOrigins(config).join(' ')}`);
}
