// A stand-in for the MOTIS router of public/config.json, for e2e tests.
import type { Page, Request } from '@playwright/test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('dist/config.json', 'utf8'));
export const ROUTER: string = config.routing.url;

function encode(points: [number, number][], precision = 6): string {
  const factor = 10 ** precision;
  let out = '';
  let prev = [0, 0];
  const num = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const [lng, lat] of points) {
    const cur = [Math.round(lat * factor), Math.round(lng * factor)];
    num((cur[0] ?? 0) - (prev[0] ?? 0));
    num((cur[1] ?? 0) - (prev[1] ?? 0));
    prev = cur;
  }
  return out;
}

const place = (name: string, [lon, lat]: [number, number]) => ({ name, lat, lon });

/** A plan from `from` to `to` ([lng, lat]) for the requested modes. */
function plan(url: URL) {
  const parse = (v: string | null): [number, number] => {
    const [lat = 0, lon = 0] = (v ?? '').split(',').map(Number);
    return [lon, lat];
  };
  const from = parse(url.searchParams.get('fromPlace'));
  const to = parse(url.searchParams.get('toPlace'));
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const t0 = Date.parse('2026-10-04T10:00:00Z');
  const at = (min: number) => new Date(t0 + min * 60_000).toISOString();
  const street = (
    mode: string,
    a: [number, number],
    b: [number, number],
    m0: number,
    m1: number,
  ) => ({
    mode,
    from: place(mode === 'WALK' && m0 === 0 ? 'START' : 'Охотный Ряд', a),
    to: place(m1 === 30 ? 'END' : 'Охотный Ряд', b),
    startTime: at(m0),
    endTime: at(m1),
    distance: 1200,
    legGeometry: { points: encode([a, b]), precision: 6, length: 2 },
    steps: [
      { relativeDirection: 'DEPART', distance: 400, streetName: 'Тверская улица' },
      { relativeDirection: 'LEFT', distance: 800, streetName: 'Моховая улица' },
    ],
  });
  const direct = (url.searchParams.get('directModes') ?? 'WALK').split(',').map((mode) => ({
    duration: 1800,
    startTime: at(0),
    endTime: at(30),
    transfers: 0,
    legs: [street(mode, from, to, 0, 30)],
  }));
  const transit = url.searchParams.get('transitModes') === '';
  const itineraries = transit
    ? []
    : [
        {
          duration: 1500,
          startTime: at(0),
          endTime: at(25),
          transfers: 0,
          legs: [
            street('WALK', from, mid, 0, 6),
            {
              mode: 'SUBWAY',
              from: place('Охотный Ряд', mid),
              to: place('Университет', to),
              startTime: at(7),
              endTime: at(25),
              routeId: 'rail_m1',
              routeColor: 'E42313',
              routeTextColor: 'FFFFFF',
              routeShortName: '1',
              headsign: 'Коммунарка',
              legGeometry: { points: encode([mid, to]), precision: 6, length: 2 },
            },
          ],
        },
      ];
  return { direct, itineraries };
}

/** Answers every router request with a plan; returns the requests it got. */
export async function mockRouter(page: Page): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(`${ROUTER}/**`, (route) => {
    requests.push(route.request());
    return route.fulfill({
      json: plan(new URL(route.request().url())),
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  return requests;
}
