import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });

test('manifest is installable and all icons exist', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifestUrl = new URL(href ?? '', page.url());
  const manifest = await (await request.get(manifestUrl.href)).json();
  expect(manifest).toMatchObject({ name: 'Veil', display: 'standalone', start_url: './' });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, manifestUrl).href);
    expect(res.ok(), icon.src).toBe(true);
    expect(res.headers()['content-type']).toBe('image/png');
  }
  // No third-party URL anywhere in the manifest.
  expect(JSON.stringify(manifest)).not.toMatch(/https?:\/\//);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
});

test('theme-color follows the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1c1f24');
});

test('the app shell opens offline after the first visit', async ({ page, context }) => {
  await page.goto('/#map=14/55.75/37.62');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Wait until the service worker controls the page (after precaching).
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Search' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Map settings' })).toBeVisible();
  await context.setOffline(false);
});

test('Back closes the place card and keeps the app open', async ({ page }) => {
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
  await page.goto('/#map=14/55.75/37.62');
  await page.getByRole('combobox', { name: 'Search' }).fill('Red Square');
  await page.getByRole('option', { name: /Red Square/ }).click();
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeHidden();
  await expect(page.getByRole('option', { name: /Red Square/ })).toBeVisible();
  expect(page.url()).toContain('localhost');
  expect(page.url()).not.toContain('place=');

  // Closing with the button also removes the extra history entry.
  await page.getByRole('option', { name: /Red Square/ }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByRole('heading', { name: 'Red Square' })).toBeHidden();
  expect(await page.evaluate(() => history.state?.['veil-card'] ?? false)).toBe(false);
});
