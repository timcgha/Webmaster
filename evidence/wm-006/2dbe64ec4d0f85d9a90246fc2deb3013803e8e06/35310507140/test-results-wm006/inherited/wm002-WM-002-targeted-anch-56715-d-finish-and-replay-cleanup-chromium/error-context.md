# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm002.spec.ts >> WM-002 targeted anchor, unsafe save, pause, focus, fall recovery, invalid finish and replay cleanup
- Location: e2e\wm002.spec.ts:388:1

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: /Resume/ }) resolved to 3 elements:
    1) <button type="button" class="selected" data-menu-item="0" aria-current="true">…</button> aka getByRole('button', { name: 'Resume Return to practice' })
    2) <button disabled type="button" data-menu-item="1" aria-current="false">…</button> aka getByRole('button', { name: 'Save Game Unavailable during' })
    3) <button disabled type="button" data-menu-item="2" aria-current="false">…</button> aka getByRole('button', { name: 'Save & Quit Unavailable' })

Call log:
  - waiting for getByRole('button', { name: /Resume/ })

```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Paused":
        - paragraph: SLOT 1 • Normal
        - heading "Paused" [level=1]
        - paragraph: The city and all held inputs are frozen. Resume requires fresh input.
        - status:
          - generic: CONTROLLER
          - strong: "Controller: press any button or move a stick to connect"
        - generic:
          - button "Resume Return to practice" [active] [ref=e4] [cursor=pointer]:
            - generic [ref=e5]: Resume
            - generic [ref=e6]: Return to practice
          - button "Save Game Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state." [disabled] [ref=e7]:
            - generic [ref=e8]: Save Game
            - generic [ref=e9]: Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state.
          - button "Save & Quit Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state." [disabled] [ref=e10]:
            - generic [ref=e11]: Save & Quit
            - generic [ref=e12]: Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state.
          - button "Replay skyline route Return to the first ring; keep earned completion" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: Replay skyline route
            - generic [ref=e15]: Return to the first ring; keep earned completion
          - button "Restart at checkpoint Full health, current progress" [ref=e16] [cursor=pointer]:
            - generic [ref=e17]: Restart at checkpoint
            - generic [ref=e18]: Full health, current progress
          - button "Settings Camera and display" [ref=e19] [cursor=pointer]:
            - generic [ref=e20]: Settings
            - generic [ref=e21]: Camera and display
          - button "Controller Details Connection status and local diagnostics" [ref=e22] [cursor=pointer]:
            - generic [ref=e23]: Controller Details
            - generic [ref=e24]: Connection status and local diagnostics
          - button "Replay 20-ring course Start on the far practice roof; separate course progress restarts" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Replay 20-ring course
            - generic [ref=e27]: Start on the far practice roof; separate course progress restarts
          - button "Combat Playground Punch, kick, web and dodge training · no timer · progress in this activity restarts" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: Combat Playground
            - generic [ref=e30]: Punch, kick, web and dodge training · no timer · progress in this activity restarts
        - paragraph: "A / ✕ Select & Jump • B / ○ Back • Menu / Options Pause • Keyboard: arrows + Enter / Esc"
  - status: "Checkpoint: First gap: jump and hold the close ring, then let go."
```

# Test source

