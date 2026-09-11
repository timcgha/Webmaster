import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

declare global {
  interface Window {
    __setTestGamepad?: (patch: { id?: string; connected?: boolean; axes?: number[]; pressed?: number[] }) => void;
  }
}

async function ready(page: Page): Promise<void> {
  await page.goto("/?test=1");
  await expect(page.locator("#loading")).toHaveClass(/hidden/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
}

async function newGameWithMouse(page: Page, slot: 1 | 2 | 3 = 1, difficulty: "Easy" | "Normal" | "Hard" = "Normal"): Promise<void> {
  await page.getByRole("button", { name: /New Game/ }).click();
  await page.getByRole("button", { name: new RegExp(`Slot ${slot}`) }).click();
  await page.getByRole("button", { name: new RegExp(difficulty) }).click();
  if (await page.getByRole("heading", { name: new RegExp(`Replace slot ${slot}`) }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Replace and start/ }).click();
  }
  await expect(page.locator("#input-overlay")).toBeVisible();
}

async function hold(page: Page, keys: string[], milliseconds: number): Promise<void> {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  await page.waitForTimeout(100);
}

async function state(page: Page): Promise<any> {
  return page.evaluate(() => window.__WM_DEBUG__!.getState());
}

async function saveBytes(page: Page, slot = 1): Promise<Record<string, string>> {
  return page.evaluate((selectedSlot) =>
    Object.fromEntries(
      Object.entries(localStorage)
        .filter(([key]) => key.startsWith(`webmaster.save.v1.slot${selectedSlot}.`))
        .sort(([left], [right]) => left.localeCompare(right)),
    ), slot);
}

async function activeSavePayload(page: Page, slot: 1 | 2 | 3, kind: "manual" | "checkpoint"): Promise<any> {
  return page.evaluate(({ selectedSlot, selectedKind }) => {
    const base = `webmaster.save.v1.slot${selectedSlot}.${selectedKind}`;
    const pointer = localStorage.getItem(`${base}.pointer`);
    if (pointer !== "a" && pointer !== "b") return null;
    return JSON.parse(localStorage.getItem(`${base}.${pointer}`)!).payload;
  }, { selectedSlot: slot, selectedKind: kind });
}

async function expectInViewport(page: Page, selector: string): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}

async function installGamepad(page: Page, id = "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)"): Promise<void> {
  await page.addInitScript((initialId) => {
    let config = { id: initialId, connected: true, axes: [0, 0, 0, 0], pressed: [] as number[] };
    window.__setTestGamepad = (patch) => {
      config = { ...config, ...patch };
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => {
        if (!config.connected) return [null, null, null, null];
        return [
          {
            id: config.id,
            index: 0,
            connected: true,
            mapping: "standard",
            timestamp: performance.now(),
            axes: config.axes,
            buttons: Array.from({ length: 17 }, (_, index) => ({
              pressed: config.pressed.includes(index),
              touched: config.pressed.includes(index),
              value: config.pressed.includes(index) ? 1 : 0,
            })),
            vibrationActuator: null,
            hapticActuators: [],
          },
          null,
          null,
          null,
        ];
      },
    });
  }, id);
}

async function setPad(page: Page, patch: { id?: string; connected?: boolean; axes?: number[]; pressed?: number[] }): Promise<void> {
  await page.evaluate((value) => window.__setTestGamepad!(value), patch);
  await page.waitForTimeout(120);
}

async function tapPad(page: Page, button: number): Promise<void> {
  await setPad(page, { pressed: [button] });
  await setPad(page, { pressed: [] });
}

