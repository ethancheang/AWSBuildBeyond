import { test, expect } from '@playwright/test';

test('dialogs trap keyboard focus and restore it on Escape', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  const guide = page.getByRole('button', { name: 'Lingo guide', exact: true });
  await guide.click();
  const dialog = page.getByRole('dialog', { name: 'Lingo guide' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Got it' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Got it' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(guide).toBeFocused();
});

test('clicking a stall while the world downloads waits for it safely', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/src/world/scene.ts', async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  await page.locator('[data-li="1"]').click();
  release();
  await expect(
    page.getByRole('button', { name: 'Start taking orders' }),
  ).toBeVisible({ timeout: 25000 });
  expect(errors).toEqual([]);
});

test('context loss falls back to lessons without losing progress', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'hawker-lingo-v1',
      JSON.stringify({
        levels: { drinks: { done: true, stars: 2, best: 540 } },
        sound: false,
      }),
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  await expect(page.locator('#world canvas')).toBeVisible();
  await page
    .locator('#world canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(page.locator('#worldStatus')).toContainText('unavailable');
  await expect(page.locator('#hubStars')).toHaveText('★ 2/9');
  await expect(page.locator('#hubPts')).toHaveText('540 pts');
  await page.locator('[data-li="2"]').click();
  await expect(
    page.getByRole('button', { name: 'Start taking orders' }),
  ).toBeVisible();
});

test('dark mode and reduced motion retain usable lesson controls', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  await page.getByLabel('Skip the walk').check();
  await page.locator('[data-li="0"]').click();
  await page.getByRole('button', { name: 'Start taking orders' }).click();
  await page.locator('#chips .chip[data-term="Kopi"]').click();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('dialog')).toContainText('+100 pts');
  await page.screenshot({
    path: 'test-results/lesson-dark.png',
    fullPage: true,
  });
});

test('Malay retry retains earlier replies and scores once per customer', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  await page.getByLabel('Skip the walk').check();
  await page.locator('[data-li="2"]').click();
  await page.getByRole('button', { name: 'Start taking orders' }).click();
  const reply = async (term) => {
    await page.locator(`#chips .chip[data-term="${term}"]`).click();
    await page.locator('#orderBtn').click();
  };
  await reply('Nasi lemak satu');
  await reply('Sambal asing');
  await expect(page.getByRole('dialog')).toContainText(
    'Your earlier replies are kept',
  );
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('#slots')).toContainText('Nasi lemak satu');
  await reply('Sambal biasa');
  await reply('Makan sini');
  await expect(page.getByRole('dialog')).toContainText('+40 pts');
  await expect(page.locator('#lbScore')).toHaveText('40 pts');
});
