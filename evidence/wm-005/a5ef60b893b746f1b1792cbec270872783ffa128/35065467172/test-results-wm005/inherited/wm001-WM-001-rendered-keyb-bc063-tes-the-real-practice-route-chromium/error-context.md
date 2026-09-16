# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 rendered keyboard and mouse journey >> moves, jumps, orbits, recenters, collides, pauses safely, and completes the real practice route
- Location: e2e\wm001.spec.ts:166:3

# Error details

```
TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: PRACTICE 3 / 3
        - strong: Race to the pink finish beacon
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: "-5, 0, 9 • 36 FPS"
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
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
    - paragraph: "TEST FIXTURE: route start only"
  - status: "Checkpoint: Race to the pink finish beacon"
```

# Test source

```ts
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
  239 |     // Observe actual route coordinates rather than relying on wall-clock travel
  240 |     // distances, which vary on software rendering and can miss the finish lane.
  241 |     await page.keyboard.down("Shift");await page.keyboard.down("w");
  242 |     await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().position.z>3,null,{timeout:15000});
  243 |     expect((await state(page)).progress).toBeGreaterThanOrEqual(1);
  244 |     await page.keyboard.down("d");
  245 |     await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().progress===2,null,{timeout:15000});
  246 |     await page.keyboard.up("w");await page.keyboard.up("d");await page.keyboard.down("a");
  247 |     await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().position.x < -3.5,null,{timeout:15000});
  248 |     await page.keyboard.up("a");await page.keyboard.down("w");
> 249 |     await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().progress===3,null,{timeout:15000});
      |                ^ TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
  250 |     await page.keyboard.up("Shift");await page.keyboard.up("w");await page.waitForTimeout(100);
  251 |     expect((await state(page)).progress).toBe(3);
  252 |     expect((await state(page)).grounded).toBe(true);
  253 |     await page.screenshot({ path: `${captures}/${browserName}-route-complete.png` });
  254 | 
  255 |     await page.keyboard.down("w");
  256 |     await page.waitForTimeout(180);
  257 |     await page.keyboard.press("Escape");
  258 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  259 |     const pausePosition = (await state(page)).position;
  260 |     await page.waitForTimeout(500);
  261 |     expect((await state(page)).position).toEqual(pausePosition);
  262 |     await page.keyboard.up("w");
  263 |     await page.getByRole("button", { name: /Resume/ }).click();
  264 |     await page.waitForTimeout(1200);
  265 |     expect((await state(page)).position).toEqual(pausePosition);
  266 |     await hold(page, ["w"], 250);
  267 |     expect((await state(page)).position.z).not.toBe(pausePosition.z);
  268 |   });
  269 | 
  270 |   test("recovers outside the bounded street, reduces health, and performs a clean zero-health retry", async ({ page, browserName }) => {
  271 |     await ready(page);
  272 |     await newGameWithMouse(page, 2, "Easy");
  273 |     for (let fall = 0; fall < 3; fall += 1) {
  274 |       await page.evaluate((index) => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -31, z: 0 }, `negative out-of-bounds setup ${index + 1}/4`), fall);
  275 |       await page.waitForTimeout(800);
  276 |     }
  277 |     expect((await state(page)).health).toBe(25);
  278 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -31, z: 0 }, "negative out-of-bounds setup 4/4"));
  279 |     await page.waitForTimeout(800);
  280 |     expect((await state(page)).health).toBe(100);
  281 |     await page.screenshot({ path: `${captures}/${browserName}-recovery-fixture-labelled.png` });
  282 |   });
  283 | 
  284 |   test("explains and enforces safe-state saving while airborne", async ({ page, browserName }) => {
  285 |     await ready(page);
  286 |     await newGameWithMouse(page, 1, "Easy");
  287 |     await page.keyboard.press("Space");
  288 |     await page.waitForTimeout(120);
  289 |     expect((await state(page)).grounded).toBe(false);
  290 |     await page.keyboard.press("Escape");
  291 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  292 |     for (const name of [/^Save Game/, /^Save & Quit/]) {
  293 |       const button = page.getByRole("button", { name });
  294 |       await expect(button).toBeDisabled();
  295 |       await expect(button).toContainText("Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering");
  296 |     }
  297 |     await expect(page.getByRole("button", { name: /^Resume/ })).toBeEnabled();
  298 |     await page.screenshot({ path: `${captures}/${browserName}-airborne-safe-save-disabled.png` });
  299 |   });
  300 | });
  301 | 
  302 | test.describe("WM-001 rendered simulated Gamepad journey", () => {
  303 |   test.beforeEach(async ({ page }) => installGamepad(page));
  304 | 
  305 |   test("uses gamepad alone for new game, movement, camera, pause, save, save-and-quit, Continue, and Load", async ({ page, browserName }) => {
  306 |     await ready(page);
  307 |     await activatePad(page);
  308 |     await tapPad(page, 0);
  309 |     await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  310 |     await tapPad(page, 0);
  311 |     await expect(page.getByRole("heading", { name: "Choose difficulty" })).toBeVisible();
  312 |     await tapPad(page, 13);
  313 |     await tapPad(page, 0);
  314 |     await expect(page.locator("#input-overlay")).toBeVisible();
  315 |     expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun()?.difficulty)).toBe("Normal");
  316 | 
  317 |     const beforeMove = await state(page);
  318 |     await setPad(page, { axes: [0, -1, 0, 0] });
  319 |     await page.waitForTimeout(750);
  320 |     await setPad(page, { axes: [0, 0, 0, 0] });
  321 |     expect((await state(page)).position.z).toBeGreaterThan(beforeMove.position.z + 2);
  322 |     await setPad(page, { pressed: [0] });
  323 |     expect((await state(page)).position.y).toBeGreaterThan(0.1);
  324 |     await setPad(page, { pressed: [] });
  325 |     await page.waitForTimeout(850);
  326 |     expect((await state(page)).grounded).toBe(true);
  327 |     await setPad(page, { axes: [0, -1, 0, 0], pressed: [7] });
  328 |     await page.waitForTimeout(300);
  329 |     await setPad(page, { axes: [0, 0, 0, 0], pressed: [] });
  330 |     const cameraBefore = (await state(page)).cameraAlpha;
  331 |     await setPad(page, { axes: [0, 0, 0.8, -0.5] });
  332 |     await page.waitForTimeout(900);
  333 |     await setPad(page, { axes: [0, 0, 0, 0] });
  334 |     expect((await state(page)).cameraAlpha).not.toBe(cameraBefore);
  335 |     await tapPad(page, 10);
  336 | 
  337 |     await tapPad(page, 9);
  338 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  339 |     await tapPad(page, 13);
  340 |     await tapPad(page, 0);
  341 |     await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  342 |     await tapPad(page, 13);
  343 |     await tapPad(page, 13);
  344 |     await tapPad(page, 0);
  345 |     await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  346 | 
  347 |     await tapPad(page, 13);
  348 |     await tapPad(page, 0);
  349 |     await expect(page.locator("#input-overlay")).toBeVisible();
```