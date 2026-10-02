import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });

test('save a place, keep it across reloads, export, remove and import it back', async ({
  page,
}) => {
  await page.route('https://photon.komoot.io/**', (r) =>
    r.fulfill({
      json: {
        features: [
          {
            geometry: { coordinates: [37.6215, 55.7536] },
            properties: { name: 'Red Square', city: 'Moscow', osm_type: 'W', osm_id: 1 },
          },
        ],
      },
    }),
  );
  await page.goto('/#map=14/55.75/37.62');
  await expect(page.locator('.maplibregl-map[data-ready="true"]')).toBeVisible();
  await expect(page.getByText('Nothing saved yet.', { exact: false })).toBeVisible();

  // Save from the place card.
  const search = page.getByRole('combobox', { name: 'Search' });
  await search.fill('Red Square');
  await page.getByRole('option', { name: /Red Square/ }).click();
  const save = page.getByRole('button', { name: 'Save' });
  await save.click();
  await expect(page.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');

  // Back to the list: it is there, and on the map.
  await page.getByRole('button', { name: 'Clear search' }).click();
  const section = page.getByRole('region', { name: /Saved places/ });
  await expect(section.getByRole('button', { name: /Red Square/ })).toBeVisible();
  await expect(page.locator('.saved-marker[aria-label="Red Square"]')).toBeVisible();

  // Survives a reload (IndexedDB).
  await page.reload();
  await expect(section.getByRole('button', { name: /Red Square/ })).toBeVisible();

  // Export.
  const download = page.waitForEvent('download');
  await section.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^veil-places-\d{4}-\d{2}-\d{2}\.geojson$/);
  const exported = await readFile((await file.path()) ?? '', 'utf8');
  expect(JSON.parse(exported).features[0].properties).toMatchObject({
    name: 'Red Square',
    osm: 'way/1',
  });

  // Remove via the card, then import the backup.
  await section.getByRole('button', { name: /Red Square/ }).click();
  await page.getByRole('button', { name: 'Saved' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByText('Nothing saved yet.', { exact: false })).toBeVisible();

  const chooser = page.waitForEvent('filechooser');
  await section.getByRole('button', { name: 'Import' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'backup.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(exported),
  });
  await expect(page.getByRole('alert')).toContainText('Imported: 1. Already saved: 0.');
  await expect(section.getByRole('button', { name: /Red Square/ })).toBeVisible();
});

test('importing a non-GeoJSON file shows an error', async ({ page }) => {
  await page.goto('/#map=14/55.75/37.62');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'x.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": 1}'),
  });
  await expect(page.getByRole('alert')).toContainText("doesn't look like GeoJSON");
});
