# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm002.spec.ts >> WM-002 simulated PlayStation controller-only complete route and safe save/load
- Location: e2e\wm002.spec.ts:349:1

# Error details

```
Test timeout of 100000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 100000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: STREET RECOVERY
        - strong: Every building face is climbable. Mint paths teach the route. Hold C / RB / R1 to climb onto a roof.
      - region "Swing status":
        - text: "SWING: Hold E / L2 • release to let go"
        - strong: Find a glowing ring
        - generic: Nice landing! Release controls before your next swing.
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 0, -18, 38 • 33 FPS
      - generic: Every building face is climbable. Mint paths teach the route. Hold C / RB / R1 to climb onto a roof.
    - status:
      - generic: CONTROLLER
      - strong: "Controller ready: PlayStation controller"
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
  - status: "Checkpoint: First gap: jump and hold the close ring, then let go."
```

# Test source

```ts
  195 | });
  196 | 
  197 | async function installPad(page: Page) {
  198 |   await page.addInitScript(() => {
  199 |     const w = window as any;
  200 |     w.__wm002pad = {
  201 |       id: "DualSense Wireless Controller",
  202 |       connected: true,
  203 |       axes: [0, 0, 0, 0],
  204 |       pressed: [],
  205 |     };
  206 |     Object.defineProperty(navigator, "getGamepads", {
  207 |       configurable: true,
  208 |       value: () => {
  209 |         const p = w.__wm002pad;
  210 |         return p.connected
  211 |           ? [
  212 |               {
  213 |                 id: p.id,
  214 |                 index: 0,
  215 |                 connected: true,
  216 |                 mapping: "standard",
  217 |                 timestamp: performance.now(),
  218 |                 axes: p.axes,
  219 |                 buttons: Array.from({ length: 17 }, (_, i) => ({
  220 |                   pressed: p.pressed.includes(i),
  221 |                   value: p.pressed.includes(i) ? 1 : 0,
  222 |                   touched: p.pressed.includes(i),
  223 |                 })),
  224 |               },
  225 |               null,
  226 |               null,
  227 |               null,
  228 |             ]
  229 |           : [];
  230 |       },
  231 |     });
  232 |   });
  233 | }
  234 | async function pad(
  235 |   page: Page,
  236 |   pressed: number[] = [],
  237 |   axes: number[] = [0, 0, 0, 0],
  238 | ) {
  239 |   await page.evaluate(
  240 |     ({ pressed, axes }) =>
  241 |       Object.assign((window as any).__wm002pad, { pressed, axes }),
  242 |     { pressed, axes },
  243 |   );
  244 | }
  245 | async function padReady(page: Page) {
  246 |   await page.waitForFunction(
  247 |     () =>
  248 |       window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
  249 |       "CONTROLLER_READY",
  250 |   );
  251 | }
  252 | async function tap(page: Page, button: number) {
  253 |   await pad(page, [button]);
  254 |   await page.waitForTimeout(90);
  255 |   await pad(page);
  256 |   await page.waitForTimeout(155);
  257 |   await padReady(page);
  258 | }
  259 | async function controllerStart(page: Page) {
  260 |   await installPad(page);
  261 |   await page.goto("/?test=1");
  262 |   await expect(page.locator("#loading")).toHaveClass(/hidden/, {
  263 |     timeout: 30000,
  264 |   });
  265 |   await pad(page, [0]);
  266 |   await page.waitForTimeout(100);
  267 |   await expect
  268 |     .poll(async () =>
  269 |       page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus().lifecycle),
  270 |     )
  271 |     .toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
  272 |   await pad(page);
  273 |   await padReady(page);
  274 |   await tap(page, 0);
  275 |   await expect(
  276 |     page.getByRole("heading", { name: "Choose a save slot" }),
  277 |   ).toBeVisible();
  278 |   await tap(page, 0);
  279 |   await tap(page, 13);
  280 |   await tap(page, 0);
  281 |   await expect(page.locator("#input-overlay")).toBeVisible();
  282 |   await padReady(page);
  283 | }
  284 | async function controllerRoute(page: Page) {
  285 |   await pad(page, [], [0, 0, 0, 1]);
  286 |   await page.waitForFunction(
  287 |     () => window.__WM_DEBUG__!.getState().cameraBeta >= 1.6,
  288 |   );
  289 |   await pad(page);
  290 |   await pad(page, [7], [0, -1, 0, 0]);
  291 |   await until(page, "z", 21);
  292 |   await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  293 |   await page.waitForTimeout(70);
  294 |   await pad(page, [7, 6], [0, -1, 0, 0]);
> 295 |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
      |              ^ Error: page.waitForFunction: Test timeout of 100000ms exceeded.
  296 |   await shot(page, "controller-ready-hand-web");
  297 |   await until(page, "z", 37);
  298 |   await pad(page, [7], [0, -1, 0, 0]);
  299 |   await stage(page, 1);
  300 |   await until(page, "z", 53);
  301 |   await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  302 |   await page.waitForTimeout(70);
  303 |   await pad(page, [7, 6], [0, -1, 0, 0]);
  304 |   await until(page, "z", 76.5);
  305 |   await pad(page, [7], [0, -1, 0, 0]);
  306 |   await stage(page, 2);
  307 |   await until(page, "z", 95);
  308 |   await pad(page, [7, 6, 0], [0, -1, 0, 0]);
  309 |   await page.waitForTimeout(70);
  310 |   await pad(page, [7, 6], [0, -1, 0, 0]);
  311 |   await until(page, "z", 122);
  312 |   await pad(page, [7], [0, -1, 0, 0]);
  313 |   await until(page, "z", 123.2);
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
```