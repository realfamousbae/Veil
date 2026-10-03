import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ready = (page: Page) => page.locator('.maplibregl-map[data-ready="true"]');
const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), name);

test.use({ colorScheme: 'light', locale: 'en-US' });

test('follows the system color scheme by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#map=14/55.75/37.62');
  await expect(ready(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('switching theme restyles UI and map without a reload, and persists', async ({ page }) => {
  await page.goto('/#map=14/55.75/37.62');
  await expect(ready(page)).toBeVisible();
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  const surface = await cssVar(page, '--color-surface');
  const mapBefore = await page.locator('.maplibregl-canvas').screenshot();

  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByLabel('Paper').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await expect(ready(page)).toBeVisible();

  expect(await cssVar(page, '--color-surface')).not.toBe(surface);
  expect(await page.locator('.maplibregl-canvas').screenshot()).not.toEqual(mapBefore);
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  await expect(page).toHaveURL(/#map=14\/55\.75\/37\.62$/);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
});

test('switching language changes UI strings and the document language', async ({ page }) => {
  await page.goto('/#map=14/55.75/37.62');
  await expect(ready(page)).toBeVisible();
  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByLabel('Русский').check();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Поиск' })).toBeVisible();
});

test('settings show the app version from package.json', async ({ page }) => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  await page.goto('/#map=14/55.75/37.62');
  await page.getByRole('button', { name: 'Map settings' }).click();
  const label = `Veil · Version ${version}${version.startsWith('0.') ? ' · beta' : ''}`;
  await expect(page.getByText(label, { exact: true })).toBeVisible();
});
