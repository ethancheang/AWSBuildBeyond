import { test, expect } from '@playwright/test';
import { LEVELS } from '../../src/content/lessons.ts';

async function enter(page, direct = true) {
  await page.goto('/');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  if (direct) await page.getByLabel('Skip the walk').check();
}
async function choose(page, terms) {
  for (const term of terms)
    await page
      .locator('#chips .chip')
      .filter({
        has: page.locator('span', { hasText: new RegExp(`^${term}$`) }),
      })
      .click();
  await page.locator('#orderBtn').click();
}

test('3D hall renders, routes to a stall and opens the original lesson', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page, false);
  await expect(page.locator('#world canvas')).toBeVisible();
  await expect(page.locator('#worldStatus')).toBeHidden();
  await page.screenshot({
    path: 'test-results/hawker-centre-desktop.png',
    fullPage: true,
  });
  await page.locator('[data-li="0"]').click();
  await expect(
    page.getByRole('button', { name: 'Start taking orders' }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Start taking orders' }).click();
  await choose(page, ['Kopi']);
  await expect(page.getByRole('dialog')).toContainText('+100 pts');
  expect(errors).toEqual([]);
});

test('all eighteen customers, Malay turns, graduation and progress survive reload', async ({
  page,
}) => {
  test.slow();
  await enter(page);
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    await page.locator(`[data-li="${i}"]`).click();
    await page.getByRole('button', { name: 'Start taking orders' }).click();
    for (let j = 0; j < level.prompts.length; j++) {
      const prompt = level.prompts[j];
      if (level.kind === 'nasi') {
        for (const stage of prompt.stages) await choose(page, stage.a);
        await expect(page.getByRole('dialog')).toContainText('+100 pts');
        await page
          .getByRole('button', { name: 'Terima kasih — Thank you' })
          .click();
      } else {
        await choose(page, prompt.a);
        await expect(page.getByRole('dialog')).toContainText('+100 pts');
        await page
          .getByRole('button', {
            name: j === 5 ? 'Finish lesson' : 'Next customer',
            exact: true,
          })
          .click();
      }
    }
    await expect(page.getByRole('dialog')).toContainText(
      '6/6 perfect first-try orders',
    );
    await page.getByRole('button', { name: 'Back to the centre' }).click();
  }
  await expect(page.locator('#hubStars')).toHaveText('★ 9/9');
  await expect(page.locator('#hubPts')).toHaveText('1800 pts');
  await expect(page.locator('#gradBanner')).toContainText('Hawker regular');
  await page.reload();
  await page.getByRole('button', { name: /Let's makan/ }).click();
  await expect(page.locator('#hubStars')).toHaveText('★ 9/9');
  await page
    .getByRole('button', { name: 'Reset progress', exact: true })
    .click();
  await page.getByRole('button', { name: 'Keep progress' }).click();
  await expect(page.locator('#hubStars')).toHaveText('★ 9/9');
  await page
    .getByRole('button', { name: 'Reset progress', exact: true })
    .click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#hubStars')).toHaveText('★ 0/9');
});

test('retry, hint, undo, clearing chips, glossary and sound remain available', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await expect(
    page.getByRole('button', { name: 'Enable sound' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-li="0"]').click();
  await page.getByRole('button', { name: 'Start taking orders' }).click();
  await choose(page, ['Teh']);
  await expect(page.getByRole('dialog')).toContainText('Aiyo, not quite!');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.locator('#chips .chip[data-term="Kopi"]').click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('#orderBtn')).toBeDisabled();
  await page.getByRole('button', { name: 'Hint' }).click();
  await choose(page, ['Kopi']);
  await expect(page.getByRole('dialog')).toContainText('+40 pts');
  await page
    .getByRole('button', { name: 'Next customer', exact: true })
    .click();
  await page.locator('#chips .chip[data-term="Teh"]').click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('#orderBtn')).toBeDisabled();
  await page.getByRole('button', { name: 'Lingo guide', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sambal asing');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('mobile layout supports direct lessons with no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await expect(page.locator('#world canvas')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/hawker-centre-mobile.png',
    fullPage: true,
  });
  await page.locator('[data-li="2"]').click();
  await page.getByRole('button', { name: 'Start taking orders' }).click();
  await choose(page, ['Kak', 'Satu nasi lemak']);
  await expect(page.locator('#npcBubble')).toContainText('Sambal macam mana?');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('WebGL failure keeps every lesson accessible', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl2' || type === 'webgl') return null;
      return getContext.call(this, type, ...args);
    };
  });
  await enter(page, false);
  await expect(page.locator('#worldStatus')).toContainText('unavailable');
  await page.locator('[data-li="1"]').click();
  await expect(
    page.getByRole('button', { name: 'Start taking orders' }),
  ).toBeVisible();
});
