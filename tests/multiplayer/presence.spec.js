import { test, expect } from '@playwright/test';
import { createRelay } from '../../server/relay.js';

let relay;
test.beforeAll(async () => {
  relay = createRelay({ origins: ['http://127.0.0.1:5174'] });
  await new Promise((resolve) => relay.http.listen(8081, '127.0.0.1', resolve));
});
test.afterAll(() => relay.close());

test('two browsers share movement, keep lessons private and remove closed tabs', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const a = await browser.newPage({ viewport: { width: 960, height: 640 } }),
    b = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const sent = [],
    received = [],
    errors = [];
  for (const page of [a, b])
    page.on('pageerror', (e) => errors.push(e.message));
  a.on('websocket', (socket) =>
    socket.on('framesent', ({ payload }) =>
      sent.push(JSON.parse(String(payload))),
    ),
  );
  await a.goto('/?room=test&name=Alice');
  b.on('websocket', (socket) =>
    socket.on('framereceived', ({ payload }) =>
      received.push(JSON.parse(String(payload))),
    ),
  );
  await expect(a.locator('#world canvas')).toBeVisible();
  expect(sent).toHaveLength(0); // title screen does not join
  await b.goto('/?room=test&name=Bob');
  await expect(b.locator('#worldStatus')).toBeHidden();
  await a.locator('#startBtn').click();
  await b.locator('#startBtn').click();
  await expect(b.locator('#multiplayerStatus')).toHaveText(
    'Shared hall · 2 here',
  );
  await a.bringToFront();
  await expect(a.locator('#multiplayerStatus')).toHaveText(
    'Shared hall · 2 here',
  );
  await a.locator('#world canvas').focus();
  await a.keyboard.down('w');
  await a.keyboard.down('Shift');
  await a.keyboard.press('Space');
  await expect
    .poll(() => sent.some((m) => m.type === 'state' && m.y > 0))
    .toBe(true);
  await expect
    .poll(() => sent.some((m) => m.type === 'state' && m.z < 13.5))
    .toBe(true);
  await a.keyboard.up('w');
  await a.keyboard.up('Shift');
  await expect
    .poll(() =>
      received.some((m) => m.type === 'state' && m.name === 'Alice' && m.y > 0),
    )
    .toBe(true);
  if (!(await a.locator('#hawkerPanel').isVisible()))
    await a.locator('#hawkersToggle').click();
  await a.getByLabel('Skip the walk').check();
  await a.locator('[data-li="0"]').click();
  await expect(a.getByRole('button', { name: 'Join the queue' })).toBeVisible();
  await expect.poll(() => sent.at(-1)?.busy).toBe(true);
  const before = sent.length;
  await expect
    .poll(
      () =>
        sent.slice(before).filter((m) => m.type === 'state' && m.busy).length,
      { timeout: 10000 },
    )
    .toBeGreaterThanOrEqual(3);
  await b.bringToFront();
  await expect(b.locator('#multiplayerStatus')).toHaveText(
    'Shared hall · 2 here',
  );
  await expect(b.locator('#hub')).toHaveClass(/active/);
  expect(
    received.some((m) => m.type === 'state' && m.name === 'Alice' && m.busy),
  ).toBe(true);
  await b.screenshot({ path: 'test-results/multiplayer-lesson-presence.png' });
  expect(
    sent
      .filter((m) => m.type === 'state')
      .every((m) => !('lesson' in m) && !('score' in m)),
  ).toBe(true);
  await a.close();
  await expect(b.locator('#multiplayerStatus')).toHaveText(
    'Shared hall · 1 here',
  );
  expect(errors).toEqual([]);
  await b.close();
});

test('different rooms remain isolated', async ({ browser }) => {
  test.setTimeout(120000);
  const a = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const b = await browser.newPage({ viewport: { width: 960, height: 640 } });
  await a.goto('/?room=one');
  await expect(a.locator('#worldStatus')).toBeHidden();
  await b.goto('/?room=two');
  await expect(b.locator('#worldStatus')).toBeHidden();
  await a.locator('#startBtn').click();
  await b.locator('#startBtn').click();
  await expect(a.locator('#multiplayerStatus')).toHaveText(
    'Shared hall · 1 here',
  );
  await expect(b.locator('#multiplayerStatus')).toHaveText(
    'Shared hall · 1 here',
  );
  await a.close();
  await b.close();
});

test('solo opt-out creates no multiplayer socket', async ({ page }) => {
  const connections = [];
  page.on('websocket', (socket) => {
    if (socket.url().includes(':8081')) connections.push(socket.url());
  });
  await page.goto('/?room=test&solo=1');
  await page.locator('#startBtn').click();
  await expect(page.locator('#worldStatus')).toBeHidden();
  await expect(page.locator('#multiplayerStatus')).toBeHidden();
  expect(connections).toEqual([]);
});
