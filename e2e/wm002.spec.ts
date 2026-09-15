import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const root = process.env.WM_EVIDENCE_ROOT ? `${process.env.WM_EVIDENCE_ROOT}/wm002` : "evidence/wm-002/captures";
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
async function start(page: Page) {
  await page.goto("/?test=1");
  await expect(page.locator("#loading")).toHaveClass(/hidden/, {
    timeout: 30000,
  });
  await page.getByRole("button", { name: /New Game/ }).click();
  await page.getByRole("button", { name: /Slot 1/ }).click();
  await page.getByRole("button", { name: /Normal/ }).click();
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
async function keyboardRoute(page: Page, captures = true) {
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
test("WM-002 keyboard continuous four-gap route, safe save and same-origin reopen", async ({
  playwright,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Exact browser-profile close/reopen is captured on Chromium, as in WM-001.");
  test.setTimeout(100000);
  const profile = testInfo.outputPath("skyline-persistent-profile");
  const options = {
    headless: true,
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: testInfo.outputPath("persistent-video") },
    ...(process.env.WM_CHROMIUM_PATH ? { executablePath: process.env.WM_CHROMIUM_PATH } : {}),
  };
  let context = await playwright.chromium.launchPersistentContext(profile, options);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await start(page);
  await keyboardRoute(page);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Save Game/ }).click();
  const before = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(([k]) =>
        k.startsWith("webmaster.save"),
      ),
    ),
  );
  const saved = await state(page);
  await context.close();
  context = await playwright.chromium.launchPersistentContext(profile, options);
  const reopened = await context.newPage();
  reopened.on("pageerror", (e) => errors.push(String(e)));
  await reopened.goto("/?test=1");
  await expect(reopened.locator("#loading")).toHaveClass(/hidden/);
  await reopened.getByRole("button", { name: /Continue/ }).click();
  const loaded = await state(reopened);
  expect(loaded.skyline.completed).toBe(true);
  expect(loaded.skyline.stage).toBe(4);
  expect(loaded.swing.web).toBeNull();
  expect(loaded.velocity).toEqual({ x: 0, y: 0, z: 0 });
  expect(loaded.grounded).toBe(true);
  expect(
    await reopened.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage).filter(([k]) =>
          k.startsWith("webmaster.save"),
        ),
      ),
    ),
  ).toEqual(before);
  await shot(reopened, "keyboard-saved-return");
  await writeFile(
    `${root}/keyboard-continuous-route.json`,
    JSON.stringify(
      {
        source:
          "ordinary menu plus keyboard/mouse only; no fixture positioning; entire persistent browser context closed and reopened at exact same origin/profile",
        saved,
        loaded,
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  await context.close();
});

async function installPad(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__wm002pad = {
      id: "DualSense Wireless Controller",
      connected: true,
      axes: [0, 0, 0, 0],
      pressed: [],
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => {
        const p = w.__wm002pad;
        return p.connected
          ? [
              {
                id: p.id,
                index: 0,
                connected: true,
                mapping: "standard",
                timestamp: performance.now(),
                axes: p.axes,
                buttons: Array.from({ length: 17 }, (_, i) => ({
                  pressed: p.pressed.includes(i),
                  value: p.pressed.includes(i) ? 1 : 0,
                  touched: p.pressed.includes(i),
                })),
              },
              null,
              null,
              null,
            ]
          : [];
      },
    });
  });
}
async function pad(
  page: Page,
  pressed: number[] = [],
  axes: number[] = [0, 0, 0, 0],
) {
  await page.evaluate(
    ({ pressed, axes }) =>
      Object.assign((window as any).__wm002pad, { pressed, axes }),
    { pressed, axes },
  );
}
async function padReady(page: Page) {
  await page.waitForFunction(
    () =>
      window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
      "CONTROLLER_READY",
  );
}
async function tap(page: Page, button: number) {
  await pad(page, [button]);
  await page.waitForTimeout(90);
  await pad(page);
  await page.waitForTimeout(155);
  await padReady(page);
}
async function controllerStart(page: Page) {
  await installPad(page);
  await page.goto("/?test=1");
  await expect(page.locator("#loading")).toHaveClass(/hidden/, {
    timeout: 30000,
  });
  await pad(page, [0]);
  await page.waitForTimeout(100);
  await expect
    .poll(async () =>
      page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus().lifecycle),
    )
    .toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
  await pad(page);
  await padReady(page);
  await tap(page, 0);
  await expect(
    page.getByRole("heading", { name: "Choose a save slot" }),
  ).toBeVisible();
  await tap(page, 0);
  await tap(page, 13);
  await tap(page, 0);
  await expect(page.locator("#input-overlay")).toBeVisible();
  await padReady(page);
}
async function controllerRoute(page: Page) {
  await pad(page, [], [0, 0, 0, 1]);
  await page.waitForFunction(
    () => window.__WM_DEBUG__!.getState().cameraBeta >= 1.6,
  );
  await pad(page);
  await pad(page, [7], [0, -1, 0, 0]);
  await until(page, "z", 21);
  await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  await page.waitForTimeout(70);
  await pad(page, [7, 6], [0, -1, 0, 0]);
  await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  await shot(page, "controller-ready-hand-web");
  await until(page, "z", 37);
  await pad(page, [7], [0, -1, 0, 0]);
  await stage(page, 1);
  await until(page, "z", 53);
  await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  await page.waitForTimeout(70);
  await pad(page, [7, 6], [0, -1, 0, 0]);
  await until(page, "z", 76.5);
  await pad(page, [7], [0, -1, 0, 0]);
  await stage(page, 2);
  await until(page, "z", 95);
  await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  await page.waitForTimeout(70);
  await pad(page, [7, 6], [0, -1, 0, 0]);
  await until(page, "z", 122);
  await pad(page, [7], [0, -1, 0, 0]);
  await until(page, "z", 123.2);
  await pad(page, [7, 6], [0, -1, 0, 0]);
  await page.waitForFunction(
    () => window.__WM_DEBUG__!.getState().swing.web?.anchorId === "ring-4",
  );
  await shot(page, "controller-midair-reattachment");
  await until(page, "z", 152);
  await pad(page, [7], [0, -1, 0, 0]);
  await stage(page, 3);
  await until(page, "z", 166);
  await pad(page);
  await page.waitForTimeout(650);
  await pad(page, [], [0, 0, 1, 0]);
  await page.waitForFunction(
    () => window.__WM_DEBUG__!.getState().cameraAlpha <= -Math.PI + 0.035,
  );
  await pad(page);
  await pad(page, [7], [0, -1, 0, 0]);
  await until(page, "x", 5);
  await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  await page.waitForTimeout(70);
  await pad(page, [7, 6], [0, -1, 0, 0]);
  await until(page, "x", 20);
  await pad(page, [7], [0, -1, 0, 0]);
  await stage(page, 4);
  await pad(page);
  await page.waitForTimeout(850);
  expect((await state(page)).skyline).toMatchObject({
    stage: 4,
    completed: true,
    completions: 1,
    valid: true,
  });
  expect((await state(page)).safe).toBe(true);
  await shot(page, "controller-route-complete");
}
test("WM-002 simulated PlayStation controller-only complete route and safe save/load", async ({
  page,
}) => {
  test.setTimeout(100000);
  await controllerStart(page);
  await controllerRoute(page);
  await tap(page, 9);
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await tap(page, 13);
  await tap(page, 0);
  await expect(page.locator("#toast-layer")).toContainText("Save confirmed.");
  await tap(page, 13);
  await tap(page, 13);
  await tap(page, 0);
  await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  await tap(page, 13);
  await tap(page, 0);
  const loaded = await state(page);
  expect(loaded.skyline.completed).toBe(true);
  expect(loaded.velocity).toEqual({ x: 0, y: 0, z: 0 });
  expect(loaded.swing.web).toBeNull();
  // The complete route and menus above used only the simulated controller. Confirm keyboard fallback separately.
  await page.keyboard.down("d");
  await page.waitForTimeout(300);
  await page.keyboard.up("d");
  expect((await state(page)).position.x).toBeGreaterThan(loaded.position.x + 0.1);
  await writeFile(
    `${root}/controller-continuous-route.json`,
    JSON.stringify(
      {
        evidence: "SIMULATED_GAMEPAD_ONLY, not physical compatibility",
        loaded,
      },
      null,
      2,
    ),
  );
});

