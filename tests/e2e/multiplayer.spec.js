import { test, expect } from '@playwright/test';

test('solo mode makes no multiplayer connection and still completes an order', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.config.configFile.includes('multiplayer'),
    'Use the multiplayer config.',
  );
  const connections = [];
  page.on('websocket', (socket) => {
    if (socket.url().includes(':8081')) connections.push(socket.url());
  });
  await page.goto('http://127.0.0.1:5180/?solo=1');
  await page.locator('#startBtn').click();
  await expect(page.locator('#world canvas')).toBeVisible();
  if (!(await page.locator('#hawkerPanel').isVisible()))
    await page.locator('#hawkersToggle').click();
  await page.getByLabel('Skip the walk').check();
  await page.locator('[data-li="0"]').click();
  await page.getByRole('button', { name: 'Join the queue' }).click();
  await page
    .locator('#chips .chip')
    .filter({ has: page.locator('span', { hasText: /^Kopi$/ }) })
    .click();
  await page.locator('#orderBtn').click();
  await expect(page.getByRole('dialog')).toContainText('+100 pts');
  expect(connections).toEqual([]);
});

test('two players share movement and lesson presence, with isolated rooms and clean disconnect', async ({
  browser,
}, testInfo) => {
  test.skip(
    !testInfo.config.configFile.includes('multiplayer'),
    'Use the multiplayer config to start the relay.',
  );
  test.setTimeout(120000);
  const context = await browser.newContext({
    viewport: { width: 960, height: 720 },
  });
  await context.addInitScript(() => {
    window.drawnNames = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.drawnNames.push(text);
      return original.call(this, text, ...args);
    };
  });
  const a = await context.newPage();
  const b = await context.newPage();
  const c = await context.newPage();
  const errors = [],
    incoming = [],
    otherRoom = [],
    sent = [];
  for (const page of [a, b, c])
    page.on('pageerror', (e) => errors.push(e.message));
  function messages(page, received, outgoing = []) {
    page.on('websocket', (ws) => {
      if (!ws.url().includes(':8081')) return;
      ws.on('framereceived', ({ payload }) =>
        received.push(JSON.parse(String(payload))),
      );
      ws.on('framesent', ({ payload }) =>
        outgoing.push(JSON.parse(String(payload))),
      );
    });
  }
  messages(a, [], sent);
  messages(b, incoming);
  messages(c, otherRoom);
  async function enter(page, name, room = 'test') {
    await page.bringToFront();
    await page.goto(`http://127.0.0.1:5180/?room=${room}&name=${name}`);
    await page.locator('#startBtn').click();
    await expect(page.locator('#world canvas')).toBeVisible();
  }
  await enter(a, 'Alice');
  await enter(b, 'Bob');
  await enter(c, 'Other', 'isolated');
  await b.bringToFront();
  expect(errors).toEqual([]);
  await expect.poll(() => incoming.some((m) => m.name === 'Alice')).toBe(true);
  await expect
    .poll(() => b.evaluate(() => window.drawnNames.includes('Alice')))
    .toBe(true);
  const first = incoming.find((m) => m.name === 'Alice');
  await a.bringToFront();
  await a.locator('#world canvas').focus();
  await a.keyboard.down('w');
  await a.keyboard.down('Shift');
  await a.waitForTimeout(700);
  await a.keyboard.press('Space');
  await a.waitForTimeout(500);
  await a.keyboard.up('w');
  await a.keyboard.up('Shift');
  await expect
    .poll(() =>
      incoming.some(
        (m) =>
          m.name === 'Alice' && Math.hypot(m.x - first.x, m.z - first.z) > 0.2,
      ),
    )
    .toBe(true);
  await expect
    .poll(() => incoming.some((m) => m.name === 'Alice' && m.y > 0))
    .toBe(true);
  await b.bringToFront();
  await b.waitForTimeout(500);
  await b.screenshot({ path: 'test-results/multiplayer-two-players.png' });
  await a.bringToFront();
  if (!(await a.locator('#hawkerPanel').isVisible()))
    await a.locator('#hawkersToggle').click();
  await a.getByLabel('Skip the walk').check();
  await a.locator('[data-li="0"]').click();
  await a.getByRole('button', { name: 'Join the queue' }).click();
  await expect
    .poll(() => incoming.some((m) => m.name === 'Alice' && m.busy))
    .toBe(true);
  const busyCount = incoming.filter((m) => m.name === 'Alice' && m.busy).length;
  await expect
    .poll(() => incoming.filter((m) => m.name === 'Alice' && m.busy).length, {
      timeout: 5000,
    })
    .toBeGreaterThan(busyCount);
  await b.bringToFront();
  await b.waitForTimeout(500);
  await b.screenshot({ path: 'test-results/multiplayer-lesson-presence.png' });
  expect(otherRoom.some((m) => m.name === 'Alice' || m.name === 'Bob')).toBe(
    false,
  );
  expect(sent.some((m) => m.busy && !m.m)).toBe(true);
  await a.close();
  await expect
    .poll(() => incoming.some((m) => m.type === 'leave' && m.id === first.id))
    .toBe(true);
  expect(errors).toEqual([]);
  await context.close();
});