```ts
  314 |   await pad(page, [7, 6], [0, -1, 0, 0]);
  315 |   await page.waitForFunction(
  316 |     () => window.__WM_DEBUG__!.getState().swing.web?.anchorId === "ring-4",
  317 |   );
  318 |   await shot(page, "controller-midair-reattachment");
  319 |   await until(page, "z", 152);
  320 |   await pad(page, [7], [0, -1, 0, 0]);
  321 |   await stage(page, 3);
  322 |   await until(page, "z", 166);
  323 |   await pad(page);
  324 |   await page.waitForTimeout(650);
  325 |   await pad(page, [], [0, 0, 1, 0]);
  326 |   await page.waitForFunction(
  327 |     () => window.__WM_DEBUG__!.getState().cameraAlpha <= -Math.PI + 0.035,
  328 |   );
  329 |   await pad(page);
  330 |   await pad(page, [7], [0, -1, 0, 0]);
  331 |   await until(page, "x", 5);
  332 |   await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  333 |   await page.waitForTimeout(70);
  334 |   await pad(page, [7, 6], [0, -1, 0, 0]);
  335 |   await until(page, "x", 20);
  336 |   await pad(page, [7], [0, -1, 0, 0]);
  337 |   await stage(page, 4);
  338 |   await pad(page);
  339 |   await page.waitForTimeout(850);
  340 |   expect((await state(page)).skyline).toMatchObject({
  341 |     stage: 4,
  342 |     completed: true,
  343 |     completions: 1,
  344 |     valid: true,
  345 |   });
  346 |   expect((await state(page)).safe).toBe(true);
  347 |   await shot(page, "controller-route-complete");
  348 | }
  349 | test("WM-002 simulated PlayStation controller-only complete route and safe save/load", async ({
  350 |   page,
  351 | }) => {
  352 |   test.setTimeout(100000);
  353 |   await controllerStart(page);
  354 |   await controllerRoute(page);
  355 |   await tap(page, 9);
  356 |   await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  357 |   await tap(page, 13);
  358 |   await tap(page, 0);
  359 |   await expect(page.locator("#toast-layer")).toContainText("Save confirmed.");
  360 |   await tap(page, 13);
  361 |   await tap(page, 13);
  362 |   await tap(page, 0);
  363 |   await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  364 |   await tap(page, 13);
  365 |   await tap(page, 0);
  366 |   const loaded = await state(page);
  367 |   expect(loaded.skyline.completed).toBe(true);
  368 |   expect(loaded.velocity).toEqual({ x: 0, y: 0, z: 0 });
  369 |   expect(loaded.swing.web).toBeNull();
  370 |   // The complete route and menus above used only the simulated controller. Confirm keyboard fallback separately.
  371 |   await page.keyboard.down("d");
  372 |   await page.waitForTimeout(300);
  373 |   await page.keyboard.up("d");
  374 |   expect((await state(page)).position.x).toBeGreaterThan(loaded.position.x + 0.1);
  375 |   await writeFile(
  376 |     `${root}/controller-continuous-route.json`,
  377 |     JSON.stringify(
  378 |       {
  379 |         evidence: "SIMULATED_GAMEPAD_ONLY, not physical compatibility",
  380 |         loaded,
  381 |       },
  382 |       null,
  383 |       2,
  384 |     ),
  385 |   );
  386 | });
  387 | 
  388 | test("WM-002 targeted anchor, unsafe save, pause, focus, fall recovery, invalid finish and replay cleanup", async ({
  389 |   page,
  390 | }) => {
  391 |   test.setTimeout(60000);
  392 |   await start(page);
  393 |   await look(page, 0, 170);
  394 |   await page.keyboard.down("Shift");
  395 |   await page.keyboard.down("w");
  396 |   await until(page, "z", 20);
  397 |   await page.keyboard.up("w");
  398 |   await page.keyboard.up("Shift");
  399 |   await page.waitForTimeout(400);
  400 |   expect((await state(page)).swing.targetId).toBe("ring-1");
  401 |   await shot(page, "targeted-anchor");
  402 |   await page.keyboard.down("e");
  403 |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  404 |   expect((await state(page)).safe).toBe(false);
  405 |   await page.keyboard.press("Escape");
  406 |   await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  407 |   await expect(
  408 |     page.getByRole("button", { name: /^Save & Quit/ }),
  409 |   ).toBeDisabled();
  410 |   await shot(page, "save-unavailable-while-attached");
  411 |   const paused = await state(page);
  412 |   await page.waitForTimeout(250);
  413 |   expect((await state(page)).position).toEqual(paused.position);
> 414 |   await page.getByRole("button", { name: /Resume/ }).click();
      |                                                      ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: /Resume/ }) resolved to 3 elements:
  415 |   await page.waitForTimeout(200);
  416 |   expect((await state(page)).swing.web).toBeNull();
  417 |   await page.keyboard.up("e");
  418 |   await page.keyboard.down("e");
  419 |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  420 |   await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  421 |   await page.waitForTimeout(150);
  422 |   expect((await state(page)).swing.web).toBeNull();
  423 |   await page.keyboard.up("e");
  424 |   await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  425 |   // This is an explicit negative fixture, never the continuous-route evidence.
  426 |   await page.evaluate(() =>
  427 |     window.__WM_DEBUG__!.setFixturePosition(
  428 |       { x: 33, y: 1, z: 166 },
  429 |       "negative finish placement",
  430 |     ),
  431 |   );
  432 |   await page.waitForTimeout(250);
  433 |   expect((await state(page)).skyline.completed).toBe(false);
  434 |   await page.evaluate(() =>
  435 |     window.__WM_DEBUG__!.setFixturePosition(
  436 |       { x: 12, y: -30, z: 140 },
  437 |       "negative fall/recovery",
  438 |     ),
  439 |   );
  440 |   await page.waitForTimeout(850);
  441 |   const recovered = await state(page);
  442 |   expect(recovered.health).toBe(75);
  443 |   expect(recovered.velocity).toEqual({ x: 0, y: 0, z: 0 });
  444 |   expect(recovered.swing.web).toBeNull();
  445 |   expect(recovered.skyline.completed).toBe(false);
  446 |   await shot(page, "fall-recovery");
  447 |   await page.keyboard.press("Escape");
  448 |   await page.getByRole("button", { name: /Replay skyline/ }).click();
  449 |   await page.waitForTimeout(180);
  450 |   expect((await state(page)).skyline).toMatchObject({ stage: 0, valid: true });
  451 |   expect((await state(page)).swing.web).toBeNull();
  452 | });
  453 | 
  454 | test("WM-002 LT disconnect clears web, reconnect needs neutral and diagnostics retain swing mapping", async ({
  455 |   page,
  456 | }) => {
  457 |   test.setTimeout(50000);
  458 |   await controllerStart(page);
  459 |   await pad(page, [], [0, 0, 0, 1]);
  460 |   await page.waitForFunction(
  461 |     () => window.__WM_DEBUG__!.getState().cameraBeta > 1.6,
  462 |   );
  463 |   await pad(page, [7], [0, -1, 0, 0]);
  464 |   await until(page, "z", 20);
  465 |   await pad(page);
  466 |   await page.waitForTimeout(450);
  467 |   await pad(page, [6]);
  468 |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  469 |   expect(
  470 |     await page.evaluate(() => window.__WM_DEBUG__!.getControllerDiagnostics()),
  471 |   ).toContain("swing web");
  472 |   await page.evaluate(() => ((window as any).__wm002pad.connected = false));
  473 |   await page.waitForTimeout(200);
  474 |   expect((await state(page)).swing.web).toBeNull();
  475 |   expect(
  476 |     await page.evaluate(
  477 |       () => window.__WM_DEBUG__!.getControllerStatus().lifecycle,
  478 |     ),
  479 |   ).toBe("CONTROLLER_DISCONNECTED");
  480 |   await page.evaluate(() => ((window as any).__wm002pad.connected = true));
  481 |   await page.waitForTimeout(180);
  482 |   expect((await state(page)).swing.web).toBeNull();
  483 |   await pad(page);
  484 |   await padReady(page);
  485 |   await pad(page, [6]);
  486 |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  487 |   await pad(page);
  488 |   await page.waitForTimeout(160);
  489 |   expect((await state(page)).swing.web).toBeNull();
  490 | });
  491 | 
  492 | for (const [name, intervals] of [
  493 |   ["near-30fps", [1000 / 30]],
  494 |   ["uneven", [1000 / 60, 1000 / 120, 1000 / 30]],
  495 | ] as const) {
  496 |   test(`WM-002 continuous keyboard route under ${name} render schedule`, async ({
  497 |     page,
  498 |   }) => {
  499 |     test.setTimeout(100000);
  500 |     await page.addInitScript((intervals) => {
  501 |       const native = window.requestAnimationFrame.bind(window);
  502 |       const last = new WeakMap<
  503 |         FrameRequestCallback,
  504 |         { next: number; index: number }
  505 |       >();
  506 |       window.requestAnimationFrame = (callback) => {
  507 |         const entry = last.get(callback) ?? {
  508 |           next: performance.now(),
  509 |           index: 0,
  510 |         };
  511 |         last.set(callback, entry);
  512 |         const check = (now: number) => {
  513 |           if (now + 0.3 >= entry.next) {
  514 |             entry.next = Math.max(
```