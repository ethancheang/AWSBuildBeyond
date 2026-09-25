import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`full-screen world, branded typography and overlay controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Kopi That!/);
    await expect(page.locator('#title h1')).toHaveCSS(
      'font-family',
      '"Permanent Marker", cursive',
    );
    await expect(page.locator('body')).toHaveCSS(
      'font-family',
      'Outfit, system-ui, sans-serif',
    );
    await page.getByRole('button', { name: /Let's makan/ }).click();
    const canvas = page.locator('#world canvas');
    await expect(canvas).toBeVisible();
    await expect(page.locator('#worldStatus')).toBeHidden();
    await expect(page.locator('#followViewBtn')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const browserSize = await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).fontSize);
    await expect(page.locator('body')).toHaveCSS('font-size', browserSize);
    await expect(page.locator('.side-intro')).toHaveCSS(
      'font-size',
      browserSize,
    );
    await expect(page.locator('#followViewBtn')).toHaveCSS(
      'font-size',
      browserSize,
    );
    expect(await canvas.boundingBox()).toEqual({
      x: 0,
      y: 0,
      width,
      height: 900,
    });
    if (width < 1000) await page.locator('#hawkersToggle').click();
    await expect(page.locator('#lessonList button')).toHaveCount(3);
    await page.locator('.neighbours summary').click();
    await expect(page.locator('#placeholderList li')).toHaveCount(5);
    await expect(page.locator('#placeholderList')).toContainText(
      'Prata of Gold',
    );
    await expect(page.locator('#placeholderList')).toContainText('Seoul Shiok');
    await expect(
      page.locator('#placeholderList button, #placeholderList a'),
    ).toHaveCount(0);
    await page.locator('#closeHawkers').click();
    await expect(page.locator('#hawkerPanel')).toBeHidden();
    await expect(page.locator('#hawkersToggle')).toBeFocused();
    await page.locator('#floorViewBtn').click();
    await expect(page.locator('#floorViewBtn')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.screenshot({ path: `test-results/floor-plan-${width}.png` });
    await page.locator('#cameraBtn').click();
    await expect(page.locator('#followViewBtn')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    if (width > 1000) await page.locator('#hawkersToggle').click();
    await page.screenshot({ path: `test-results/kopi-that-${width}.png` });
    // A larger inherited root size represents a user's preferred browser size.
    await page.addStyleTag({ content: 'html { font-size: 20px; }' });
    await expect(page.locator('body')).toHaveCSS('font-size', '20px');
    await expect(page.locator('#followViewBtn')).toHaveCSS('font-size', '20px');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
