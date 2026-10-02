import { expect, test } from '@playwright/test';

test('map renders from same-origin resources only, without errors', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    if (url.origin !== origin) foreign.push(req.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();

  await expect(page.getByRole('link', { name: '© OpenStreetMap' })).toBeVisible();
  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

test('map state is kept in the URL hash', async ({ page }) => {
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page).toHaveURL(/#map=15\/55\.75\/37\.62$/);
});
