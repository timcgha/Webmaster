# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 rendered simulated Gamepad journey >> disconnect releases motion and reconnect requires neutral then fresh input
- Location: e2e\wm001.spec.ts:363:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "x": -1.4797815489697183e-16,
    "y": 0,
-   "z": -5.713333333333338,
+   "z": -5.688333333333338,
  }
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - region "Current objective":
      - text: PRACTICE 1 / 3
      - strong: Reach the glowing sky gate
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Easy
      - generic: 0, 0, -6 • 18 FPS
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
    - status:
      - generic: CONTROLLER
      - strong: Controller disconnected — keyboard and mouse remain available
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
  275 |     }
  276 |     expect((await state(page)).health).toBe(25);
  277 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -31, z: 0 }, "negative out-of-bounds setup 4/4"));
  278 |     await page.waitForTimeout(800);
  279 |     expect((await state(page)).health).toBe(100);
  280 |     await page.screenshot({ path: `${captures}/${browserName}-recovery-fixture-labelled.png` });
  281 |   });
  282 | 
  283 |   test("explains and enforces safe-state saving while airborne", async ({ page, browserName }) => {
  284 |     await ready(page);
  285 |     await newGameWithMouse(page, 1, "Easy");
  286 |     await page.keyboard.press("Space");
  287 |     await page.waitForTimeout(120);
  288 |     expect((await state(page)).grounded).toBe(false);
  289 |     await page.keyboard.press("Escape");
  290 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  291 |     for (const name of [/^Save Game/, /^Save & Quit/]) {
  292 |       const button = page.getByRole("button", { name });
  293 |       await expect(button).toBeDisabled();
  294 |       await expect(button).toContainText("Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering");
  295 |     }
  296 |     await expect(page.getByRole("button", { name: /^Resume/ })).toBeEnabled();
  297 |     await page.screenshot({ path: `${captures}/${browserName}-airborne-safe-save-disabled.png` });
  298 |   });
  299 | });
  300 | 
  301 | test.describe("WM-001 rendered simulated Gamepad journey", () => {
  302 |   test.beforeEach(async ({ page }) => installGamepad(page));
  303 | 
  304 |   test("uses gamepad alone for new game, movement, camera, pause, save, save-and-quit, Continue, and Load", async ({ page, browserName }) => {
  305 |     await ready(page);
  306 |     await activatePad(page);
  307 |     await tapPad(page, 0);
  308 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  309 |     await tapPad(page, 0);
  310 |     await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  311 |     await tapPad(page, 13);
  312 |     await tapPad(page, 0);
  313 |     await expect(page.locator("#input-overlay")).toBeVisible();
  314 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun()?.difficulty)).toBe("Normal");
  315 | 
  316 |     const beforeMove = await state(page);
  317 |     await setPad(page, { axes: [0, -1, 0, 0] });
  318 |     await page.waitForTimeout(750);
  319 |     await setPad(page, { axes: [0, 0, 0, 0] });
  320 |     expect((await state(page)).position.z).toBeGreaterThan(beforeMove.position.z + 2);
  321 |     await setPad(page, { pressed: [0] });
  322 |     expect((await state(page)).position.y).toBeGreaterThan(0.1);
  323 |     await setPad(page, { pressed: [] });
  324 |     await page.waitForTimeout(850);
  325 |     expect((await state(page)).grounded).toBe(true);
  326 |     await setPad(page, { axes: [0, -1, 0, 0], pressed: [7] });
  327 |     await page.waitForTimeout(300);
  328 |     await setPad(page, { axes: [0, 0, 0, 0], pressed: [] });
  329 |     const cameraBefore = (await state(page)).cameraAlpha;
  330 |     await setPad(page, { axes: [0, 0, 0.8, -0.5] });
  331 |     await page.waitForTimeout(900);
  332 |     await setPad(page, { axes: [0, 0, 0, 0] });
  333 |     expect((await state(page)).cameraAlpha).not.toBe(cameraBefore);
  334 |     await tapPad(page, 10);
  335 | 
  336 |     await tapPad(page, 9);
  337 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  338 |     await tapPad(page, 13);
  339 |     await tapPad(page, 0);
  340 |     await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  341 |     await tapPad(page, 13);
  342 |     await tapPad(page, 13);
  343 |     await tapPad(page, 0);
  344 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  345 | 
  346 |     await tapPad(page, 13);
  347 |     await tapPad(page, 0);
  348 |     await expect(page.locator("#input-overlay")).toBeVisible();
  349 |     await tapPad(page, 9);
  350 |     await tapPad(page, 13);
  351 |     await tapPad(page, 13);
  352 |     await tapPad(page, 0);
  353 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  354 |     await tapPad(page, 13);
  355 |     await tapPad(page, 13);
  356 |     await tapPad(page, 0);
  357 |     await expect(page.getByRole("heading", { name: "Load a run" })).toBeVisible();
  358 |     await tapPad(page, 0);
  359 |     await expect(page.locator("#input-overlay")).toBeVisible();
  360 |     await page.screenshot({ path: `${captures}/${browserName}-simulated-xbox-route.png` });
  361 |   });
  362 | 
  363 |   test("disconnect releases motion and reconnect requires neutral then fresh input", async ({ page }) => {
  364 |     await ready(page);
  365 |     await activatePad(page);
  366 |     await tapPad(page, 0);
  367 |     await tapPad(page, 0);
  368 |     await tapPad(page, 0);
  369 |     await expect(page.locator("#input-overlay")).toBeVisible();
  370 |     await setPad(page, { axes: [0, -1, 0, 0] });
  371 |     await page.waitForTimeout(250);
  372 |     await setPad(page, { connected: false });
  373 |     const disconnectedAt = (await state(page)).position;
  374 |     await page.waitForTimeout(350);
> 375 |     expect((await state(page)).position).toEqual(disconnectedAt);
      |                                          ^ Error: expect(received).toEqual(expected) // deep equality
  376 |     await setPad(page, { connected: true, axes: [0, -1, 0, 0] });
  377 |     await page.waitForTimeout(350);
  378 |     expect((await state(page)).position).toEqual(disconnectedAt);
  379 |     await setPad(page, { axes: [0, 0, 0, 0] });
  380 |     await setPad(page, { axes: [0, -1, 0, 0] });
  381 |     await page.waitForTimeout(300);
  382 |     expect((await state(page)).position.z).toBeGreaterThan(disconnectedAt.z);
  383 |   });
  384 | 
  385 |   test("shows PlayStation-style prompts without changing standard semantic actions", async ({ page }) => {
  386 |     await ready(page);
  387 |     await setPad(page, { id: "DualSense Wireless Controller", axes: [0, 0, 0, 0], pressed: [] });
  388 |     await activatePad(page);
  389 |     await tapPad(page, 0);
  390 |     await expect(page.getByText(/Options Pause/)).toBeVisible();
  391 |   });
  392 | 
  393 |   test("operates persisted main and pause settings without mouse or typing", async ({ page }) => {
  394 |     await ready(page);
  395 |     await activatePad(page);
  396 |     await tapPad(page, 13);
  397 |     await tapPad(page, 13);
  398 |     await tapPad(page, 0);
  399 |     await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  400 |     await tapPad(page, 15);
  401 |     await tapPad(page, 13);
  402 |     await tapPad(page, 0);
  403 |     await tapPad(page, 13);
  404 |     await tapPad(page, 0);
  405 |     await tapPad(page, 13);
  406 |     await tapPad(page, 13);
  407 |     await tapPad(page, 0);
  408 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  409 |     expect(await page.evaluate(() => JSON.parse(localStorage.getItem("webmaster.settings.v1")!))).toEqual({
  410 |       cameraSensitivity: 1.1,
  411 |       invertY: true,
  412 |       adaptiveQuality: false,
  413 |     });
  414 | 
  415 |     await tapPad(page, 0);
  416 |     await tapPad(page, 0);
  417 |     await tapPad(page, 0);
  418 |     await expect(page.locator("#input-overlay")).toBeVisible();
  419 |     await tapPad(page, 9);
  420 |     await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle).toBe("CONTROLLER_READY");
  421 |     for (let step = 0; step < 4; step += 1) await tapPad(page, 13);
  422 |     await tapPad(page, 0);
  423 |     await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  424 |     await tapPad(page, 1);
  425 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  426 |   });
  427 | });
  428 | 
  429 | test.describe("WM-001 controller remediation lifecycle (simulated Gamepad API)", () => {
  430 |   test("makes exposure, release, ready, HUD status, and local copy diagnostics persistent", async ({ page, context, browserName }) => {
  431 |     await installGamepad(page);
  432 |     await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4173" });
  433 |     await ready(page);
  434 |     await expect(page.locator(".controller-status-card")).toContainText("press any button or move a stick");
  435 | 
  436 |     await setPad(page, { pressed: [0] });
  437 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  438 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  439 |     await setPad(page, { pressed: [] });
  440 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: Xbox controller");
  441 | 
  442 |     const storageBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  443 |     await page.getByRole("button", { name: /Controller Details/ }).click();
  444 |     await expect(page.getByRole("heading", { name: "Controller Details" })).toBeVisible();
  445 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"gamepadApiAvailable": true');
  446 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"lifecycle": "CONTROLLER_READY"');
  447 |     await page.getByRole("button", { name: /Copy Diagnostics/ }).click();
  448 |     await expect(page.locator("#toast-layer")).toContainText("diagnostics copied");
  449 |     expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toMatchObject({
  450 |       format: "webmaster-controller-diagnostics",
  451 |       lifecycle: "CONTROLLER_READY",
  452 |       selectedDevice: { index: 0 },
  453 |     });
  454 |     expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(storageBefore);
  455 |     await page.screenshot({ path: `${captures}/${browserName}-controller-diagnostics.png` });
  456 | 
  457 |     await page.getByRole("button", { name: /^Back/ }).click();
  458 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  459 |     await newGameWithMouse(page);
  460 |     await expect(page.locator("#input-overlay")).toBeVisible();
  461 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready: Xbox controller");
  462 |     await page.screenshot({ path: `${captures}/${browserName}-controller-ready-hud.png` });
  463 |   });
  464 | 
  465 |   test("keeps keyboard available when the Gamepad API is unavailable", async ({ page }) => {
  466 |     await page.addInitScript(() => {
  467 |       Object.defineProperty(navigator, "getGamepads", { configurable: true, value: undefined });
  468 |     });
  469 |     await ready(page);
  470 |     await expect(page.locator(".controller-status-card")).toContainText("browser cannot use gamepads");
  471 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({
  472 |       apiAvailable: false,
  473 |       lifecycle: "GAMEPAD_API_UNAVAILABLE",
  474 |     });
  475 |     await page.keyboard.press("Enter");
```