import { expect, test, type Page } from '@playwright/test';
import { mockRouter } from './motis-mock';

test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });

const PLACES: Record<string, { name: string; coordinates: [number, number] }> = {
  red: { name: 'Red Square', coordinates: [37.6215, 55.7536] },
  arbat: { name: 'Arbat Street', coordinates: [37.5915, 55.7494] },
};

async function mockPhoton(page: Page) {
  await page.route('https://photon.komoot.io/**', (r) => {
    const q = new URL(r.request().url()).searchParams.get('q')?.toLowerCase() ?? '';
    const hit = Object.values(PLACES).find((p) => p.name.toLowerCase().startsWith(q.slice(0, 3)));
    return r.fulfill({
      json: {
        features: hit
          ? [{ geometry: { coordinates: hit.coordinates }, properties: { name: hit.name } }]
          : [],
      },
    });
  });
}

async function openDirectionsToRedSquare(page: Page) {
  await page.getByRole('combobox', { name: 'Search' }).fill('Red Square');
  await page.getByRole('option', { name: /Red Square/ }).click();
  await page.getByRole('button', { name: 'Directions' }).click();
}

test('walk, transit and drive between two places, asking the router only on "Build route"', async ({
  page,
}) => {
  await mockPhoton(page);
  const requests = await mockRouter(page);
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();

  await openDirectionsToRedSquare(page);
  await expect(page.getByRole('heading', { name: 'Directions' })).toBeVisible();
  // The search bar gives way to the route form.
  await expect(page.getByRole('combobox', { name: 'Search' })).toBeHidden();
  const from = page.getByRole('combobox', { name: 'From' });
  await expect(from).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'To' })).toHaveValue('Red Square');
  await expect(page.getByRole('button', { name: 'Build route' })).toBeDisabled();

  await from.fill('Arbat');
  await page.getByRole('option', { name: /Arbat Street/ }).click();
  await expect(from).toHaveValue('Arbat Street');
  expect(requests).toEqual([]);

  // Walk.
  await page.getByRole('button', { name: 'Build route' }).click();
  await expect(page.getByRole('button', { name: /Route 1: 30 min/ })).toBeVisible();
  expect(requests).toHaveLength(1);
  const walk = new URL(requests[0]?.url() ?? '');
  expect(walk.searchParams.get('directModes')).toBe('WALK');
  expect(walk.searchParams.get('fromPlace')).toBe('55.7494,37.5915');
  expect(walk.searchParams.get('toPlace')).toBe('55.7536,37.6215');
  await expect(page.getByText('Walk to the destination')).toBeVisible();
  await page.getByText('Steps', { exact: true }).last().click();
  await expect(page.getByText('Turn left: Моховая улица')).toBeVisible();

  // Changing the mode drops the old result and waits for "Build route" again.
  await page.getByLabel('Transit').check();
  await expect(page.getByRole('button', { name: /Route 1/ })).toBeHidden();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Build route' }).click();
  await expect(page.getByRole('button', { name: /Route 1: 25 min/ })).toBeVisible();
  await expect(page.getByText('Metro 1 ≈')).toBeVisible();
  await expect(page.getByText('towards Коммунарка')).toBeVisible();
  await expect(page.getByText(/estimated: there is no exact timetable/)).toBeVisible();
  expect(new URL(requests[1]?.url() ?? '').searchParams.has('transitModes')).toBe(false);

  // Drive; the form lives in the URL fragment.
  await page.getByLabel('Drive').check();
  await page.getByRole('button', { name: 'Build route' }).click();
  await expect(page.getByText('Drive to the destination')).toBeVisible();
  expect(new URL(requests[2]?.url() ?? '').searchParams.get('directModes')).toBe('CAR');
  expect(await page.evaluate(() => location.hash)).toMatch(
    /route=car~55\.74940,37\.59150,[\w-]+~55\.75360,37\.62150,[\w-]+/,
  );

  // Swap the ends.
  await page.getByRole('button', { name: 'Swap start and destination' }).click();
  await expect(from).toHaveValue('Red Square');

  // Escape closes directions and brings the card and the search bar back.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Directions' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search' })).toBeVisible();
  expect(await page.evaluate(() => location.hash)).not.toContain('route=');
});

test('a link to a route fills in the form without asking the router', async ({ page }) => {
  const requests = await mockRouter(page);
  await page.goto(
    '/#map=14/55.75/37.62&route=transit~55.74940,37.59150,QXJiYXQ~55.75360,37.62150,UmVk',
  );
  await expect(page.getByRole('heading', { name: 'Directions' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'From' })).toHaveValue('Arbat');
  await expect(page.getByRole('combobox', { name: 'To' })).toHaveValue('Red');
  await expect(page.getByLabel('Transit')).toBeChecked();
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);

  await page.getByRole('button', { name: 'Build route' }).click();
  await expect(page.getByRole('button', { name: /Route 1/ }).first()).toBeVisible();
  expect(requests).toHaveLength(1);
});
