# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm006-refresh-wm001.spec.ts >> WM-001 rendered simulated Gamepad journey >> disconnect releases motion and reconnect requires neutral then fresh input
- Location: e2e\wm006-refresh-wm001.spec.ts:378:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > -5.771666666666671
Received:   -5.771666666666671
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: PRACTICE 1 / 3
        - strong: Reach the glowing sky gate
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Easy
      - generic: 0, 0, -6 • 13 FPS
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
      - generic:
        - strong: Try punching, kicking, webs & dodges
        - generic: Esc / Menu / Options → Combat Playground
        - button "Open training menu" [ref=e4] [cursor=pointer]
    - status:
      - generic: CONTROLLER
      - strong: "Controller detected: release sticks and buttons"
    - generic:
      - strong: Move
      - text: WASD / Left Stick
      - strong: Look
      - text: Drag / Right Stick
      - strong: Jump
      - text: Space / A / ✕
      - strong: Run
      - text: Shift / RT / R2
      - strong: Swing
      - text: Hold E / LT / L2, release to let go
      - strong: Climb
      - text: Hold C / RB / R1
      - strong: Pull
      - text: Hold Q / LB / L1
      - strong: Recenter
      - text: R / RS
      - strong: Pause
      - text: Esc / Menu / Options
  - status: Slot 1 started on Easy
