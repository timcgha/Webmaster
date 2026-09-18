# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 rendered keyboard and mouse journey >> explains and enforces safe-state saving while airborne
- Location: e2e\wm001.spec.ts:298:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('button', { name: /^Save Game/ })
Expected substring: "Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering"
Received string:    "Save GameUnavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state."
Timeout: 15000ms

Call log:
  - Expect "toContainText" getByRole('button', { name: /^Save Game/ }) with timeout 15000ms
  - waiting for getByRole('button', { name: /^Save Game/ })
    31 × locator resolved to <button disabled type="button" data-menu-item="1" aria-current="false">…</button>
       - unexpected value "Save GameUnavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state."

```

```yaml
- button "Save Game Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight. Resume to reach a safe state." [disabled]
```

# Test source

```ts
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
  239 |     // Release keys in the same browser frame as the waypoint. A remote RPC
  240 |     // after observing X can arrive late enough to walk into the cyan obstacle.
  241 |     const routeSamples=await page.evaluate(async()=>{
  242 |       const held=new Set<string>(),samples:any[]=[];
  243 |       const keys=(...wanted:string[])=>{const next=new Set(wanted);
  244 |         for(const k of new Set([...held,...next]))if(held.has(k)!==next.has(k))
  245 |           window.dispatchEvent(new KeyboardEvent(next.has(k)?'keydown':'keyup',{key:k,code:k==='Shift'?'ShiftLeft':`Key${k.toUpperCase()}`,bubbles:true}));
  246 |         held.clear();for(const k of next)held.add(k);
  247 |       };
  248 |       const until=async(check:(s:any)=>boolean,label:string)=>{const begun=performance.now();
  249 |         while(!check(window.__WM_DEBUG__!.getState())){if(performance.now()-begun>15000)throw new Error(`${label}: ${JSON.stringify(window.__WM_DEBUG__!.getState())}`);await new Promise(requestAnimationFrame);}
  250 |         samples.push({label,state:window.__WM_DEBUG__!.getState()});
  251 |       };
  252 |       try{
  253 |         keys('Shift','w');await until(s=>s.position.z>3,'first gate');
  254 |         keys('Shift','w','d');await until(s=>s.progress===2,'sun pad');
  255 |         keys('Shift','a');await until(s=>s.position.x < -2.6,'finish lane');
  256 |         keys();await until(s=>s.velocity.x===0&&s.velocity.z===0,'braked before obstacle');
  257 |         keys('Shift','w');await until(s=>s.progress===3,'finish earned');
  258 |         keys();await until(s=>s.velocity.x===0&&s.velocity.z===0,'finish stopped');
  259 |       }finally{keys();}
  260 |       return samples;
  261 |     });
  262 |     await writeFile(`${captures}/${browserName}-practice-route-frame-inputs.json`,JSON.stringify({method:'Same-frame ordinary DOM keyboard waypoint input; position/progress/time read-only, route-start fixture remains labelled',routeSamples},null,2));
  263 |     const lane=routeSamples.find(x=>x.label==='braked before obstacle')!.state.position;
  264 |     expect(lane.x).toBeGreaterThan(-4.8);expect(lane.x).toBeLessThan(-2.2);
  265 |     expect((await state(page)).progress).toBe(3);
  266 |     expect((await state(page)).grounded).toBe(true);
  267 |     await page.screenshot({ path: `${captures}/${browserName}-route-complete.png` });
  268 | 
  269 |     await page.keyboard.down("w");
  270 |     await page.waitForTimeout(180);
  271 |     await page.keyboard.press("Escape");
  272 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  273 |     const pausePosition = (await state(page)).position;
  274 |     await page.waitForTimeout(500);
  275 |     expect((await state(page)).position).toEqual(pausePosition);
  276 |     await page.keyboard.up("w");
  277 |     await page.getByRole("button", { name: /Resume/ }).click();
  278 |     await page.waitForTimeout(1200);
  279 |     expect((await state(page)).position).toEqual(pausePosition);
  280 |     await hold(page, ["w"], 250);
  281 |     expect((await state(page)).position.z).not.toBe(pausePosition.z);
  282 |   });
  283 | 
  284 |   test("recovers outside the bounded street, reduces health, and performs a clean zero-health retry", async ({ page, browserName }) => {
  285 |     await ready(page);
  286 |     await newGameWithMouse(page, 2, "Easy");
  287 |     for (let fall = 0; fall < 3; fall += 1) {
  288 |       await page.evaluate((index) => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -31, z: 0 }, `negative out-of-bounds setup ${index + 1}/4`), fall);
  289 |       await page.waitForTimeout(800);
  290 |     }
  291 |     expect((await state(page)).health).toBe(25);
  292 |     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 18, y: -31, z: 0 }, "negative out-of-bounds setup 4/4"));
  293 |     await page.waitForTimeout(800);
  294 |     expect((await state(page)).health).toBe(100);
  295 |     await page.screenshot({ path: `${captures}/${browserName}-recovery-fixture-labelled.png` });
  296 |   });
  297 | 
  298 |   test("explains and enforces safe-state saving while airborne", async ({ page, browserName }) => {
  299 |     await ready(page);
  300 |     await newGameWithMouse(page, 1, "Easy");
  301 |     await page.keyboard.press("Space");
  302 |     await page.waitForTimeout(120);
  303 |     expect((await state(page)).grounded).toBe(false);
  304 |     await page.keyboard.press("Escape");
  305 |     await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  306 |     for (const name of [/^Save Game/, /^Save & Quit/]) {
  307 |       const button = page.getByRole("button", { name });
  308 |       await expect(button).toBeDisabled();
> 309 |       await expect(button).toContainText("Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering");
      |                            ^ Error: expect(locator).toContainText(expected) failed
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
  406 |     expect((await state(page)).position.z).toBeGreaterThan(disconnectedAt.z);
  407 |   });
  408 | 
  409 |   test("shows PlayStation-style prompts without changing standard semantic actions", async ({ page }) => {
```