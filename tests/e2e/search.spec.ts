import { expect, test, type Page, type Route } from '@playwright/test';

const PHOTON = 'https://photon.komoot.io';

const feature = (name: string, id: number, coordinates: [number, number] = [37.6215, 55.7536]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties: { name, city: 'Moscow', country: 'Russia', osm_type: 'W', osm_id: id },
});

/** Mocks Photon; returns the list of requested URLs. */
async function mockPhoton(
  page: Page,
  handler: (url: URL, route: Route) => Promise<void> | void = (url, route) =>
    route.fulfill({
      json: {
        features: url.pathname === '/reverse' ? [feature('Here', 9)] : [feature('Red Square', 1)],
      },
    }),
) {
  const urls: URL[] = [];
  await page.route(`${PHOTON}/**`, async (route) => {
    const url = new URL(route.request().url());
    urls.push(url);
    await handler(url, route);
  });
  return urls;
}

async function open(page: Page, hash = '#map=14/55.75/37.62') {
  await page.goto(`/${hash}`);
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
}

const searchbox = (page: Page) => page.getByRole('combobox', { name: 'Search' });

test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });

test('searches as you type with the privacy rules of §5.5', async ({ page }) => {
  const urls = await mockPhoton(page);
  await open(page);

  await searchbox(page).fill('Re');
  await expect(page.getByText('Type at least 3 characters.')).toBeVisible();
  await page.waitForTimeout(500);
  expect(urls).toHaveLength(0);

  await searchbox(page).pressSequentially('d Squ');
  await expect(page.getByRole('option', { name: /Red Square/ })).toBeVisible();
  expect(urls).toHaveLength(1);
  const params = Object.fromEntries(urls[0]?.searchParams ?? []);
  expect(params).toMatchObject({ q: 'Red Squ', lang: 'en', lat: '55.8', lon: '37.6' });

  await searchbox(page).press('ArrowDown');
  await searchbox(page).press('Enter');
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fix in OpenStreetMap' })).toHaveAttribute(
    'href',
    'https://www.openstreetmap.org/edit?way=1',
  );
  await expect(page).toHaveURL(/&place=55\.75360,37\.62150,/);
});

test('"Enter only" and "no bias" settings are respected', async ({ page }) => {
  const urls = await mockPhoton(page);
  await open(page);
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByLabel('Search only when I press Enter').check();
  await page.getByLabel(/Prefer results near the map area/).uncheck();
  await page.keyboard.press('Escape');

  await searchbox(page).fill('Red Square');
  await expect(page.getByText('Press Enter to search.')).toBeVisible();
  await page.waitForTimeout(600);
  expect(urls).toHaveLength(0);

  await searchbox(page).press('Enter');
  await expect(page.getByRole('option', { name: /Red Square/ })).toBeVisible();
  expect(urls).toHaveLength(1);
  expect(urls[0]?.searchParams.has('lat')).toBe(false);
  expect(urls[0]?.searchParams.has('lon')).toBe(false);
});

test('a slow stale response does not overwrite newer results', async ({ page }) => {
  await mockPhoton(page, async (url, route) => {
    const q = url.searchParams.get('q') ?? '';
    if (q === 'slow') await new Promise((r) => setTimeout(r, 1500));
    await route
      .fulfill({ json: { features: [feature(q === 'slow' ? 'Stale' : 'Fresh', q.length)] } })
      .catch(() => {}); // the stale request may already be aborted
  });
  await open(page);
  await searchbox(page).fill('slow');
  await searchbox(page).press('Enter');
  await searchbox(page).fill('fast');
  await searchbox(page).press('Enter');
  await expect(page.getByRole('option', { name: /Fresh/ })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByRole('option', { name: /Stale/ })).toHaveCount(0);
});

test('shows a clear message when the geocoder fails', async ({ page }) => {
  await mockPhoton(page, (_url, route) => route.fulfill({ status: 503 }));
  await open(page);
  await searchbox(page).fill('Red Square');
  await expect(page.getByText('Search is unavailable right now.', { exact: false })).toBeVisible();
});

