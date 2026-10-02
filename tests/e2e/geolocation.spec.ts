import { expect, test, type Page } from '@playwright/test';

const USER = { latitude: 55.7012, longitude: 37.5301 };

/** Counts every Geolocation API and geolocation permission query call made by the page. */
async function spyOnGeolocation(page: Page) {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { geoCalls: string[] }).geoCalls = calls;
    const geo = navigator.geolocation;
    for (const name of ['getCurrentPosition', 'watchPosition', 'clearWatch'] as const) {
      const original = geo[name].bind(geo) as (...args: unknown[]) => unknown;
      Object.defineProperty(geo, name, {
        value: (...args: unknown[]) => {
          calls.push(name);
          return original(...args);
        },
      });
    }
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (desc: PermissionDescriptor) => {
      if (desc.name === 'geolocation') calls.push('permissions.query');
      return query(desc);
    };
  });
  return () => page.evaluate(() => (window as unknown as { geoCalls: string[] }).geoCalls);
}

test.use({
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
  permissions: ['geolocation'],
  geolocation: USER,
});

test('no Geolocation API call happens without a click on "Where am I"', async ({ page }) => {
  const calls = await spyOnGeolocation(page);
  await page.route('https://photon.komoot.io/**', (r) => r.fulfill({ json: { features: [] } }));
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();

  // Use the app without the button: search, zoom, settings, theme, drag.
  await page.getByRole('combobox', { name: 'Search' }).fill('Red Square');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByLabel('Dark').check();
  await page.keyboard.press('Escape');
  await page.mouse.move(800, 400);
  await page.mouse.down();
  await page.mouse.move(700, 350, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  expect(await calls()).toEqual([]);
});

test('locate → follow → stop, without the position ever reaching the URL or geocoder', async ({
  page,
}) => {
  const calls = await spyOnGeolocation(page);
  const photon: URL[] = [];
  await page.route('https://photon.komoot.io/**', (r) => {
    photon.push(new URL(r.request().url()));
    return r.fulfill({ json: { features: [] } });
  });
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();

  await page.getByRole('button', { name: 'Show my location' }).click();
  await expect(page.getByRole('img', { name: 'Your location' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Follow my location' })).toBeVisible();
  expect(await calls()).toEqual(['getCurrentPosition']);

  // The camera is on the user now: the URL keeps the previous view, and search has no bias.
  await page.waitForTimeout(1500);
  expect(page.url()).toContain('#map=14/55.75/37.62');
  expect(page.url()).not.toContain('55.70');
  await page.getByRole('combobox', { name: 'Search' }).fill('pharmacy');
  await page.getByRole('combobox', { name: 'Search' }).press('Enter');
  await expect.poll(() => photon.length).toBe(1);
  expect(photon[0]?.searchParams.has('lat')).toBe(false);

  await page.getByRole('button', { name: 'Follow my location' }).click();
  await expect(page.getByRole('button', { name: 'Stop following' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await calls()).toEqual(['getCurrentPosition', 'watchPosition']);

  // Dragging the map leaves follow mode and stops watching.
  await page.mouse.move(800, 400);
  await page.mouse.down();
  await page.mouse.move(600, 300, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Follow my location' })).toBeVisible();
  expect(await calls()).toEqual(['getCurrentPosition', 'watchPosition', 'clearWatch']);
});

test('a denied permission shows a clear message', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', permissions: [] });
  const page = await context.newPage();
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Show my location' }).click();
  await expect(page.getByRole('alert')).toContainText('Location access is blocked');
  await context.close();
});