test("WM-002 targeted anchor, unsafe save, pause, focus, fall recovery, invalid finish and replay cleanup", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await look(page, 0, 170);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await until(page, "z", 20);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(400);
  expect((await state(page)).swing.targetId).toBe("ring-1");
  await shot(page, "targeted-anchor");
  await page.keyboard.down("e");
  await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  expect((await state(page)).safe).toBe(false);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^Save & Quit/ }),
  ).toBeDisabled();
  await shot(page, "save-unavailable-while-attached");
  const paused = await state(page);
  await page.waitForTimeout(250);
  expect((await state(page)).position).toEqual(paused.position);
  await page.getByRole("button", { name: /Resume/ }).click();
  await page.waitForTimeout(200);
  expect((await state(page)).swing.web).toBeNull();
  await page.keyboard.up("e");
  await page.keyboard.down("e");
  await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(150);
  expect((await state(page)).swing.web).toBeNull();
  await page.keyboard.up("e");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  // This is an explicit negative fixture, never the continuous-route evidence.
  await page.evaluate(() =>
    window.__WM_DEBUG__!.setFixturePosition(
      { x: 33, y: 1, z: 166 },
      "negative finish placement",
    ),
  );
  await page.waitForTimeout(250);
  expect((await state(page)).skyline.completed).toBe(false);
  await page.evaluate(() =>
    window.__WM_DEBUG__!.setFixturePosition(
      { x: 12, y: -30, z: 140 },
      "negative fall/recovery",
    ),
  );
  await page.waitForTimeout(850);
  const recovered = await state(page);
  expect(recovered.health).toBe(75);
  expect(recovered.velocity).toEqual({ x: 0, y: 0, z: 0 });
  expect(recovered.swing.web).toBeNull();
  expect(recovered.skyline.completed).toBe(false);
  await shot(page, "fall-recovery");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Replay skyline/ }).click();
  await page.waitForTimeout(180);
  expect((await state(page)).skyline).toMatchObject({ stage: 0, valid: true });
  expect((await state(page)).swing.web).toBeNull();
});

