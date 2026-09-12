// Exact WM002 accepted keyboard journey copied for cross-sprint save/load regression; assertions retained.
import { expect, type Page } from "@playwright/test";
const root = "evidence/wm-003/captures";
const state = (page: Page) =>
  page.evaluate(() => window.__WM_DEBUG__!.getState());
async function until(page: Page, axis: "x" | "z", position: number) {
  await page.waitForFunction(
    ({ axis, position }) =>
      window.__WM_DEBUG__!.getState().position[axis] >= position,
    { axis, position },
    { timeout: 20000 },
  );
}
async function stage(page: Page, n: number) {
  await page.waitForFunction(
    (n) => window.__WM_DEBUG__!.getState().skyline.stage === n,
    n,
    { timeout: 15000 },
  );
}
async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${root}/${name}.png` });
}
async function look(page: Page, dx: number, dy: number) {
  const before = await state(page);
  const canvas = page.locator("#game-canvas");
  await canvas.dispatchEvent("mousedown", {
    clientX: 600,
    clientY: 380,
    button: 0,
    buttons: 1,
    bubbles: true,
  });
  for (let step = 1; step <= 8; step++) {
    await page
      .locator("body")
      .dispatchEvent("mousemove", {
        clientX: 600 + (dx * step) / 8,
        clientY: 380 + (dy * step) / 8,
        buttons: 1,
        bubbles: true,
      });
    await page.waitForTimeout(20);
  }
  await page
    .locator("body")
    .dispatchEvent("mouseup", {
      clientX: 600 + dx,
      clientY: 380 + dy,
      button: 0,
      bubbles: true,
    });
  await page.waitForTimeout(100);
  const after = await state(page);
  if (dx)
    expect(Math.abs(after.cameraAlpha - before.cameraAlpha)).toBeGreaterThan(1);
  if (dy) expect(after.cameraBeta).toBeGreaterThan(before.cameraBeta + 0.2);
}
export async function legacyKeyboardRoute(page: Page, captures = true) {
  await look(page, 0, 170); // Raise aim using the ordinary mouse-look path.
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await until(page, "z", 21);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  if (captures) await shot(page, "keyboard-hand-origin-web");
  await until(page, "z", 37);
  await page.keyboard.up("e");
  if (captures) await shot(page, "keyboard-release-momentum");
  await stage(page, 1);
  if (captures) await shot(page, "keyboard-first-landing");
  await until(page, "z", 53);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await until(page, "z", 76.5);
  await page.keyboard.up("e");
  await stage(page, 2);
  await until(page, "z", 95);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await until(page, "z", 122);
  await page.keyboard.up("e");
  await until(page, "z", 123.2);
  await page.keyboard.down("e");
  await page.waitForFunction(
    () => window.__WM_DEBUG__!.getState().swing.web?.anchorId === "ring-4",
  );
  if (captures) await shot(page, "keyboard-midair-reattachment");
  await until(page, "z", 152);
  await page.keyboard.up("e");
  await stage(page, 3);
  await until(page, "z", 166);
  await page.keyboard.up("w");
  await page.waitForTimeout(600);
  await look(page, Math.PI / 2 / 0.0035, 0); // Face the right-turn ring with mouse look.
  await page.keyboard.down("w");
  await until(page, "x", 5);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await until(page, "x", 20);
  await page.keyboard.up("e");
  await stage(page, 4);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(850);
  expect((await state(page)).skyline).toMatchObject({
    stage: 4,
    completed: true,
    completions: 1,
    valid: true,
  });
  expect((await state(page)).swing.web).toBeNull();
  expect((await state(page)).safe).toBe(true);
  if (captures) await shot(page, "keyboard-route-complete");
}
