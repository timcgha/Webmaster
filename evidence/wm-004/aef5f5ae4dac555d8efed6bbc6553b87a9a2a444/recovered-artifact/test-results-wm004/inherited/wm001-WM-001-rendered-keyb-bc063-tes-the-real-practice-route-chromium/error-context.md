# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 rendered keyboard and mouse journey >> moves, jumps, orbits, recenters, collides, pauses safely, and completes the real practice route
- Location: e2e\wm001.spec.ts:166:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 3
Received: 2

Call Log:
- Timeout 4000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - region "Current objective":
      - text: STREET RECOVERY
      - strong: Follow mint paths to striped walls. Hold C / RB / R1 to climb onto a roof.
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: "-1, -18, 38 • 42 FPS"
      - generic: Follow mint paths to striped walls. Hold C / RB / R1 to climb onto a roof.
    - status:
      - generic: CONTROLLER
      - strong: "Controller: press any button or move a stick to connect"
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
    - region "Swing status":
      - text: "SWING: Hold E / LT • release to let go"
      - strong: Find a glowing ring
      - generic: Aim at a glowing ring. Walk toward the skyline arrows.
    - paragraph: "TEST FIXTURE: route start only"
  - status: "Checkpoint: Race to the pink finish beacon"
```

# Test source

```ts
  146 | async function tapPad(page: Page, button: number): Promise<void> {
  147 |   await setPad(page, { pressed: [button] });
  148 |   await setPad(page, { pressed: [] });
  149 |   await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle).toBe("CONTROLLER_READY");
  150 | }
  151 | 
  152 | async function tapPadAt(page: Page, index: number, button: number): Promise<void> {
  153 |   await patchPad(page, index, { pressed: [button] });
  154 |   await patchPad(page, index, { pressed: [] });
  155 |   await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle).toBe("CONTROLLER_READY");
  156 | }
  157 | 
  158 | async function activatePad(page: Page, index = 0): Promise<void> {
  159 |   await patchPad(page, index, { pressed: [0] });
  160 |   await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle).toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
  161 |   await patchPad(page, index, { pressed: [] });
  162 |   await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle).toBe("CONTROLLER_READY");
  163 | }
  164 | 
  165 | test.describe("WM-001 rendered keyboard and mouse journey", () => {
  166 |   test("moves, jumps, orbits, recenters, collides, pauses safely, and completes the real practice route", async ({ page, browserName }) => {
  167 |     await ready(page);
  168 |     await page.screenshot({ path: `${captures}/${browserName}-main-1280x720.png` });
  169 |     await newGameWithMouse(page, 1, "Normal");
  170 |     const start = await state(page);
  171 |     await hold(page, ["w", "Shift"], 850);
  172 |     const moved = await state(page);
  173 |     expect(moved.position.z).toBeGreaterThan(start.position.z + 3);
  174 | 
  175 |     await page.keyboard.press("Space");
  176 |     await page.waitForTimeout(120);
  177 |     expect((await state(page)).position.y).toBeGreaterThan(0.1);
  178 |     await page.waitForTimeout(900);
  179 |     expect((await state(page)).grounded).toBe(true);
  180 | 
  181 |     const canvas = page.locator("#game-canvas");
  182 |     const box = await canvas.boundingBox();
  183 |     expect(box).not.toBeNull();
  184 |     expect(
  185 |       await page.evaluate(
  186 |         ({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.id,
  187 |         { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  188 |       ),
  189 |     ).toBe("game-canvas");
  190 |     await page.evaluate(() => {
  191 |       (window as any).__wmMouseEvidence = { down: 0, move: 0, up: 0 };
  192 |       window.addEventListener("mousedown", () => ((window as any).__wmMouseEvidence.down += 1));
  193 |       window.addEventListener("mousemove", () => ((window as any).__wmMouseEvidence.move += 1));
  194 |       window.addEventListener("mouseup", () => ((window as any).__wmMouseEvidence.up += 1));
  195 |     });
  196 |     const startX = box!.x + box!.width / 2;
  197 |     const startY = box!.y + box!.height / 2;
  198 |     await canvas.dispatchEvent("mousedown", { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true });
  199 |     for (let step = 1; step <= 8; step += 1) {
  200 |       await page.locator("body").dispatchEvent("mousemove", {
  201 |         clientX: startX + (150 * step) / 8,
  202 |         clientY: startY - (45 * step) / 8,
  203 |         buttons: 1,
  204 |         bubbles: true,
  205 |       });
  206 |       await page.waitForTimeout(20);
  207 |     }
  208 |     await page.locator("body").dispatchEvent("mouseup", { clientX: startX + 150, clientY: startY - 45, button: 0, bubbles: true });
  209 |     await page.waitForTimeout(100);
  210 |     expect(await page.evaluate(() => (window as any).__wmMouseEvidence)).toMatchObject({ down: 1, up: 1 });
  211 |     expect((await page.evaluate(() => window.__WM_DEBUG__!.getInputDebug())).lookXTotal).toBeGreaterThan(100);
  212 |     const orbited = await state(page);
  213 |     expect(Math.abs(orbited.cameraAlpha + Math.PI / 2)).toBeGreaterThan(0.15);
  214 |     await page.keyboard.press("r");
  215 |     await page.waitForTimeout(100);
  216 |     const recentered = await state(page);
  217 |     expect(recentered.cameraAlpha).toBeCloseTo(-Math.PI / 2, 2);
  218 | 
  219 |     await canvas.dispatchEvent("mousedown", { clientX: startX, clientY: startY, button: 0, buttons: 1, bubbles: true });
  220 |     await page.locator("body").dispatchEvent("mousemove", {
  221 |       clientX: startX - 900,
  222 |       clientY: startY,
  223 |       buttons: 1,
  224 |       bubbles: true,
  225 |     });
  226 |     await page.locator("body").dispatchEvent("mouseup", { clientX: startX - 900, clientY: startY, button: 0, bubbles: true });
  227 |     await page.waitForTimeout(150);
  228 |     expect((await state(page)).cameraAlpha).toBeCloseTo(Math.PI / 2, 1);
  229 |     await page.screenshot({ path: `${captures}/${browserName}-hero-front-ordinary-camera.png` });
  230 |     await page.keyboard.press("r");
  231 |     await page.waitForTimeout(100);
  232 | 
  233 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: -4.5, y: 0, z: -3 }, "collision approach only"));
  234 |     await hold(page, ["w"], 900);
  235 |     const blocked = await state(page);
  236 |     expect(blocked.position.z).toBeLessThan(-2.05);
  237 | 
  238 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 0, y: 0, z: -8 }, "route start only"));
  239 |     await hold(page, ["w", "Shift"], 1250);
  240 |     expect((await state(page)).progress).toBeGreaterThanOrEqual(1);
  241 |     await hold(page, ["w", "d", "Shift"], 1350);
  242 |     expect((await state(page)).progress).toBeGreaterThanOrEqual(2);
  243 |     await hold(page, ["a", "Shift"], 1300);
  244 |     await page.keyboard.down("w");
  245 |     await page.keyboard.down("Shift");
> 246 |     await expect.poll(async () => (await state(page)).progress, { timeout: 4_000, intervals: [50] }).toBe(3);
      |                                                                                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  247 |     await page.keyboard.up("Shift");
  248 |     await page.keyboard.up("w");
  249 |     await page.waitForTimeout(100);
  250 |     expect((await state(page)).progress).toBe(3);
  251 |     expect((await state(page)).grounded).toBe(true);
  252 |     await page.screenshot({ path: `${captures}/${browserName}-route-complete.png` });
  253 | 
  254 |     await page.keyboard.down("w");
  255 |     await page.waitForTimeout(180);
  256 |     await page.keyboard.press("Escape");
  257 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  258 |     const pausePosition = (await state(page)).position;
  259 |     await page.waitForTimeout(500);
  260 |     expect((await state(page)).position).toEqual(pausePosition);
  261 |     await page.keyboard.up("w");
  262 |     await page.getByRole("button", { name: /Resume/ }).click();
  263 |     await page.waitForTimeout(1200);
  264 |     expect((await state(page)).position).toEqual(pausePosition);
  265 |     await hold(page, ["w"], 250);
  266 |     expect((await state(page)).position.z).not.toBe(pausePosition.z);
  267 |   });
  268 | 
  269 |   test("recovers outside the bounded street, reduces health, and performs a clean zero-health retry", async ({ page, browserName }) => {
  270 |     await ready(page);
  271 |     await newGameWithMouse(page, 2, "Easy");
  272 |     for (let fall = 0; fall < 3; fall += 1) {
  273 |       await page.evaluate((index) => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -31, z: 0 }, `negative out-of-bounds setup ${index + 1}/4`), fall);
  274 |       await page.waitForTimeout(800);
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
```