```

# Test source

```ts
  306 |     for (const name of [/^Save Game/, /^Save & Quit/]) {
  307 |       const button = page.getByRole("button", { name });
  308 |       await expect(button).toBeDisabled();
  309 |       await expect(button).toContainText("Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight");
  310 |     }
  311 |     await expect(page.getByRole("button", { name: /^Resume/ })).toBeEnabled();
  312 |     await page.screenshot({ path: `${captures}/${browserName}-airborne-safe-save-disabled.png` });
  313 |   });
  314 | });
  315 | 
  316 | test.describe("WM-001 rendered simulated Gamepad journey", () => {
  317 |   test.beforeEach(async ({ page }) => installGamepad(page));
  318 | 
  319 |   test("uses gamepad alone for new game, movement, camera, pause, save, save-and-quit, Continue, and Load", async ({ page, browserName }) => {
  320 |     await ready(page);
  321 |     await activatePad(page);
  322 |     await tapPad(page, 0);
  323 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  324 |     await tapPad(page, 0);
  325 |     await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  326 |     await tapPad(page, 13);
  327 |     await tapPad(page, 0);
  328 |     await expect(page.locator("#input-overlay")).toBeVisible();
  329 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun()?.difficulty)).toBe("Normal");
  330 | 
  331 |     const beforeMove = await state(page);
  332 |     await setPad(page, { axes: [0, -1, 0, 0] });
  333 |     await page.waitForTimeout(750);
  334 |     await setPad(page, { axes: [0, 0, 0, 0] });
  335 |     expect((await state(page)).position.z).toBeGreaterThan(beforeMove.position.z + 2);
  336 |     await setPad(page, { pressed: [0] });
  337 |     expect((await state(page)).position.y).toBeGreaterThan(0.1);
  338 |     await setPad(page, { pressed: [] });
  339 |     await page.waitForTimeout(850);
  340 |     expect((await state(page)).grounded).toBe(true);
  341 |     await setPad(page, { axes: [0, -1, 0, 0], pressed: [7] });
  342 |     await page.waitForTimeout(300);
  343 |     await setPad(page, { axes: [0, 0, 0, 0], pressed: [] });
  344 |     const cameraBefore = (await state(page)).cameraAlpha;
  345 |     await setPad(page, { axes: [0, 0, 0.8, -0.5] });
  346 |     await page.waitForTimeout(900);
  347 |     await setPad(page, { axes: [0, 0, 0, 0] });
  348 |     expect((await state(page)).cameraAlpha).not.toBe(cameraBefore);
  349 |     await tapPad(page, 10);
  350 | 
  351 |     await tapPad(page, 9);
  352 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  353 |     await tapPad(page, 13);
  354 |     await tapPad(page, 0);
  355 |     await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  356 |     await tapPad(page, 13);
  357 |     await tapPad(page, 13);
  358 |     await tapPad(page, 0);
  359 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  360 | 
  361 |     await tapPad(page, 13);
  362 |     await tapPad(page, 0);
  363 |     await expect(page.locator("#input-overlay")).toBeVisible();
  364 |     await tapPad(page, 9);
  365 |     await tapPad(page, 13);
  366 |     await tapPad(page, 13);
  367 |     await tapPad(page, 0);
  368 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  369 |     await tapPad(page, 13);
  370 |     await tapPad(page, 13);
  371 |     await tapPad(page, 0);
  372 |     await expect(page.getByRole("heading", { name: "Load a run" })).toBeVisible();
  373 |     await tapPad(page, 0);
  374 |     await expect(page.locator("#input-overlay")).toBeVisible();
  375 |     await page.screenshot({ path: `${captures}/${browserName}-simulated-xbox-route.png` });
  376 |   });
  377 | 
  378 |   test("disconnect releases motion and reconnect requires neutral then fresh input", async ({ page }) => {
  379 |     await ready(page);
  380 |     await activatePad(page);
  381 |     await tapPad(page, 0);
  382 |     await tapPad(page, 0);
  383 |     await tapPad(page, 0);
  384 |     await expect(page.locator("#input-overlay")).toBeVisible();
  385 |     await setPad(page, { axes: [0, -1, 0, 0] });
  386 |     await page.waitForTimeout(250);
  387 |     await setPad(page, { connected: false });
  388 |     // Device polling happens on the browser frame; observe the actual disconnect
  389 |     // before freezing the no-motion comparison point.
  390 |     await page.waitForFunction(() => window.__WM_DEBUG__!.getControllerStatus().lifecycle === "CONTROLLER_DISCONNECTED");
  391 |     const brakingAt = (await state(page)).position;
  392 |     await page.waitForFunction(() => {
  393 |       const v = window.__WM_DEBUG__!.getState().velocity;
  394 |       return v.x === 0 && v.z === 0;
  395 |     }, undefined, { timeout: 500 });
  396 |     const disconnectedAt = (await state(page)).position;
  397 |     expect(Math.hypot(disconnectedAt.x-brakingAt.x,disconnectedAt.z-brakingAt.z)).toBeLessThan(.5);
  398 |     await page.waitForTimeout(350);
  399 |     expect((await state(page)).position).toEqual(disconnectedAt);
  400 |     await setPad(page, { connected: true, axes: [0, -1, 0, 0] });
  401 |     await page.waitForTimeout(350);
  402 |     expect((await state(page)).position).toEqual(disconnectedAt);
  403 |     await setPad(page, { axes: [0, 0, 0, 0] });
  404 |     await setPad(page, { axes: [0, -1, 0, 0] });
  405 |     await page.waitForTimeout(300);
> 406 |     expect((await state(page)).position.z).toBeGreaterThan(disconnectedAt.z);
      |                                            ^ Error: expect(received).toBeGreaterThan(expected)
  407 |   });
  408 | 
  409 |   test("shows PlayStation-style prompts without changing standard semantic actions", async ({ page }) => {
  410 |     await ready(page);
  411 |     await setPad(page, { id: "DualSense Wireless Controller", axes: [0, 0, 0, 0], pressed: [] });
  412 |     await activatePad(page);
  413 |     await tapPad(page, 0);
  414 |     await expect(page.getByText(/Options Pause/)).toBeVisible();
  415 |   });
  416 | 
  417 |   test("operates persisted main and pause settings without mouse or typing", async ({ page }) => {
  418 |     await ready(page);
  419 |     await activatePad(page);
  420 |     await tapPad(page, 13);
  421 |     await tapPad(page, 13);
  422 |     await tapPad(page, 0);
  423 |     await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  424 |     await tapPad(page, 15);
  425 |     await tapPad(page, 13);
  426 |     await tapPad(page, 0);
  427 |     await tapPad(page, 13);
  428 |     await tapPad(page, 0);
  429 |     await tapPad(page, 13);
  430 |     // WM006 adds a persisted sound choice after adaptive quality.
  431 |     await tapPad(page, 0);
  432 |     await tapPad(page, 13);
  433 |     await tapPad(page, 13);
  434 |     await tapPad(page, 0);
  435 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  436 |     expect(await page.evaluate(() => JSON.parse(localStorage.getItem("webmaster.settings.v1")!))).toEqual({
  437 |       cameraSensitivity: 1.1,
  438 |       invertY: true,
  439 |       adaptiveQuality: false,
  440 |       combatSound: false,
  441 |     });
  442 | 
  443 |     await tapPad(page, 0);
  444 |     await tapPad(page, 0);
  445 |     await tapPad(page, 0);
  446 |     await expect(page.locator("#input-overlay")).toBeVisible();
  447 |     await tapPad(page, 9);
  448 |     await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle).toBe("CONTROLLER_READY");
  449 |     for (let step = 0; step < 4; step += 1) await tapPad(page, 13);
  450 |     await tapPad(page, 0);
  451 |     await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  452 |     await tapPad(page, 1);
  453 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  454 |   });
  455 | });
  456 | 
  457 | test.describe("WM-001 controller remediation lifecycle (simulated Gamepad API)", () => {
  458 |   test("makes exposure, release, ready, HUD status, and local copy diagnostics persistent", async ({ page, context, browserName }) => {
  459 |     await installGamepad(page);
  460 |     await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4173" });
  461 |     await ready(page);
  462 |     await expect(page.locator(".controller-status-card")).toContainText("press any button or move a stick");
  463 | 
  464 |     await setPad(page, { pressed: [0] });
  465 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  466 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  467 |     await setPad(page, { pressed: [] });
  468 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: Xbox controller");
  469 | 
  470 |     const storageBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  471 |     await page.getByRole("button", { name: /Controller Details/ }).click();
  472 |     await expect(page.getByRole("heading", { name: "Controller Details" })).toBeVisible();
  473 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"gamepadApiAvailable": true');
  474 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"lifecycle": "CONTROLLER_READY"');
  475 |     await page.getByRole("button", { name: /Copy Diagnostics/ }).click();
  476 |     await expect(page.locator("#toast-layer")).toContainText("diagnostics copied");
  477 |     expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toMatchObject({
  478 |       format: "webmaster-controller-diagnostics",
  479 |       lifecycle: "CONTROLLER_READY",
  480 |       selectedDevice: { index: 0 },
  481 |     });
  482 |     expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(storageBefore);
  483 |     await page.screenshot({ path: `${captures}/${browserName}-controller-diagnostics.png` });
  484 | 
  485 |     await page.getByRole("button", { name: /^Back/ }).click();
  486 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  487 |     await newGameWithMouse(page);
  488 |     await expect(page.locator("#input-overlay")).toBeVisible();
  489 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready: Xbox controller");
  490 |     await page.screenshot({ path: `${captures}/${browserName}-controller-ready-hud.png` });
  491 |   });
  492 | 
  493 |   test("keeps keyboard available when the Gamepad API is unavailable", async ({ page }) => {
  494 |     await page.addInitScript(() => {
  495 |       Object.defineProperty(navigator, "getGamepads", { configurable: true, value: undefined });
  496 |     });
  497 |     await ready(page);
  498 |     await expect(page.locator(".controller-status-card")).toContainText("browser cannot use gamepads");
  499 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({
  500 |       apiAvailable: false,
  501 |       lifecycle: "GAMEPAD_API_UNAVAILABLE",
  502 |     });
  503 |     await page.keyboard.press("Enter");
  504 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  505 |   });
  506 | 
```