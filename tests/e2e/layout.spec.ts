import { expect, test } from '@playwright/test';

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });

  test('shows a fixed side panel; "/" focuses search, Esc leaves it', async ({ page }) => {
    await page.goto('/#map=14/55.75/37.62');
    const panel = page.locator('.sheet');
    await expect(panel).toBeVisible();
    expect(await panel.boundingBox()).toMatchObject({ x: 0, width: 360 });
    await expect(page.getByRole('button', { name: 'Expand panel' })).toBeHidden();

    const search = page.getByRole('searchbox', { name: 'Search' });
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