test.describe("WM-001 rendered keyboard and mouse journey", () => {
  test("moves, jumps, orbits, recenters, collides, pauses safely, and completes the real practice route", async ({ page, browserName }) => {
    await ready(page);
    await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-main-1280x720.png` });
    await newGameWithMouse(page, 1, "Normal");
    const start = await state(page);
    await hold(page, ["w", "Shift"], 850);
    const moved = await state(page);
    expect(moved.position.z).toBeGreaterThan(start.position.z + 3);

    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    expect((await state(page)).position.y).toBeGreaterThan(0.1);
    await page.waitForTimeout(900);
    expect((await state(page)).grounded).toBe(true);

    const canvas = page.locator("#game-canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(
      await page.evaluate(
        ({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.id,
        { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
      ),
    ).toBe("game-canvas");
    await page.evaluate(() => {
      (window as any).__wmMouseEvidence = { down: 0, move: 0, up: 0 };
      window.addEventListener("mousedown", () => ((window as any).__wmMouseEvidence.down += 1));
      window.addEventListener("mousemove", () => ((window as any).__wmMouseEvidence.move += 1));
      window.addEventListener("mouseup", () => ((window as any).__wmMouseEvidence.up += 1));
    });
    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;
    await canvas.dispatchEvent("mousedown", { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true });
    for (let step = 1; step <= 8; step += 1) {
      await page.locator("body").dispatchEvent("mousemove", {
        clientX: startX + (150 * step) / 8,
        clientY: startY - (45 * step) / 8,
        buttons: 1,
        bubbles: true,
      });
      await page.waitForTimeout(20);
    }
    await page.locator("body").dispatchEvent("mouseup", { clientX: startX + 150, clientY: startY - 45, button: 0, bubbles: true });
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as any).__wmMouseEvidence)).toMatchObject({ down: 1, up: 1 });
    expect((await page.evaluate(() => window.__WM_DEBUG__!.getInputDebug())).lookXTotal).toBeGreaterThan(100);
    const orbited = await state(page);
    expect(Math.abs(orbited.cameraAlpha + Math.PI / 2)).toBeGreaterThan(0.15);
    await page.keyboard.press("r");
    await page.waitForTimeout(100);
    const recentered = await state(page);
    expect(recentered.cameraAlpha).toBeCloseTo(-Math.PI / 2, 2);

    await canvas.dispatchEvent("mousedown", { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true });
    await page.locator("body").dispatchEvent("mousemove", {
      clientX: startX - 900,
      clientY: startY,
      buttons: 1,
      bubbles: true,
    });
    await page.locator("body").dispatchEvent("mouseup", { clientX: startX - 900, clientY: startY, button: 0, bubbles: true });
    await page.waitForTimeout(150);
    expect((await state(page)).cameraAlpha).toBeCloseTo(Math.PI / 2, 1);
    await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-hero-front-ordinary-camera.png` });
    await page.keyboard.press("r");
    await page.waitForTimeout(100);

    await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: -4.5, y: 0, z: -3 }, "collision approach only"));
    await hold(page, ["w"], 900);
    const blocked = await state(page);
    expect(blocked.position.z).toBeLessThan(-2.05);

    await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 0, y: 0, z: -8 }, "route start only"));
    await hold(page, ["w", "Shift"], 1250);
    expect((await state(page)).progress).toBeGreaterThanOrEqual(1);
    await hold(page, ["w", "d", "Shift"], 1350);
    expect((await state(page)).progress).toBeGreaterThanOrEqual(2);
    await hold(page, ["a", "Shift"], 1300);
    await page.keyboard.down("w");
    await page.keyboard.down("Shift");
    await expect.poll(async () => (await state(page)).progress, { timeout: 4_000, intervals: [50] }).toBe(3);
    await page.keyboard.up("Shift");
    await page.keyboard.up("w");
    await page.waitForTimeout(100);
    expect((await state(page)).progress).toBe(3);
    expect((await state(page)).grounded).toBe(true);
    await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-route-complete.png` });

    await page.keyboard.down("w");
    await page.waitForTimeout(180);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    const pausePosition = (await state(page)).position;
    await page.waitForTimeout(500);
    expect((await state(page)).position).toEqual(pausePosition);
    await page.keyboard.up("w");
    await page.getByRole("button", { name: /Resume/ }).click();
    await page.waitForTimeout(1200);
    expect((await state(page)).position).toEqual(pausePosition);
    await hold(page, ["w"], 250);
    expect((await state(page)).position.z).not.toBe(pausePosition.z);
  });

  test("recovers from a fall, reduces health, and performs a clean zero-health retry", async ({ page, browserName }) => {
    await ready(page);
    await newGameWithMouse(page, 2, "Easy");
    for (let fall = 0; fall < 3; fall += 1) {
      await page.evaluate((index) => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -11, z: 0 }, `fall setup ${index + 1}/4`), fall);
      await page.waitForTimeout(800);
    }
    expect((await state(page)).health).toBe(25);
    await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -11, z: 0 }, "fall setup 4/4"));
    await page.waitForTimeout(800);
    expect((await state(page)).health).toBe(100);
    await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-recovery-fixture-labelled.png` });
  });

  test("explains and enforces safe-state saving while airborne", async ({ page, browserName }) => {
    await ready(page);
    await newGameWithMouse(page, 1, "Easy");
    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    expect((await state(page)).grounded).toBe(false);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    for (const name of [/^Save Game/, /^Save & Quit/]) {
      const button = page.getByRole("button", { name });
      await expect(button).toBeDisabled();
      await expect(button).toContainText("Unavailable while airborne or recovering");
    }
    await expect(page.getByRole("button", { name: /^Resume/ })).toBeEnabled();
    await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-airborne-safe-save-disabled.png` });
  });
});

test.describe("WM-001 rendered simulated Gamepad journey", () => {
  test.beforeEach(async ({ page }) => installGamepad(page));

  test("uses gamepad alone for new game, movement, camera, pause, save, save-and-quit, Continue, and Load", async ({ page, browserName }) => {
    await ready(page);
    await setPad(page, { pressed: [] });
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.locator("#input-overlay")).toBeVisible();
    expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun()?.difficulty)).toBe("Normal");

    const beforeMove = await state(page);
    await setPad(page, { axes: [0, -1, 0, 0] });
    await page.waitForTimeout(750);
    await setPad(page, { axes: [0, 0, 0, 0] });
    expect((await state(page)).position.z).toBeGreaterThan(beforeMove.position.z + 2);
    const cameraBefore = (await state(page)).cameraAlpha;
    await setPad(page, { axes: [0, 0, 0.8, -0.5] });
    await page.waitForTimeout(900);
    await setPad(page, { axes: [0, 0, 0, 0] });
    expect((await state(page)).cameraAlpha).not.toBe(cameraBefore);
    await tapPad(page, 10);

    await tapPad(page, 9);
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
    await tapPad(page, 13);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();

    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.locator("#input-overlay")).toBeVisible();
    await tapPad(page, 9);
    await tapPad(page, 13);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
    await tapPad(page, 13);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "Load a run" })).toBeVisible();
    await tapPad(page, 0);
    await expect(page.locator("#input-overlay")).toBeVisible();
    await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-simulated-xbox-route.png` });
  });

  test("disconnect releases motion and reconnect requires neutral then fresh input", async ({ page }) => {
    await ready(page);
    await setPad(page, { pressed: [] });
    await tapPad(page, 0);
    await tapPad(page, 0);
    await tapPad(page, 0);
    await expect(page.locator("#input-overlay")).toBeVisible();
    await setPad(page, { axes: [0, -1, 0, 0] });
    await page.waitForTimeout(250);
    await setPad(page, { connected: false });
    const disconnectedAt = (await state(page)).position;
    await page.waitForTimeout(350);
    expect((await state(page)).position).toEqual(disconnectedAt);
    await setPad(page, { connected: true, axes: [0, -1, 0, 0] });
    await page.waitForTimeout(350);
    expect((await state(page)).position).toEqual(disconnectedAt);
    await setPad(page, { axes: [0, 0, 0, 0] });
    await setPad(page, { axes: [0, -1, 0, 0] });
    await page.waitForTimeout(300);
    expect((await state(page)).position.z).toBeGreaterThan(disconnectedAt.z);
  });

  test("shows PlayStation-style prompts without changing standard semantic actions", async ({ page }) => {
    await ready(page);
    await setPad(page, { id: "DualSense Wireless Controller", axes: [0, 0, 0, 0], pressed: [] });
    await setPad(page, { axes: [0, 0, 0, 0], pressed: [] });
    await page.waitForTimeout(200);
    await tapPad(page, 0);
    await expect(page.getByText(/Options Pause/)).toBeVisible();
  });

  test("operates persisted main and pause settings without mouse or typing", async ({ page }) => {
    await ready(page);
    await setPad(page, { pressed: [] });
    await tapPad(page, 13);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await tapPad(page, 15);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("webmaster.settings.v1")!))).toEqual({
      cameraSensitivity: 1.1,
      invertY: true,
      adaptiveQuality: false,
    });

    await tapPad(page, 0);
    await tapPad(page, 0);
    await tapPad(page, 0);
    await expect(page.locator("#input-overlay")).toBeVisible();
    await tapPad(page, 9);
    for (let step = 0; step < 4; step += 1) await tapPad(page, 13);
    await tapPad(page, 0);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await tapPad(page, 1);
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  });
});