test('right-click reverse geocodes the clicked point', async ({ page }) => {
  const urls = await mockPhoton(page);
  await open(page);
  await page.locator('.maplibregl-canvas').click({ button: 'right', position: { x: 800, y: 200 } });
  await expect(page.getByRole('heading', { name: 'Here' })).toBeVisible();
  expect(urls.map((u) => u.pathname)).toEqual(['/reverse']);
  expect(urls[0]?.searchParams.get('lat')).toMatch(/^55\.\d{5}$/);
});

test('a shared place link opens without any geocoder request', async ({ page }) => {
  const urls = await mockPhoton(page);
  // "Red Square" in base64url
  await open(page, '#map=16/55.7536/37.6215&place=55.75360,37.62150,UmVkIFNxdWFyZQ');
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();
  await expect(page.locator('.place-marker')).toBeVisible();
  await page.waitForTimeout(500);
  expect(urls).toHaveLength(0);
});

test('Enter over an open place card shows results for the new query', async ({ page }) => {
  await mockPhoton(page, (url, route) =>
    route.fulfill({ json: { features: [feature(url.searchParams.get('q') ?? '', 2)] } }),
  );
  // A card opened from a link, as after reloading a shared place: no results behind it.
  await open(page, '#map=16/55.7536/37.6215&place=55.75360,37.62150,UmVkIFNxdWFyZQ');
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();

  await searchbox(page).fill('Kremlin');
  await searchbox(page).press('Enter');
  await expect(page.getByRole('option', { name: /Kremlin/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Red Square' })).toHaveCount(0);
  await expect(page).not.toHaveURL(/place=/);

  // A picked result's card gives way to the next search the same way.
  await searchbox(page).press('ArrowDown');
  await searchbox(page).press('Enter');
  await expect(page.getByRole('heading', { name: 'Kremlin' })).toBeVisible();
  await searchbox(page).fill('Arbat');
  await searchbox(page).press('Enter');
  await expect(page.getByRole('option', { name: /Arbat/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kremlin' })).toHaveCount(0);
});

test('typing a new query over an open place card shows its results', async ({ page }) => {
  await mockPhoton(page, (url, route) =>
    route.fulfill({ json: { features: [feature(url.searchParams.get('q') ?? '', 2)] } }),
  );
  await open(page, '#map=16/55.7536/37.6215&place=55.75360,37.62150,UmVkIFNxdWFyZQ');
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();

  await searchbox(page).pressSequentially('Kr');
  await expect(page.getByRole('heading', { name: 'Red Square' })).toHaveCount(0);
  await expect(page.getByText('Type at least 3 characters.')).toBeVisible();
  await searchbox(page).pressSequentially('emlin');
  await expect(page.getByRole('option', { name: /Kremlin/ })).toBeVisible();
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('results open the bottom sheet halfway', async ({ page }) => {
    await mockPhoton(page);
    await open(page);
    await searchbox(page).fill('Red Square');
    await expect(page.getByRole('option', { name: /Red Square/ })).toBeVisible();
    await expect(page.locator('.sheet')).toHaveAttribute('data-snap', 'half');
  });

  test('the keyboard search key over a place card shows results', async ({ page }) => {
    await mockPhoton(page, (url, route) =>
      route.fulfill({ json: { features: [feature(url.searchParams.get('q') ?? '', 2)] } }),
    );
    await open(page, '#map=16/55.7536/37.6215&place=55.75360,37.62150,UmVkIFNxdWFyZQ');
    await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();

    await searchbox(page).fill('Kremlin');
    await searchbox(page).press('Enter');
    await expect(page.getByRole('option', { name: /Kremlin/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Red Square' })).toHaveCount(0);
    await expect(searchbox(page)).not.toBeFocused(); // the on-screen keyboard is hidden
    await expect(page.locator('.sheet')).not.toHaveAttribute('data-snap', 'collapsed');
  });
});
