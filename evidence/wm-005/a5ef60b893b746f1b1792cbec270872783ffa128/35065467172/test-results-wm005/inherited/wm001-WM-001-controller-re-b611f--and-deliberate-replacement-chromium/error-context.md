# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 controller remediation lifecycle (simulated Gamepad API) >> supports connection after load, disconnect cleanup, keyboard fallback, and deliberate replacement
- Location: e2e\wm001.spec.ts:525:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "x": -1.2756737491118264e-16,
    "y": 0,
-   "z": -6.04666666666667,
+   "z": -6.02166666666667,
  }
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
      - generic: 0, 0, -6 • 24 FPS
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
  443 |     await ready(page);
  444 |     await expect(page.locator(".controller-status-card")).toContainText("press any button or move a stick");
  445 | 
  446 |     await setPad(page, { pressed: [0] });
  447 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  448 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  449 |     await setPad(page, { pressed: [] });
  450 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: Xbox controller");
  451 | 
  452 |     const storageBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  453 |     await page.getByRole("button", { name: /Controller Details/ }).click();
  454 |     await expect(page.getByRole("heading", { name: "Controller Details" })).toBeVisible();
  455 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"gamepadApiAvailable": true');
  456 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"lifecycle": "CONTROLLER_READY"');
  457 |     await page.getByRole("button", { name: /Copy Diagnostics/ }).click();
  458 |     await expect(page.locator("#toast-layer")).toContainText("diagnostics copied");
  459 |     expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toMatchObject({
  460 |       format: "webmaster-controller-diagnostics",
  461 |       lifecycle: "CONTROLLER_READY",
  462 |       selectedDevice: { index: 0 },
  463 |     });
  464 |     expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(storageBefore);
  465 |     await page.screenshot({ path: `${captures}/${browserName}-controller-diagnostics.png` });
  466 | 
  467 |     await page.getByRole("button", { name: /^Back/ }).click();
  468 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  469 |     await newGameWithMouse(page);
  470 |     await expect(page.locator("#input-overlay")).toBeVisible();
  471 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready: Xbox controller");
  472 |     await page.screenshot({ path: `${captures}/${browserName}-controller-ready-hud.png` });
  473 |   });
  474 | 
  475 |   test("keeps keyboard available when the Gamepad API is unavailable", async ({ page }) => {
  476 |     await page.addInitScript(() => {
  477 |       Object.defineProperty(navigator, "getGamepads", { configurable: true, value: undefined });
  478 |     });
  479 |     await ready(page);
  480 |     await expect(page.locator(".controller-status-card")).toContainText("browser cannot use gamepads");
  481 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({
  482 |       apiAvailable: false,
  483 |       lifecycle: "GAMEPAD_API_UNAVAILABLE",
  484 |     });
  485 |     await page.keyboard.press("Enter");
  486 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  487 |   });
  488 | 
  489 |   test("rejects an unsupported mapping visibly while keyboard remains available", async ({ page }) => {
  490 |     await installGamepads(page, [{ id: "Legacy DirectInput Controller", index: 0, mapping: "", connected: true, axes: [0, 0, 0, 0], pressed: [0] }]);
  491 |     await ready(page);
  492 |     await expect(page.locator(".controller-status-card")).toContainText("mapping is unsupported");
  493 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({
  494 |       lifecycle: "CONTROLLER_UNSUPPORTED",
  495 |       selectedIndex: 0,
  496 |     });
  497 |     await page.keyboard.press("Enter");
  498 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  499 |   });
  500 | 
  501 |   test("selects active index 1 over idle index 0 and ignores noisy extra axes", async ({ page }) => {
  502 |     await installGamepads(page, [
  503 |       { id: "Idle virtual Xbox pad", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], pressed: [] },
  504 |       { id: "DualSense Wireless Controller", index: 1, mapping: "standard", connected: true, axes: [0, 0, 0, 0, -1], pressed: [0], buttonCount: 20 },
  505 |     ]);
  506 |     await ready(page);
  507 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  508 |     await patchPad(page, 1, { axes: [0, 0, 0, 0, -1], pressed: [] });
  509 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: PlayStation controller");
  510 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).toMatchObject({ selectedIndex: 1, lifecycle: "CONTROLLER_READY" });
  511 | 
  512 |     await patchPad(page, 0, { pressed: [0] });
  513 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  514 |     expect((await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).selectedIndex).toBe(1);
  515 |     await patchPad(page, 0, { pressed: [] });
  516 | 
  517 |     await tapPadAt(page, 1, 13);
  518 |     await expect(page.getByRole("button", { name: /^Load/ })).toHaveClass(/selected/);
  519 |     await tapPadAt(page, 1, 0);
  520 |     await expect(page.getByRole("heading", { name: "Load a run" })).toBeVisible();
  521 |     const diagnostics = JSON.parse(await page.evaluate(() => window.__WM_DEBUG__!.getControllerDiagnostics()));
  522 |     expect(diagnostics.devices[1]).toMatchObject({ index: 1, axisCount: 5, buttonCount: 20, relevantAxes: [0, 0, 0, 0], selected: true });
  523 |   });
  524 | 
  525 |   test("supports connection after load, disconnect cleanup, keyboard fallback, and deliberate replacement", async ({ page }) => {
  526 |     await installGamepads(page, [{ id: "Xbox Controller", index: 0, connected: false, mapping: "standard", axes: [0, 0, 0, 0], pressed: [] }]);
  527 |     await ready(page);
  528 |     await expect(page.locator(".controller-status-card")).toContainText("press any button or move a stick");
  529 |     await patchPad(page, 0, { connected: true, pressed: [0] });
  530 |     await expect(page.locator(".controller-status-card")).toContainText("release sticks and buttons");
  531 |     await patchPad(page, 0, { pressed: [] });
  532 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: Xbox controller");
  533 | 
  534 |     await tapPad(page, 0);
  535 |     await tapPad(page, 0);
  536 |     await tapPad(page, 0);
  537 |     await expect(page.locator("#input-overlay")).toBeVisible();
  538 |     await setPad(page, { axes: [0, -1, 0, 0] });
  539 |     await page.waitForTimeout(250);
  540 |     await setPad(page, { connected: false });
  541 |     const disconnectedAt = (await state(page)).position;
  542 |     await page.waitForTimeout(350);
> 543 |     expect((await state(page)).position).toEqual(disconnectedAt);
      |                                          ^ Error: expect(received).toEqual(expected) // deep equality
  544 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller disconnected");
  545 | 
  546 |     await hold(page, ["w"], 250);
  547 |     const keyboardAt = (await state(page)).position;
  548 |     expect(keyboardAt.z).toBeGreaterThan(disconnectedAt.z);
  549 | 
  550 |     await patchPad(page, 1, { id: "DualSense Wireless Controller", connected: true, mapping: "standard", axes: [0, -1, 0, 0], pressed: [] });
  551 |     await expect(page.locator(".controller-hud-card")).toContainText("release sticks and buttons");
  552 |     const waitingAt = (await state(page)).position;
  553 |     await page.waitForTimeout(250);
  554 |     expect((await state(page)).position).toEqual(waitingAt);
  555 |     await patchPad(page, 1, { axes: [0, 0, 0, 0] });
  556 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready: PlayStation controller");
  557 |     await patchPad(page, 1, { axes: [0, -1, 0, 0] });
  558 |     await page.waitForTimeout(300);
  559 |     expect((await state(page)).position.z).toBeGreaterThan(waitingAt.z);
  560 |   });
  561 | 
  562 |   test("cleans up held movement on blur/focus and requires neutral then fresh input", async ({ page }) => {
  563 |     await installGamepad(page);
  564 |     await ready(page);
  565 |     await activatePad(page);
  566 |     await tapPad(page, 0);
  567 |     await tapPad(page, 0);
  568 |     await tapPad(page, 0);
  569 |     await setPad(page, { axes: [0, -1, 0, 0] });
  570 |     await page.waitForTimeout(250);
  571 |     await page.evaluate(() => {
  572 |       window.dispatchEvent(new Event("blur"));
  573 |       window.dispatchEvent(new Event("focus"));
  574 |     });
  575 |     await expect(page.locator(".controller-hud-card")).toContainText("release sticks and buttons");
  576 |     await page.waitForTimeout(250);
  577 |     const gatedAt = (await state(page)).position;
  578 |     await page.waitForTimeout(350);
  579 |     expect((await state(page)).position).toEqual(gatedAt);
  580 |     await setPad(page, { axes: [0, 0, 0, 0] });
  581 |     await expect(page.locator(".controller-hud-card")).toContainText("Controller ready");
  582 |     await page.waitForTimeout(200);
  583 |     expect((await state(page)).position).toEqual(gatedAt);
  584 |     await setPad(page, { axes: [0, -1, 0, 0] });
  585 |     await page.waitForTimeout(300);
  586 |     expect((await state(page)).position.z).toBeGreaterThan(gatedAt.z);
  587 |   });
  588 | 
  589 |   test("keeps controller status and local diagnostics usable at a representative iPad landscape viewport", async ({ page, browserName }) => {
  590 |     await page.setViewportSize({ width: 1194, height: 834 });
  591 |     await installGamepads(page, [
  592 |       { id: "DualSense Wireless Controller", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], pressed: [0] },
  593 |     ]);
  594 |     await ready(page);
  595 |     await expectInViewport(page, ".menu-panel");
  596 |     await expectInViewport(page, ".controller-status-card");
  597 |     await setPad(page, { pressed: [] });
  598 |     await expect(page.locator(".controller-status-card")).toContainText("Controller ready: PlayStation controller");
  599 |     await page.getByRole("button", { name: /Controller Details/ }).click();
  600 |     await expectInViewport(page, ".menu-panel");
  601 |     await expect(page.locator("[data-controller-diagnostics]")).toContainText('"mapping": "standard"');
  602 |     await page.screenshot({
  603 |       path: `${captures}/${browserName}-controller-diagnostics-1194x834-representative-ipad-layout-not-safari.png`,
  604 |       fullPage: true,
  605 |     });
  606 |   });
  607 | });
  608 | 
  609 | test("keeps occupied-slot bytes unchanged when replacement is cancelled", async ({ page, browserName }) => {
  610 |   await ready(page);
  611 |   await newGameWithMouse(page, 1, "Easy");
  612 |   await page.keyboard.press("Escape");
  613 |   await page.getByRole("button", { name: /^Save & Quit/ }).click();
  614 |   await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  615 |   const before = await saveBytes(page);
  616 |   await page.getByRole("button", { name: /New Game/ }).click();
  617 |   await page.getByRole("button", { name: /Slot 1/ }).click();
  618 |   await page.getByRole("button", { name: /Hard/ }).click();
  619 |   await expect(page.getByRole("heading", { name: "Replace slot 1?" })).toBeVisible();
  620 |   await page.getByRole("button", { name: /^Cancel/ }).click();
  621 |   await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  622 |   expect(await saveBytes(page)).toEqual(before);
  623 |   await page.screenshot({ path: `${captures}/${browserName}-overwrite-cancel-preserves-slot.png` });
  624 | });
  625 | 
  626 | test("keeps the prior committed save and remains paused when Save & Quit write fails", async ({ page, browserName }) => {
  627 |   await ready(page);
  628 |   await newGameWithMouse(page, 1, "Normal");
  629 |   await page.keyboard.press("Escape");
  630 |   await page.getByRole("button", { name: /^Save Game/ }).click();
  631 |   await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  632 |   const before = await saveBytes(page);
  633 |   await page.evaluate(() => {
  634 |     const nativeSetItem = Storage.prototype.setItem;
  635 |     (window as any).__wmNativeSetItem = nativeSetItem;
  636 |     Storage.prototype.setItem = function (key: string, value: string): void {
  637 |       if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected quota failure", "QuotaExceededError");
  638 |       nativeSetItem.call(this, key, value);
  639 |     };
  640 |   });
  641 |   await page.getByRole("button", { name: /^Save & Quit/ }).click();
  642 |   await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  643 |   await expect(page.locator("#toast-layer")).toContainText("Saving is unavailable");
```