test("keeps occupied-slot bytes unchanged when replacement is cancelled", async ({ page, browserName }) => {
  await ready(page);
  await newGameWithMouse(page, 1, "Easy");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Save & Quit/ }).click();
  await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  const before = await saveBytes(page);
  await page.getByRole("button", { name: /New Game/ }).click();
  await page.getByRole("button", { name: /Slot 1/ }).click();
  await page.getByRole("button", { name: /Hard/ }).click();
  await expect(page.getByRole("heading", { name: "Replace slot 1?" })).toBeVisible();
  await page.getByRole("button", { name: /^Cancel/ }).click();
  await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  expect(await saveBytes(page)).toEqual(before);
  await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-overwrite-cancel-preserves-slot.png` });
});

test("keeps the prior committed save and remains paused when Save & Quit write fails", async ({ page, browserName }) => {
  await ready(page);
  await newGameWithMouse(page, 1, "Normal");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Save Game/ }).click();
  await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  const before = await saveBytes(page);
  await page.evaluate(() => {
    const nativeSetItem = Storage.prototype.setItem;
    (window as any).__wmNativeSetItem = nativeSetItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected quota failure", "QuotaExceededError");
      nativeSetItem.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: /^Save & Quit/ }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.locator("#toast-layer")).toContainText("Saving is unavailable");
  expect(await saveBytes(page)).toEqual(before);
  await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-failed-save-stays-paused.png` });
});

