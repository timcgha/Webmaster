# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 controller remediation lifecycle (simulated Gamepad API) >> supports connection after load, disconnect cleanup, keyboard fallback, and deliberate replacement
- Location: e2e\wm001.spec.ts:515:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "x": -1.3777276490407724e-16,
    "y": 0,
-   "z": -5.880000000000004,
+   "z": -5.855000000000004,
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
      - generic: 0, 0, -6 • 19 FPS
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
  476 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  477 |   });
  478 | 
  479 |   test("rejects an unsupported mapping visibly while keyboard remains available", async ({ page }) => {
  480 |     await installGamepads(page, [{ id: "Legacy DirectInput Controller", index: 0, mapping: "", connected: true, axes: [0, 0, 0, 0], pressed: [0] }]);
  481 |     await ready(page);
  482 |     await expect(page.locator(".controller-status-card")).toContainText("mapping is unsupported");
  483 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({
  484 |       lifecycle: "CONTROLLER_UNSUPPORTED",
  485 |       selectedIndex: 0,
  486 |     });
  487 |     await page.keyboard.press("Enter");
  488 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  489 |   });
  490 | 
  491 |   test("selects active index 1 over idle index 0 and ignores noisy extra axes", async ({ page }) => {
  492 |     await installGamepads(page, [
  493 |       { id: "Idle virtual Xbox pad", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], pressed: [] },
  494 |       { id: "DualSense Wireless Controller", index: 1, mapping: "standard", connected: true, axes: [0, 0, 0, 0, -1], pressed: [0], buttonCount: 20 },
  495 |     ]);
  496 |     await ready(page);
  497 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  498 |     await patchPad(page, 1, { axes: [0, 0, 0, 0, -1], pressed: [] });
  499 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: PlayStation controller");
  500 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({ selectedIndex: 1, lifecycle: "CONTROLLER_READY" });
  501 | 
  502 |     await patchPad(page, 0, { pressed: [0] });
  503 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  504 |     expect((await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).selectedIndex).toBe(1);
  505 |     await patchPad(page, 0, { pressed: [] });
  506 | 
  507 |     await tapPadAt(page, 1, 13);
  508 |     await expect(page.getByRole("button", { name: /^Load/ })).toHaveClass(/selected/);
  509 |     await tapPadAt(page, 1, 0);
  510 |     await expect(page.getByRole("heading", { name: "Load a run" })).toBeVisible();
  511 |     const diagnostics = JSON.parse(await page.evaluate(() => window.__WM_DEBUG__!.getControllerDiagnostics()));
  512 |     expect(diagnostics.devices[1]).toMatchObject({ index: 1, axisCount: 5, buttonCount: 20, relevantAxes: [0, 0, 0, 0], selected: true });
  513 |   });
  514 | 
  515 |   test("supports connection after load, disconnect cleanup, keyboard fallback, and deliberate replacement", async ({ page }) => {
  516 |     await installGamepads(page, [{ id: "Xbox Controller", index: 0, connected: false, mapping: "standard", axes: [0, 0, 0, 0], pressed: [] }]);
  517 |     await ready(page);
  518 |     await expect(page.locator(".controller-status-card")).toContainText("press any button or move a stick");
  519 |     await patchPad(page, 0, { connected: true, pressed: [0] });
  520 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  521 |     await patchPad(page, 0, { pressed: [] });
  522 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: Xbox controller");
  523 | 
  524 |     await tapPad(page, 0);
  525 |     await tapPad(page, 0);
  526 |     await tapPad(page, 0);
  527 |     await expect(page.locator("#input-overlay")).toBeVisible();
  528 |     await setPad(page, { axes: [0, -1, 0, 0] });
  529 |     await page.waitForTimeout(250);
  530 |     await setPad(page, { connected: false });
  531 |     const disconnectedAt = (await state(page)).position;
  532 |     await page.waitForTimeout(350);
> 533 |     expect((await state(page)).position).toEqual(disconnectedAt);
      |                                          ^ Error: expect(received).toEqual(expected) // deep equality
  534 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller disconnected");
  535 | 
  536 |     await hold(page, ["w"], 250);
  537 |     const keyboardAt = (await state(page)).position;
  538 |     expect(keyboardAt.z).toBeGreaterThan(disconnectedAt.z);
  539 | 
  540 |     await patchPad(page, 1, { id: "DualSense Wireless Controller", connected: true, mapping: "standard", axes: [0, -1, 0, 0], pressed: [] });
  541 |     await expect(page.locator(".controller-hud-card")).toContainText("release sticks and buttons");
  542 |     const waitingAt = (await state(page)).position;
  543 |     await page.waitForTimeout(250);
  544 |     expect((await state(page)).position).toEqual(waitingAt);
  545 |     await patchPad(page, 1, { axes: [0, 0, 0, 0] });
  546 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready: PlayStation controller");
  547 |     await patchPad(page, 1, { axes: [0, -1, 0, 0] });
  548 |     await page.waitForTimeout(300);
  549 |     expect((await state(page)).position.z).toBeGreaterThan(waitingAt.z);
  550 |   });
  551 | 
  552 |   test("cleans up held movement on blur/focus and requires neutral then fresh input", async ({ page }) => {
  553 |     await installGamepad(page);
  554 |     await ready(page);
  555 |     await activatePad(page);
  556 |     await tapPad(page, 0);
  557 |     await tapPad(page, 0);
  558 |     await tapPad(page, 0);
  559 |     await setPad(page, { axes: [0, -1, 0, 0] });
  560 |     await page.waitForTimeout(250);
  561 |     await page.evaluate(() => {
  562 |       window.dispatchEvent(new Event("blur"));
  563 |       window.dispatchEvent(new Event("focus"));
  564 |     });
  565 |     await expect(page.locator(".controller-hud-card")).toContainText("release sticks and buttons");
  566 |     await page.waitForTimeout(250);
  567 |     const gatedAt = (await state(page)).position;
  568 |     await page.waitForTimeout(350);
  569 |     expect((await state(page)).position).toEqual(gatedAt);
  570 |     await setPad(page, { axes: [0, 0, 0, 0] });
  571 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready");
  572 |     await page.waitForTimeout(200);
  573 |     expect((await state(page)).position).toEqual(gatedAt);
  574 |     await setPad(page, { axes: [0, -1, 0, 0] });
  575 |     await page.waitForTimeout(300);
  576 |     expect((await state(page)).position.z).toBeGreaterThan(gatedAt.z);
  577 |   });
  578 | 
  579 |   test("keeps controller status and local diagnostics usable at a representative iPad landscape viewport", async ({ page, browserName }) => {
  580 |     await page.setViewportSize({ width: 1194, height: 834 });
  581 |     await installGamepads(page, [
  582 |       { id: "DualSense Wireless Controller", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], pressed: [0] },
  583 |     ]);
  584 |     await ready(page);
  585 |     await expectInViewport(page, ".menu-panel");
  586 |     await expectInViewport(page, ".controller-status-card");
  587 |     await setPad(page, { pressed: [] });
  588 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: PlayStation controller");
  589 |     await page.getByRole("button", { name: /Controller Details/ }).click();
  590 |     await expectInViewport(page, ".menu-panel");
  591 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"mapping": "standard"');
  592 |     await page.screenshot({
  593 |       path: `${captures}/${browserName}-controller-diagnostics-1194x834-representative-ipad-layout-not-safari.png`,
  594 |       fullPage: true,
  595 |     });
  596 |   });
  597 | });
  598 | 
  599 | test("keeps occupied-slot bytes unchanged when replacement is cancelled", async ({ page, browserName }) => {
  600 |   await ready(page);
  601 |   await newGameWithMouse(page, 1, "Easy");
  602 |   await page.keyboard.press("Escape");
  603 |   await page.getByRole("button", { name: /^Save & Quit/ }).click();
  604 |   await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  605 |   const before = await saveBytes(page);
  606 |   await page.getByRole("button", { name: /New Game/ }).click();
  607 |   await page.getByRole("button", { name: /Slot 1/ }).click();
  608 |   await page.getByRole("button", { name: /Hard/ }).click();
  609 |   await expect(page.getByRole("heading", { name: "Replace slot 1?" })).toBeVisible();
  610 |   await page.getByRole("button", { name: /^Cancel/ }).click();
  611 |   await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  612 |   expect(await saveBytes(page)).toEqual(before);
  613 |   await page.screenshot({ path: `${captures}/${browserName}-overwrite-cancel-preserves-slot.png` });
  614 | });
  615 | 
  616 | test("keeps the prior committed save and remains paused when Save & Quit write fails", async ({ page, browserName }) => {
  617 |   await ready(page);
  618 |   await newGameWithMouse(page, 1, "Normal");
  619 |   await page.keyboard.press("Escape");
  620 |   await page.getByRole("button", { name: /^Save Game/ }).click();
  621 |   await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  622 |   const before = await saveBytes(page);
  623 |   await page.evaluate(() => {
  624 |     const nativeSetItem = Storage.prototype.setItem;
  625 |     (window as any).__wmNativeSetItem = nativeSetItem;
  626 |     Storage.prototype.setItem = function (key: string, value: string): void {
  627 |       if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected quota failure", "QuotaExceededError");
  628 |       nativeSetItem.call(this, key, value);
  629 |     };
  630 |   });
  631 |   await page.getByRole("button", { name: /^Save & Quit/ }).click();
  632 |   await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  633 |   await expect(page.locator("#toast-layer")).toContainText("Saving is unavailable");
```