import { test, expect, devices } from '@playwright/test';

// Reduced motion stills the fans and markers, so any change in the 3D view
// means the player (and the camera following them) actually moved.
async function enterHall(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?solo=1');
  await page.getByRole('button', { name: /Let's makan/ }).click();
  await expect(page.locator('#worldStatus')).toBeHidden();
  if (await page.locator('#closeHawkers').isVisible())
    await page.locator('#closeHawkers').click();
}
async function dismissHelp(page) {
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.locator('#helpPopup')).toBeHidden();
  await page.waitForTimeout(800);
}
const view = (page) => page.locator('#world canvas').screenshot();
// Each test loads the software-rendered 3D hall (the computer test twice),
// which takes well over a minute on CI runners.
test.describe.configure({ timeout: 180_000 });
// A spot on the walkway in front of the player.
async function tapFloor(page, tap) {
  const box = await page.locator('#world canvas').boundingBox();
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.62;
  if (tap) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

test.describe('computer', () => {
  test('clicking the floor does not walk, and there is no joystick', async ({
    page,
  }) => {
    await enterHall(page);
    const help = page.getByRole('dialog', { name: 'How to play' });
    await expect(help).toBeVisible();
    await expect(help.getByText('WASD')).toBeVisible();
    await expect(help.getByText('Joystick to move')).toBeHidden();
    await dismissHelp(page);
    await expect(page.locator('#joystick')).toBeHidden();
    const before = await view(page);
    await tapFloor(page, false);
    await page.waitForTimeout(1200);
    expect((await view(page)).equals(before)).toBe(true);

    // Dismissed once, it stays away; the ? button brings it back.
    await page.reload();
    await page.getByRole('button', { name: /Let's makan/ }).click();
    await expect(page.locator('#worldStatus')).toBeHidden();
    await expect(help).toBeHidden();
    await page.getByRole('button', { name: 'How to play' }).click();
    await expect(help).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
  });
});

test.describe('touch screen', () => {
  // Only the viewport, touch and user-agent settings; keep the configured browser.
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
    devices['iPhone 13'];
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });

  test('tapping the floor does not walk; the joystick walks and sprints', async ({
    page,
  }) => {
    await enterHall(page);
    const help = page.getByRole('dialog', { name: 'How to play' });
    await expect(help.getByText('Joystick to move')).toBeVisible();
    await expect(help.getByText('WASD')).toBeHidden();
    await dismissHelp(page);

    const before = await view(page);
    await tapFloor(page, true);
    await page.waitForTimeout(1200);
    expect((await view(page)).equals(before)).toBe(true);

    const stick = page.locator('#joystick');
    await expect(stick).toBeVisible();
    const box = await stick.boundingBox();
    const cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - box.height * 0.2, { steps: 4 });
    await expect(stick).toHaveClass(/active/);
    await expect(stick).not.toHaveClass(/sprinting/);
    await page.waitForTimeout(600);
    expect((await view(page)).equals(before)).toBe(false);

    await page.mouse.move(cx, cy - box.height, { steps: 4 });
    await expect(stick).toHaveClass(/sprinting/);
    await page.mouse.up();
    await expect(stick).not.toHaveClass(/active|sprinting/);
  });
});
