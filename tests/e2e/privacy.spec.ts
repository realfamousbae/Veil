// The privacy contract of PRIVACY.md, checked end to end on the production build.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockRouter, ROUTER } from './motis-mock';

const config = JSON.parse(readFileSync('dist/config.json', 'utf8'));
const headersFile = readFileSync('dist/_headers', 'utf8');

/** External origins the config points at: the only third parties allowed. */
function configOrigins(value: unknown): string[] {
  if (typeof value === 'string') return /^https?:\/\//.test(value) ? [new URL(value).origin] : [];
  if (value && typeof value === 'object') return Object.values(value).flatMap(configOrigins);
  return [];
}

/** The production headers for every path ("/*" block of dist/_headers). */
function productionHeaders(): Record<string, string> {
  const block = headersFile.split(/\n(?=\S)/).find((b) => b.startsWith('/*')) ?? '';
  return Object.fromEntries(
    block
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('!')) // "! Name" detaches a host header
      .map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]),
  );
}

// Routes must see every request (a service worker would answer some of them itself).
test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US', serviceWorkers: 'block' });

async function enforceProductionHeaders(page: Page, origin: string) {
  const headers = productionHeaders();
  expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
  await page.route(`${origin}/**`, async (route) => {
    // The CSP takes effect through documents and scripts (incl. workers); everything else
    // (e.g. hundreds of tile range requests) goes straight to the server.
    if (!['document', 'script'].includes(route.request().resourceType())) {
      return route.continue();
    }
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (e) =>
      violations.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
}

test('only allow-listed hosts are contacted, nothing is stored outside the device', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? '').origin;
  const allowed = new Set([origin, ...configOrigins(config)]);
  const requests: URL[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') requests.push(url);
  });

  await enforceProductionHeaders(page, origin);
  const routed = await mockRouter(page);
  await page.route('https://photon.komoot.io/**', (r) =>
    r.fulfill({
      json: {
        features: [
          {
            geometry: { coordinates: [37.6215, 55.7536] },
            properties: { name: 'Red Square', osm_type: 'W', osm_id: 1 },
          },
        ],
      },
    }),
  );

  // Load: no third party at all.
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
  expect(requests.filter((u) => u.origin !== origin)).toEqual([]);

  // Move the map around.
  await page.mouse.move(800, 400);
  await page.mouse.down();
  await page.mouse.move(650, 320, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, -400);
  await page.getByRole('button', { name: 'Zoom out' }).click();

  // Search, open a result, save it.
  const search = page.getByRole('combobox', { name: 'Search' });
  await search.fill('Red Square');
  await page.getByRole('option', { name: /Red Square/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  // Directions: nothing goes to the router until "Build route".
  await page.getByRole('button', { name: 'Directions' }).click();
  await page.getByRole('combobox', { name: 'From' }).fill('Red Square');
  await page.getByRole('option', { name: /Red Square/ }).click();
  await page.waitForTimeout(500);
  expect(routed).toEqual([]);
  await page.getByRole('button', { name: 'Build route' }).click();
  await expect(page.getByRole('button', { name: /Route 1/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();

  // "What's here?"
  await page.keyboard.press('Escape');
  await page.locator('.maplibregl-canvas').click({ button: 'right', position: { x: 800, y: 300 } });
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();

  // Switch theme and language.
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByLabel('Paper').check();
  await page.getByLabel('Русский').check();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // 1. Only allow-listed hosts (§5.1, §5.8).
  const foreign = requests.filter((u) => !allowed.has(u.origin)).map((u) => u.href);
  expect(foreign).toEqual([]);

  // 2. The geocoder got only the query and a rounded bias (§5.5).
  const photon = requests.filter((u) => u.hostname === 'photon.komoot.io');
  expect(photon.length).toBeGreaterThan(0);
  for (const u of photon.filter((p) => p.pathname === '/api')) {
    for (const key of ['lat', 'lon']) {
      const v = u.searchParams.get(key);
      if (v !== null) expect(v, key).toMatch(/^-?\d+(\.\d)?$/);
    }
  }

  // 3. The router got only the two points, rounded to ~10 m, and no credentials (§10).
  expect(routed).toHaveLength(1);
  for (const r of routed) {
    const u = new URL(r.url());
    for (const key of ['fromPlace', 'toPlace'])
      expect(u.searchParams.get(key), key).toMatch(/^-?\d+(\.\d{1,4})?,-?\d+(\.\d{1,4})?$/);
    expect(r.headers()['cookie']).toBeUndefined();
    expect(r.headers()['referer']).toBeUndefined();
  }

  // 4. No cookies, no web storage (§5.3); IndexedDB is fine and stays on the device.
  expect(await page.context().cookies()).toEqual([]);
  expect(
    await page.evaluate(() => ({
      cookie: document.cookie,
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ cookie: '', local: 0, session: 0 });

  // 5. The app works under the production CSP.
  expect(
    await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations),
  ).toEqual([]);
});

test('the production headers are strict', () => {
  const h = productionHeaders();
  expect(h['Referrer-Policy']).toBe('no-referrer');
  // Cloudflare's Network Error Logging would make browsers report to a third-party host.
  expect(headersFile).toMatch(/^\s+! NEL$/m);
  expect(headersFile).toMatch(/^\s+! Report-To$/m);
  expect(h['X-Content-Type-Options']).toBe('nosniff');
  expect(h['Permissions-Policy']).toContain('geolocation=(self)');
  expect(h['Permissions-Policy']).toContain('camera=()');
  const csp = h['Content-Security-Policy'] ?? '';
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  const connect = /connect-src ([^;]+)/.exec(csp)?.[1]?.split(' ') ?? [];
  expect(connect.sort()).toEqual(["'self'", ...new Set(configOrigins(config))].sort());
});

test('the Privacy page names this deployment’s hosts', async ({ page, baseURL }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByRole('button', { name: 'Privacy' }).click();
  const dialog = page.getByRole('dialog', { name: 'Privacy' });
  await expect(dialog).toContainText('no cookies, no analytics');
  await expect(dialog).toContainText(`(${new URL(baseURL ?? '').host})`);
  await expect(dialog).toContainText(`(${new URL(config.geocoder.url).host})`);
  await expect(dialog).toContainText(`(${new URL(ROUTER).host})`);
});

test('a route from "My location" never reveals the position in the URL or to the geocoder', async ({
  browser,
}) => {
  const USER = { latitude: 55.701234, longitude: 37.530156 };
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    serviceWorkers: 'block',
    permissions: ['geolocation'],
    geolocation: USER,
  });
  const page = await context.newPage();
  const routed = await mockRouter(page);
  const photon: URL[] = [];
  await page.route('https://photon.komoot.io/**', (r) => {
    photon.push(new URL(r.request().url()));
    return r.fulfill({
      json: {
        features: [
          { geometry: { coordinates: [37.6215, 55.7536] }, properties: { name: 'Red Square' } },
        ],
      },
    });
  });
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();

  await page.getByRole('combobox', { name: 'Search' }).fill('Red Square');
  await page.getByRole('option', { name: /Red Square/ }).click();
  await page.waitForTimeout(1000); // let the camera settle on the place
  const mapParam = () => page.evaluate(() => /map=([^&]*)/.exec(location.hash)?.[1]);
  const before = await mapParam();

  // Choosing "My location" only marks the start; nothing is sent yet.
  await page.getByRole('button', { name: 'Directions' }).click();
  await page.getByRole('option', { name: 'My location' }).click();
  expect(routed).toEqual([]);
  expect(await page.evaluate(() => location.hash)).toContain('route=walk~me~');

  await page.getByRole('button', { name: 'Build route' }).click();
  await expect(page.getByRole('button', { name: /Route 1/ })).toBeVisible();
  expect(new URL(routed[0]?.url() ?? '').searchParams.get('fromPlace')).toBe('55.7012,37.5302');

  // The map fits the route, but its center (halfway to the destination in the URL, so it
  // would give the start away) stays out of the address.
  await page.waitForTimeout(1500);
  const hash = await page.evaluate(() => location.hash);
  expect(await mapParam()).toBe(before);
  expect(hash).not.toMatch(/55\.70|37\.53/);

  // Nor does the geocoder get it as a location bias.
  await page.keyboard.press('Escape');
  const search = page.getByRole('combobox', { name: 'Search' });
  const sent = photon.length;
  await search.fill('pharmacy');
  await search.press('Enter');
  await expect.poll(() => photon.length).toBeGreaterThan(sent);
  for (const u of photon.slice(sent)) expect(u.searchParams.has('lat')).toBe(false);
  await context.close();
});
