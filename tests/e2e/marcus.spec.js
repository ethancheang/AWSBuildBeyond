import { test, expect } from '@playwright/test';

// Walking to the table is slow on software-rendered CI browsers.
test.describe.configure({ timeout: 180_000 });

async function enter(page, direct = false) {
  await page.goto('/?orders=all');
  await expect(async () => {
    await page.getByRole('button', { name: /Let's makan/ }).click();
    await expect(page.locator('#hub')).toHaveClass(/active/, { timeout: 1000 });
  }).toPass();
  if (!(await page.locator('#hawkerPanel').isVisible()))
    await page.locator('#hawkersToggle').click();
  if (direct) await page.getByLabel('Skip the walk').check();
  else await expect(page.locator('#world canvas')).toBeVisible();
}
const invite = (page) =>
  page.locator('#sheet').getByText('A tissue packet, a saved seat.');
// Walk diagonally from the entrance towards Marcus's table. Slow software-rendered
// browsers cover less ground per second, so with `untilInvite` keep walking until
// the introduction appears instead of stopping after a fixed time.
async function walkToTable(page, { untilInvite = false } = {}) {
  if (await page.locator('#helpPopup').isVisible())
    await page.locator('#closeHelp').click();
  await page.locator('#world canvas').focus();
  await page.keyboard.down('w');
  await page.waitForTimeout(2000);
  await page.keyboard.down('a');
  if (untilInvite) await expect(invite(page)).toBeVisible({ timeout: 20_000 });
  else await page.waitForTimeout(3000);
  await page.keyboard.up('w');
  await page.keyboard.up('a');
}
async function routeMarcus(page, handler) {
  await page.route(
    (url) => !url.host.startsWith('127.0.0.1'),
    async (route) => {
      const body = route.request().postDataJSON?.();
      if (body?.kind !== 'marcus') return route.continue();
      return handler(route, body);
    },
  );
}

test('meet Marcus, scripted conversation, save and journal', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  await page.locator('#meetMarcus').click();
  await expect(invite(page)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Talk to Marcus' }).click();
  const dialog = page.locator('#sheet');
  await expect(dialog).toContainText("Hi, I'm Marcus.");
  for (const q of [
    'Why leave tissues here?',
    'Can I sit here too?',
    'What if someone is already sitting?',
  ])
    await dialog.getByRole('button', { name: q }).click();
  await expect(dialog).toContainText("A packet doesn't give me the right");
  await expect(dialog.locator('.marcus-source')).toHaveCount(4);
  await expect(dialog.locator('.marcus-source').first()).toHaveText(
    'source: scripted',
  );
  await page.screenshot({ path: 'test-results/marcus-encounter.png' });
  await page.getByRole('button', { name: 'Save to People I Met' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'People I Met' }),
  ).toBeVisible();
  await expect(dialog.locator('.marcus-notes li')).toHaveCount(3);
  await dialog.locator('summary').click();
  await page.screenshot({ path: 'test-results/marcus-journal.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#peopleCount')).toHaveText('1');
  await expect(page.locator('#meetMarcus')).toHaveText('Visit Marcus');

  // Practise again keeps notes; clearing resets the journal.
  await page.locator('#peopleBtn').click();
  await dialog.getByRole('button', { name: 'Practise again' }).click();
  await expect(dialog.locator('.marcus-turn')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save to People I Met' }).click();
  await expect(dialog.locator('.marcus-notes li')).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Clear journal' }).click();
  await expect(dialog).toContainText('No one yet');
  expect(errors).toEqual([]);
});

test('walking near the table introduces Marcus once; no reintroduction after dismissal and reload', async ({
  page,
}) => {
  await enter(page);
  await walkToTable(page, { untilInvite: true });
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.locator('#modal')).toBeHidden();

  await page.reload();
  await enter(page);
  await walkToTable(page);
  await page.waitForTimeout(4000);
  await expect(page.locator('#modal')).toBeHidden();
  // An explicit revisit still works.
  await page.locator('#meetMarcus').click();
  await expect(invite(page)).toBeVisible({ timeout: 30_000 });
});

test('live replies are labelled and escaped; failures keep the conversation', async ({
  page,
}) => {
  let fail = false,
    sent;
  await routeMarcus(page, (route, body) => {
    sent = body;
    if (fail) return route.abort();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        reply: '<b>Can!</b> Just ask first.',
        action: 'sharing',
      }),
    });
  });
  await enter(page, true);
  await page.locator('#meetMarcus').click();
  await page.getByRole('button', { name: 'Talk to Marcus' }).click();
  const dialog = page.locator('#sheet');
  await dialog.getByRole('button', { name: 'Why leave tissues here?' }).click();
  await page.locator('#marcusInput').fill('Can I share your table?');
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog).toContainText('<b>Can!</b> Just ask first.');
  await expect(dialog.locator('.marcus-source').last()).toHaveText(
    'source: ai',
  );
  expect(sent.message).toBe('Can I share your table?');
  expect(sent.history.map((h) => h.role)).toEqual([
    'assistant',
    'user',
    'assistant',
  ]);

  fail = true;
  await page.locator('#marcusInput').fill('What if it rains?');
  await page.locator('#marcusInput').press('Enter');
  await expect(dialog.getByRole('alert')).toContainText("couldn't reply");
  await expect(dialog.locator('.marcus-turn')).toHaveCount(5);
  await expect(page.locator('#marcusInput')).toHaveValue('What if it rains?');

  await page.getByRole('button', { name: 'Save to People I Met' }).click();
  await expect(dialog.locator('.marcus-notes li')).toHaveCount(2);
});
