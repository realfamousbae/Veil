import { expect, test } from '@playwright/test';

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });

  test('shows a floating side panel; "/" focuses search, Esc leaves it', async ({ page }) => {
    await page.goto('/#map=14/55.75/37.62');
    const panel = page.locator('.sheet');
    await expect(panel).toBeVisible();
    expect(await panel.boundingBox()).toMatchObject({ x: 16, width: 380 });
    await expect(page.getByRole('button', { name: 'Expand panel' })).toBeHidden();

    const search = page.getByRole('combobox', { name: 'Search' });
    await page.locator('body').press('/');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(search).not.toBeFocused();
  });
});

test.describe('phone', () => {
  // Phone-sized Chromium (the iPhone preset would switch the browser to WebKit).
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    locale: 'en-US',
  });

  test('bottom sheet moves between three positions', async ({ page }) => {
    await page.goto('/#map=14/55.75/37.62');
    const sheet = page.locator('.sheet');
    const handle = page.getByRole('button', { name: /(Expand|Collapse) panel/ });

    await expect(sheet).toHaveAttribute('data-snap', 'collapsed');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');

    await handle.click();
    await expect(sheet).toHaveAttribute('data-snap', 'half');
    await handle.press('ArrowUp');
    await expect(sheet).toHaveAttribute('data-snap', 'full');
    await handle.press('ArrowDown');
    await expect(sheet).toHaveAttribute('data-snap', 'half');

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveAttribute('data-snap', 'collapsed');
  });

  test('map controls and attribution stay above the collapsed sheet', async ({ page }) => {
    await page.goto('/#map=14/55.75/37.62');
    await page.waitForTimeout(300); // let the sheet settle
    const sheetTop = (await page.locator('.sheet .handle').boundingBox())?.y ?? 0;
    for (const name of ['Zoom out', '© OpenStreetMap']) {
      const box = await page
        .getByRole(name.startsWith('©') ? 'link' : 'button', { name })
        .boundingBox();
      expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThanOrEqual(sheetTop);
    }
  });
});

test.describe('phone, focus in the sheet', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
  });

  test('focusing a control below the fold never scrolls the app, it expands the sheet', async ({
    page,
  }) => {
    const features = Array.from({ length: 10 }, (_, i) => ({
      geometry: { coordinates: [37.62 + i / 1000, 55.75] },
      properties: { name: `Cafe ${i + 1}`, street: 'Tverskaya', city: 'Moscow' },
    }));
    await page.route('https://photon.komoot.io/**', (r) => r.fulfill({ json: { features } }));
    await page.goto('/#map=14/55.75/37.62');
    const search = page.getByRole('combobox', { name: 'Search' });
    await search.fill('cafe');
    await search.press('Enter');
    const sheet = page.locator('.sheet');
    await expect(sheet).toHaveAttribute('data-snap', 'half');
    await page.waitForTimeout(400); // let the sheet settle

    // The last result is laid out below the screen while the sheet is half open.
    const last = page.getByRole('option', { name: /Cafe 10/ });
    await expect(last).not.toBeInViewport();
    await last.focus();

    expect(await page.locator('.shell').evaluate((el) => el.scrollTop)).toBe(0);
    await expect(sheet).toHaveAttribute('data-snap', 'full');
    await expect(last).toBeInViewport();
  });
});
