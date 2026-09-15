# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 rendered keyboard and mouse journey >> explains and enforces safe-state saving while airborne
- Location: e2e/wm001.spec.ts:282:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('button', { name: /^Save Game/ })
Expected substring: "Unavailable while swinging, airborne, landing or recovering"
Received string:    "Save GameUnavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering — resume to reach safe ground"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('button', { name: /^Save Game/ }) with timeout 5000ms
  - waiting for getByRole('button', { name: /^Save Game/ })
    14 × locator resolved to <button disabled type="button" data-menu-item="1" aria-current="false">…</button>
       - unexpected value "Save GameUnavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering — resume to reach safe ground"

```

```yaml
- button "Save Game Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering — resume to reach safe ground" [disabled]
```

# Test source

```ts
  193 |       window.addEventListener("mouseup", () => ((window as any).__wmMouseEvidence.up += 1));
  194 |     });
  195 |     const startX = box!.x + box!.width / 2;
  196 |     const startY = box!.y + box!.height / 2;
  197 |     await canvas.dispatchEvent("mousedown", { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true });
  198 |     for (let step = 1; step <= 8; step += 1) {
  199 |       await page.locator("body").dispatchEvent("mousemove", {
  200 |         clientX: startX + (150 * step) / 8,
  201 |         clientY: startY - (45 * step) / 8,
  202 |         buttons: 1,
  203 |         bubbles: true,
  204 |       });
  205 |       await page.waitForTimeout(20);
  206 |     }
  207 |     await page.locator("body").dispatchEvent("mouseup", { clientX: startX + 150, clientY: startY - 45, button: 0, bubbles: true });
  208 |     await page.waitForTimeout(100);
  209 |     expect(await page.evaluate(() => (window as any).__wmMouseEvidence)).toMatchObject({ down: 1, up: 1 });
  210 |     expect((await page.evaluate(() => window.__WM_DEBUG__!.getInputDebug())).lookXTotal).toBeGreaterThan(100);
  211 |     const orbited = await state(page);
  212 |     expect(Math.abs(orbited.cameraAlpha + Math.PI / 2)).toBeGreaterThan(0.15);
  213 |     await page.keyboard.press("r");
  214 |     await page.waitForTimeout(100);
  215 |     const recentered = await state(page);
  216 |     expect(recentered.cameraAlpha).toBeCloseTo(-Math.PI / 2, 2);
  217 | 
  218 |     await canvas.dispatchEvent("mousedown", { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true });
  219 |     await page.locator("body").dispatchEvent("mousemove", {
  220 |       clientX: startX - 900,
  221 |       clientY: startY,
  222 |       buttons: 1,
  223 |       bubbles: true,
  224 |     });
  225 |     await page.locator("body").dispatchEvent("mouseup", { clientX: startX - 900, clientY: startY, button: 0, bubbles: true });
  226 |     await page.waitForTimeout(150);
  227 |     expect((await state(page)).cameraAlpha).toBeCloseTo(Math.PI / 2, 1);
  228 |     await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-hero-front-ordinary-camera.png` });
  229 |     await page.keyboard.press("r");
  230 |     await page.waitForTimeout(100);
  231 | 
  232 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: -4.5, y: 0, z: -3 }, "collision approach only"));
  233 |     await hold(page, ["w"], 900);
  234 |     const blocked = await state(page);
  235 |     expect(blocked.position.z).toBeLessThan(-2.05);
  236 | 
  237 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 0, y: 0, z: -8 }, "route start only"));
  238 |     await hold(page, ["w", "Shift"], 1250);
  239 |     expect((await state(page)).progress).toBeGreaterThanOrEqual(1);
  240 |     await hold(page, ["w", "d", "Shift"], 1350);
  241 |     expect((await state(page)).progress).toBeGreaterThanOrEqual(2);
  242 |     await hold(page, ["a", "Shift"], 1300);
  243 |     await page.keyboard.down("w");
  244 |     await page.keyboard.down("Shift");
  245 |     await expect.poll(async () => (await state(page)).progress, { timeout: 4_000, intervals: [50] }).toBe(3);
  246 |     await page.keyboard.up("Shift");
  247 |     await page.keyboard.up("w");
  248 |     await page.waitForTimeout(100);
  249 |     expect((await state(page)).progress).toBe(3);
  250 |     expect((await state(page)).grounded).toBe(true);
  251 |     await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-route-complete.png` });
  252 | 
  253 |     await page.keyboard.down("w");
  254 |     await page.waitForTimeout(180);
  255 |     await page.keyboard.press("Escape");
  256 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  257 |     const pausePosition = (await state(page)).position;
  258 |     await page.waitForTimeout(500);
  259 |     expect((await state(page)).position).toEqual(pausePosition);
  260 |     await page.keyboard.up("w");
  261 |     await page.getByRole("button", { name: /Resume/ }).click();
  262 |     await page.waitForTimeout(1200);
  263 |     expect((await state(page)).position).toEqual(pausePosition);
  264 |     await hold(page, ["w"], 250);
  265 |     expect((await state(page)).position.z).not.toBe(pausePosition.z);
  266 |   });
  267 | 
  268 |   test("recovers from a fall, reduces health, and performs a clean zero-health retry", async ({ page, browserName }) => {
  269 |     await ready(page);
  270 |     await newGameWithMouse(page, 2, "Easy");
  271 |     for (let fall = 0; fall < 3; fall += 1) {
  272 |       await page.evaluate((index) => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -11, z: 0 }, `fall setup ${index + 1}/4`), fall);
  273 |       await page.waitForTimeout(800);
  274 |     }
  275 |     expect((await state(page)).health).toBe(25);
  276 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -11, z: 0 }, "fall setup 4/4"));
  277 |     await page.waitForTimeout(800);
  278 |     expect((await state(page)).health).toBe(100);
  279 |     await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-recovery-fixture-labelled.png` });
  280 |   });
  281 | 
  282 |   test("explains and enforces safe-state saving while airborne", async ({ page, browserName }) => {
  283 |     await ready(page);
  284 |     await newGameWithMouse(page, 1, "Easy");
  285 |     await page.keyboard.press("Space");
  286 |     await page.waitForTimeout(120);
  287 |     expect((await state(page)).grounded).toBe(false);
  288 |     await page.keyboard.press("Escape");
  289 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  290 |     for (const name of [/^Save Game/, /^Save & Quit/]) {
  291 |       const button = page.getByRole("button", { name });
  292 |       await expect(button).toBeDisabled();
> 293 |       await expect(button).toContainText("Unavailable while swinging, airborne, landing or recovering");
      |                            ^ Error: expect(locator).toContainText(expected) failed
  294 |     }
  295 |     await expect(page.getByRole("button", { name: /^Resume/ })).toBeEnabled();
  296 |     await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-airborne-safe-save-disabled.png` });
  297 |   });
  298 | });
  299 | 
  300 | test.describe("WM-001 rendered simulated Gamepad journey", () => {
  301 |   test.beforeEach(async ({ page }) => installGamepad(page));
  302 | 
  303 |   test("uses gamepad alone for new game, movement, camera, pause, save, save-and-quit, Continue, and Load", async ({ page, browserName }) => {
  304 |     await ready(page);
  305 |     await activatePad(page);
  306 |     await tapPad(page, 0);
  307 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  308 |     await tapPad(page, 0);
  309 |     await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  310 |     await tapPad(page, 13);
  311 |     await tapPad(page, 0);
  312 |     await expect(page.locator("#input-overlay")).toBeVisible();
  313 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun()?.difficulty)).toBe("Normal");
  314 | 
  315 |     const beforeMove = await state(page);
  316 |     await setPad(page, { axes: [0, -1, 0, 0] });
  317 |     await page.waitForTimeout(750);
  318 |     await setPad(page, { axes: [0, 0, 0, 0] });
  319 |     expect((await state(page)).position.z).toBeGreaterThan(beforeMove.position.z + 2);
  320 |     await setPad(page, { pressed: [0] });
  321 |     expect((await state(page)).position.y).toBeGreaterThan(0.1);
  322 |     await setPad(page, { pressed: [] });
  323 |     await page.waitForTimeout(850);
  324 |     expect((await state(page)).grounded).toBe(true);
  325 |     await setPad(page, { axes: [0, -1, 0, 0], pressed: [7] });
  326 |     await page.waitForTimeout(300);
  327 |     await setPad(page, { axes: [0, 0, 0, 0], pressed: [] });
  328 |     const cameraBefore = (await state(page)).cameraAlpha;
  329 |     await setPad(page, { axes: [0, 0, 0.8, -0.5] });
  330 |     await page.waitForTimeout(900);
  331 |     await setPad(page, { axes: [0, 0, 0, 0] });
  332 |     expect((await state(page)).cameraAlpha).not.toBe(cameraBefore);
  333 |     await tapPad(page, 10);
  334 | 
  335 |     await tapPad(page, 9);
  336 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  337 |     await tapPad(page, 13);
  338 |     await tapPad(page, 0);
  339 |     await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  340 |     await tapPad(page, 13);
  341 |     await tapPad(page, 13);
  342 |     await tapPad(page, 0);
  343 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  344 | 
  345 |     await tapPad(page, 13);
  346 |     await tapPad(page, 0);
  347 |     await expect(page.locator("#input-overlay")).toBeVisible();
  348 |     await tapPad(page, 9);
  349 |     await tapPad(page, 13);
  350 |     await tapPad(page, 13);
  351 |     await tapPad(page, 0);
  352 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  353 |     await tapPad(page, 13);
  354 |     await tapPad(page, 13);
  355 |     await tapPad(page, 0);
  356 |     await expect(page.getByRole("heading", { name: "Load a run" })).toBeVisible();
  357 |     await tapPad(page, 0);
  358 |     await expect(page.locator("#input-overlay")).toBeVisible();
  359 |     await page.screenshot({ path: `evidence/wm-001/captures/${browserName}-simulated-xbox-route.png` });
  360 |   });
  361 | 
  362 |   test("disconnect releases motion and reconnect requires neutral then fresh input", async ({ page }) => {
  363 |     await ready(page);
  364 |     await activatePad(page);
  365 |     await tapPad(page, 0);
  366 |     await tapPad(page, 0);
  367 |     await tapPad(page, 0);
  368 |     await expect(page.locator("#input-overlay")).toBeVisible();
  369 |     await setPad(page, { axes: [0, -1, 0, 0] });
  370 |     await page.waitForTimeout(250);
  371 |     await setPad(page, { connected: false });
  372 |     const disconnectedAt = (await state(page)).position;
  373 |     await page.waitForTimeout(350);
  374 |     expect((await state(page)).position).toEqual(disconnectedAt);
  375 |     await setPad(page, { connected: true, axes: [0, -1, 0, 0] });
  376 |     await page.waitForTimeout(350);
  377 |     expect((await state(page)).position).toEqual(disconnectedAt);
  378 |     await setPad(page, { axes: [0, 0, 0, 0] });
  379 |     await setPad(page, { axes: [0, -1, 0, 0] });
  380 |     await page.waitForTimeout(300);
  381 |     expect((await state(page)).position.z).toBeGreaterThan(disconnectedAt.z);
  382 |   });
  383 | 
  384 |   test("shows PlayStation-style prompts without changing standard semantic actions", async ({ page }) => {
  385 |     await ready(page);
  386 |     await setPad(page, { id: "DualSense Wireless Controller", axes: [0, 0, 0, 0], pressed: [] });
  387 |     await activatePad(page);
  388 |     await tapPad(page, 0);
  389 |     await expect(page.getByText(/Options Pause/)).toBeVisible();
  390 |   });
  391 | 
  392 |   test("operates persisted main and pause settings without mouse or typing", async ({ page }) => {
  393 |     await ready(page);
```