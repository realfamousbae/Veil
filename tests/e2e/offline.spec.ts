import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1000, height: 700 }, locale: 'en-US' });

const REGION = 'Moscow (center, dev sample)';
const HIDE_UI =
  '.search-slot, .sheet, .corner, .no-detail, .notice { visibility: hidden !important; }';

/** PNG size of the map canvas: a blank map compresses to a few KB, a drawn one doesn't. */
async function mapBytes(page: Page, hash: string): Promise<number> {
  const map = page.locator('.maplibregl-map');
  const before = Number(await map.getAttribute('data-idle'));
  await page.evaluate((h) => (location.hash = h), hash);
  // Wait for the map to settle after this move.
  await expect
    .poll(async () => Number(await map.getAttribute('data-idle')))
    .toBeGreaterThan(before);
  await expect(map).toHaveAttribute('data-ready', 'true');
  // Measure the map alone, without the glass UI floating over it.
  return (await page.locator('.maplibregl-canvas').screenshot({ mask: [], style: HIDE_UI })).length;
}

test('a downloaded region works in airplane mode at any zoom', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
  await page.reload(); // let the service worker take control
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // Download the region.
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByRole('button', { name: 'Offline maps…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Offline maps' });
  const item = dialog.getByRole('listitem').filter({ hasText: REGION });
  await item.getByRole('button', { name: 'Download' }).click();
  await expect(item.getByText('Downloaded')).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');

  // Airplane mode.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();

  const blank = await mapBytes(page, '#map=14/59.94/30.31'); // St Petersburg: not downloaded
  for (const zoom of [10, 13, 15, 17]) {
    const drawn = await mapBytes(page, `#map=${zoom}/55.75/37.62`);
    expect(drawn, `zoom ${zoom}`).toBeGreaterThan(blank * 5);
  }
  await context.setOffline(false);

  // Delete it again.
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByRole('button', { name: 'Offline maps…' }).click();
  await item.getByRole('button', { name: 'Delete' }).click();
  await expect(item.getByRole('button', { name: 'Download' })).toBeVisible();
  const files = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('regions', { create: true });
    const names: string[] = [];
    for await (const name of (dir as unknown as { keys(): AsyncIterable<string> }).keys())
      names.push(name);
    return names;
  });
  expect(files).toEqual([]);
});

test('an interrupted download can be resumed', async ({ page, context }) => {
  test.setTimeout(60_000);
  // Break the first full-file download request (map tile reads use Range requests).
  let broken = false;
  await context.route('**/dev/moscow-center.pmtiles', async (route) => {
    const range = route.request().headers()['range'];
    if (!range && !broken) {
      broken = true;
      return route.abort('connectionreset');
    }
    return route.continue();
  });
  await page.goto('/#map=14/55.75/37.62');
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByRole('button', { name: 'Offline maps…' }).click();
  const item = page
    .getByRole('dialog', { name: 'Offline maps' })
    .getByRole('listitem')
    .filter({ hasText: REGION });

  await item.getByRole('button', { name: 'Download' }).click();
  await expect(item.getByRole('alert')).toContainText('The download was interrupted');
  expect(broken).toBe(true);

  await item.getByRole('button', { name: 'Resume' }).click();
  await expect(item.getByText('Downloaded')).toBeVisible({ timeout: 30_000 });
  await expect(item.getByRole('alert')).toHaveCount(0);
});

test('the "no detailed map" hint shows only outside regions', async ({ page }) => {
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
  await expect(page.getByText('No detailed map for this area yet.')).toBeHidden();
  await page.evaluate(() => (location.hash = '#map=14/59.94/30.31'));
  await expect(page.getByText('No detailed map for this area yet.')).toBeVisible();
});