test("WM-002 LT disconnect clears web, reconnect needs neutral and diagnostics retain swing mapping", async ({
  page,
}) => {
  test.setTimeout(50000);
  await controllerStart(page);
  await pad(page, [], [0, 0, 0, 1]);
  await page.waitForFunction(
    () => window.__WM_DEBUG__!.getState().cameraBeta > 1.6,
  );
  await pad(page, [7], [0, -1, 0, 0]);
  await until(page, "z", 20);
  await pad(page);
  await page.waitForTimeout(450);
  await pad(page, [6]);
  await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  expect(
    await page.evaluate(() => window.__WM_DEBUG__!.getControllerDiagnostics()),
  ).toContain("swing web");
  await page.evaluate(() => ((window as any).__wm002pad.connected = false));
  await page.waitForTimeout(200);
  expect((await state(page)).swing.web).toBeNull();
  expect(
    await page.evaluate(
      () => window.__WM_DEBUG__!.getControllerStatus().lifecycle,
    ),
  ).toBe("CONTROLLER_DISCONNECTED");
  await page.evaluate(() => ((window as any).__wm002pad.connected = true));
  await page.waitForTimeout(180);
  expect((await state(page)).swing.web).toBeNull();
  await pad(page);
  await padReady(page);
  await pad(page, [6]);
  await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  await pad(page);
  await page.waitForTimeout(160);
  expect((await state(page)).swing.web).toBeNull();
});

for (const [name, intervals] of [
  ["near-30fps", [1000 / 30]],
  ["uneven", [1000 / 60, 1000 / 120, 1000 / 30]],
] as const) {
  test(`WM-002 continuous keyboard route under ${name} render schedule`, async ({
    page,
  }) => {
    test.setTimeout(100000);
    await page.addInitScript((intervals) => {
      const native = window.requestAnimationFrame.bind(window);
      const last = new WeakMap<
        FrameRequestCallback,
        { next: number; index: number }
      >();
      window.requestAnimationFrame = (callback) => {
        const entry = last.get(callback) ?? {
          next: performance.now(),
          index: 0,
        };
        last.set(callback, entry);
        const check = (now: number) => {
          if (now + 0.3 >= entry.next) {
            entry.next = Math.max(
              entry.next + intervals[entry.index++ % intervals.length]!,
              now - 40,
            );
            callback(now);
          } else native(check);
        };
        return native(check);
      };
    }, intervals);
    await start(page);
    await keyboardRoute(page, false);
    const result = {
      profile: name,
      requestedIntervalsMs: intervals,
      state: await state(page),
      performance: await page.evaluate(() =>
        window.__WM_DEBUG__!.performance(),
      ),
      method:
        "Real requestAnimationFrame scheduling and ordinary keyboard/mouse traversal. Actual FPS is recorded separately from requested intervals. No fixture movement or source-state writes.",
    };
    await writeFile(
      `${root}/rendered-${name}.json`,
      JSON.stringify(result, null, 2),
    );
  });
}


test("WM-002 repeated pause, replay, save and load keeps runtime resources bounded", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "CDP heap and DOM resource observations require Chromium.");
  test.setTimeout(90000);
  await start(page);
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await until(page, "z", 21);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(600);
  const cdp = await context.newCDPSession(page);
  const measurements: { cycle: number; heap: number; nodes: number; listeners: number }[] = [];
  for (let cycle = 0; cycle < 12; cycle++) {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Replay skyline/ }).click();
    await page.waitForTimeout(220);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Save & Quit/ }).click();
    await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
    await page.getByRole("button", { name: /Continue/ }).click();
    expect((await state(page)).swing.web).toBeNull();
    expect((await state(page)).velocity).toEqual({ x: 0, y: 0, z: 0 });
    await page.waitForTimeout(120);
    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Runtime.getHeapUsage");
    const dom = await cdp.send("Memory.getDOMCounters");
    measurements.push({ cycle, heap: heap.usedSize, nodes: dom.nodes, listeners: dom.jsEventListeners });
  }
  const early = measurements[2]!, last = measurements.at(-1)!;
  // Permit renderer/cache warmup while rejecting retained scenes or one scene-sized leak per cycle.
  expect(last.heap - early.heap).toBeLessThan(8 * 1024 * 1024);
  expect(last.nodes - early.nodes).toBeLessThan(50);
  expect(last.listeners - early.listeners).toBeLessThan(10);
  await writeFile(`${root}/repeated-lifecycle-resources.json`, JSON.stringify({ author: "WEBMASTER_IMPLEMENTER", method: "12 ordinary pause/replay/save-and-quit/Continue cycles, forced GC between samples; bounded observation, not proof of indefinite operation", measurements }, null, 2));
});