test("loads only the prior commit after pointer verification fails, then permits a clean retry", async ({ page }) => {
  await ready(page);
  await newGameWithMouse(page, 1, "Normal");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Save Game/ }).click();
  await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  const committedPosition = (await state(page)).position;

  await page.getByRole("button", { name: /^Resume/ }).click();
  await hold(page, ["w"], 650);
  const stagedPosition = (await state(page)).position;
  expect(stagedPosition.z).toBeGreaterThan(committedPosition.z + 1);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const pointerKey = "webmaster.save.v1.slot1.manual.pointer";
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    let failPointerReadback = false;
    Storage.prototype.setItem = function (key: string, value: string): void {
      nativeSetItem.call(this, key, value);
      if (key === pointerKey && value === "b") failPointerReadback = true;
    };
    Storage.prototype.getItem = function (key: string): string | null {
      if (key === pointerKey && failPointerReadback) {
        failPointerReadback = false;
        throw new DOMException("Injected pointer readback failure", "UnknownError");
      }
      return nativeGetItem.call(this, key);
    };
  });
  await page.getByRole("button", { name: /^Save Game/ }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.locator("#toast-layer")).toContainText("previous save was preserved");
  expect(
    await page.evaluate(() => ({
      pointer: localStorage.getItem("webmaster.save.v1.slot1.manual.pointer"),
      pending: localStorage.getItem("webmaster.save.v1.slot1.manual.pending"),
    })),
  ).toMatchObject({ pointer: "b", pending: expect.any(String) });

  await ready(page);
  await page.getByRole("button", { name: /^Load/ }).click();
  await page.getByRole("button", { name: /Slot 1 • Manual/ }).click();
  await expect(page.locator("#input-overlay")).toBeVisible();
  const restored = await state(page);
  expect(restored.position.x).toBeCloseTo(committedPosition.x, 2);
  expect(restored.position.z).toBeCloseTo(committedPosition.z, 2);
  expect(restored.position.z).not.toBeCloseTo(stagedPosition.z, 1);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Save Game/ }).click();
  await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  expect(await page.evaluate(() => localStorage.getItem("webmaster.save.v1.slot1.manual.pending"))).toBeNull();
  await page.getByRole("button", { name: /^Save & Quit/ }).click();
  await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator("#input-overlay")).toBeVisible();
});

test("renders storage-unavailable records explicitly and refuses destructive replacement", async ({ page, browserName }) => {
  await page.addInitScript(() => {
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.getItem = function (key: string): string | null {
      if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected unavailable storage", "SecurityError");
      return nativeGetItem.call(this, key);
    };
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected unavailable storage", "SecurityError");
      nativeSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key: string): void {
      if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected unavailable storage", "SecurityError");
      nativeRemoveItem.call(this, key);
    };
  });
  await ready(page);
  await page.getByRole("button", { name: /^Load/ }).click();
  await expect(page.getByRole("button", { name: /Slot 1 • Manual/ })).toContainText("unavailable");
  await page.getByRole("button", { name: /^Back/ }).click();
  await page.getByRole("button", { name: /New Game/ }).click();
  await page.getByRole("button", { name: /Slot 1/ }).click();
  await page.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByRole("heading", { name: "Replace slot 1?" })).toBeVisible();
  await page.getByRole("button", { name: /Replace and start/ }).click();
  await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  await expect(page.locator("#toast-layer")).toContainText("Existing data was restored");
  await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-storage-unavailable-explicit.png` });
});

test("remains controllable under a second real-time CPU/frame profile", async ({ page, context, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "Chromium CDP supplies the explicit second rendered timing profile.");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 2 });
  await ready(page);
  await newGameWithMouse(page, 2, "Normal");
  const before = await state(page);
  await hold(page, ["w"], 1_200);
  const after = await state(page);
  expect(after.position.z).toBeGreaterThan(before.position.z + 3);
  expect(after.position.z).toBeLessThan(before.position.z + 8);
  expect(after.grounded).toBe(true);
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  expect((await state(page)).position.y).toBeGreaterThan(0.1);
  await page.waitForTimeout(1_000);
  expect((await state(page)).grounded).toBe(true);
  await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-second-timing-profile.png` });
  await writeFile(
    testInfo.outputPath("second-timing-profile.json"),
    JSON.stringify({ engine: "Chromium CDP", cpuThrottlingRate: 2, start: before.position, finish: after.position }, null, 2),
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
});

test("persists a Hard run after closing and reopening the same browser profile and exact origin", async ({ playwright, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "Persistent-profile close/reopen evidence is captured on Chromium; WebKit receives ordinary rendered coverage.");
  const userDataDir = testInfo.outputPath("persistent-profile");
  const persistentOptions = {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ...(process.env.WM_CHROMIUM_PATH ? { executablePath: process.env.WM_CHROMIUM_PATH } : {}),
  };
  let context = await playwright.chromium.launchPersistentContext(userDataDir, persistentOptions);
  let page = await context.newPage();
  await ready(page);
  await newGameWithMouse(page, 3, "Hard");
  await hold(page, ["w", "Shift"], 1_350);
  expect((await state(page)).progress).toBe(1);
  const savedPosition = (await state(page)).position;
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Save Game/ }).click();
  await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  const savedPayload = await activeSavePayload(page, 3, "manual");
  expect(savedPayload).toMatchObject({
    schemaVersion: 1,
    slot: 3,
    difficulty: "Hard",
    health: 100,
    maxHealth: 100,
    checkpoint: { x: 0, y: 0, z: 1.2 },
    progress: 1,
    progressLabel: "Reach the golden sun pad",
    costumeId: "skyline-teal",
    completion: false,
  });
  await context.close();

  context = await playwright.chromium.launchPersistentContext(userDataDir, persistentOptions);
  page = await context.newPage();
  await ready(page);
  await expect(page.getByRole("button", { name: /Continue/ })).toContainText("Hard");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator("#input-overlay")).toBeVisible();
  const restored = await state(page);
  expect(restored.position.x).toBeCloseTo(savedPosition.x, 2);
  expect(restored.position.z).toBeCloseTo(savedPosition.z, 2);
  expect(restored).toMatchObject({ health: 100, progress: 1, progressLabel: "Reach the golden sun pad", grounded: true });
  expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun())).toEqual({ slot: 3, difficulty: "Hard" });
  expect(await activeSavePayload(page, 3, "manual")).toEqual(savedPayload);
  await page.screenshot({ path: "evidence/wm-001/captures/chromium-persistent-reopen.png" });
  await context.close();
});

test("labels corrupt and incompatible save fixtures without hiding valid choices", async ({ page, browserName }) => {
  await page.addInitScript(() => {
    localStorage.setItem("webmaster.save.v1.slot1.manual.a", "{not-json");
    localStorage.setItem("webmaster.save.v1.slot2.checkpoint.a", JSON.stringify({ format: "webmaster-save", schemaVersion: 99 }));
  });
  await ready(page);
  await page.getByRole("button", { name: /^Load/ }).click();
  await expect(page.getByRole("button", { name: /Slot 1 • Manual/ })).toContainText("damaged");
  await expect(page.getByRole("button", { name: /Slot 2 • Checkpoint/ })).toContainText("incompatible");
  await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-invalid-save-fixtures.png` });
});

test("keeps the rendered HUD and menus usable at 1920x1080 and representative iPad landscape", async ({ page, browserName }) => {
  if (browserName === "chromium") await page.setViewportSize({ width: 1920, height: 1080 });
  await ready(page);
  await expectInViewport(page, ".menu-panel");
  await newGameWithMouse(page, 1, "Easy");
  for (const selector of [".objective-card", ".health-card"]) await expectInViewport(page, selector);
  await page.waitForTimeout(2200);
  const samples = await page.evaluate(() => window.__WM_DEBUG__!.performance());
  expect(samples.samples.length).toBeGreaterThanOrEqual(1);
  expect(samples.minimum).toBeGreaterThanOrEqual(30);
  const suffix = browserName === "chromium" ? "1920x1080" : "1194x834-ipad-landscape";
  await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-${suffix}.png` });
  if (browserName === "chromium") {
    await page.setViewportSize({ width: 1194, height: 834 });
    for (const selector of [".objective-card", ".health-card", "#input-overlay"]) await expectInViewport(page, selector);
    await page.screenshot({ path: "evidence/wm-001/captures/chromium-1194x834-representative-ipad-layout-not-safari.png" });
  }
  await writeFile(
    `evidence/wm-001/captures/${browserName}-performance-samples.json`,
    JSON.stringify({ viewport: browserName === "chromium" ? [1920, 1080] : [1194, 834], samples, limitation: "Headless Linux software-rendering observation; not a physical Windows or iPad measurement." }, null, 2),
  );
});
