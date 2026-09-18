# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm003.spec.ts >> WM003 negative lifecycle probes: wall pause focus pull interruption heavy feedback and blocked web
- Location: e2e\wm003.spec.ts:282:1

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
          - button "Restart at checkpoint Full health, current progress" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: Restart at checkpoint
            - generic [ref=e15]: Full health, current progress
          - button "Settings Camera and display" [ref=e16] [cursor=pointer]:
            - generic [ref=e17]: Settings
            - generic [ref=e18]: Camera and display
          - button "Controller Details Connection status and local diagnostics" [ref=e19] [cursor=pointer]:
            - generic [ref=e20]: Controller Details
            - generic [ref=e21]: Connection status and local diagnostics
          - button "Replay 20-ring course Start on the far practice roof; separate course progress restarts" [ref=e22] [cursor=pointer]:
            - generic [ref=e23]: Replay 20-ring course
            - generic [ref=e24]: Start on the far practice roof; separate course progress restarts
          - button "Combat Playground Punch, kick, web and dodge training · no timer · progress in this activity restarts" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Combat Playground
            - generic [ref=e27]: Punch, kick, web and dodge training · no timer · progress in this activity restarts
        - paragraph: "A / ✕ Select & Jump • B / ○ Back • Menu / Options Pause • Keyboard: arrows + Enter / Esc"
  - status: Slot 1 started on Normal
```

# Test source

```ts
  209 |     throw e;
  210 |   }
  211 |   expect((await state(page)).skyline.completed).toBe(true);
  212 |   await page.keyboard.press("Escape");
  213 |   await page.getByRole("button", { name: /Replay skyline/ }).click();
  214 |   await route(page, keyboard(page), "cross-sprint");
  215 |   await page.keyboard.press("Escape");
  216 |   await expect(page.getByRole("button", { name: /^Save Game/ })).toBeEnabled();
  217 |   await page.getByRole("button", { name: /^Save Game/ }).click();
  218 |   await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  219 |   const before = await page.evaluate(() =>
  220 |     Object.fromEntries(
  221 |       Object.entries(localStorage).filter(([k]) =>
  222 |         k.startsWith("webmaster.save"),
  223 |       ),
  224 |     ),
  225 |   );
  226 |   const saved = await state(page);
  227 |   await context.close();
  228 |   context = await playwright.chromium.launchPersistentContext(profile, options);
  229 |   page = await context.newPage();
  230 |   await page.goto("/?test=1");
  231 |   await expect(page.locator("#loading")).toHaveClass(/hidden/);
  232 |   await page.getByRole("button", { name: /Continue/ }).click();
  233 |   const loaded = await state(page);
  234 |   expect(loaded.training).toMatchObject({ stage: 6, completed: true });
  235 |   expect(loaded.traversal.surfaceId).toBeNull();
  236 |   expect(loaded.traversal.pullId).toBeNull();
  237 |   expect(loaded.swing.web).toBeNull();
  238 |   expect(Object.values(loaded.velocity).every((v) => v === 0)).toBe(true);
  239 |   expect(loaded.grounded).toBe(true);
  240 |   expect(
  241 |     await page.evaluate(() =>
  242 |       Object.fromEntries(
  243 |         Object.entries(localStorage).filter(([k]) =>
  244 |           k.startsWith("webmaster.save"),
  245 |         ),
  246 |       ),
  247 |     ),
  248 |   ).toEqual(before);
  249 |   await shot(page, "cross-sprint-persistent-return");
  250 |   await writeFile(
  251 |     `${out}/cross-sprint-persistence.json`,
  252 |     JSON.stringify(
  253 |       {
  254 |         oldWriterSource: old.source_head,
  255 |         method:
  256 |           "Historical WM002 writer save loaded; ordinary replay and all four swing gaps; ordinary south route with all S3 mechanics; manual save; actual persistent browser closed and reopened on identical origin/profile",
  257 |         saved,
  258 |         loaded,
  259 |         stored: before,
  260 |       },
  261 |       null,
  262 |       2,
  263 |     ),
  264 |   );
  265 |   await context.close();
  266 | });
  267 | 
  268 | async function fixture(
  269 |   p: Page,
  270 |   x: number,
  271 |   y: number,
  272 |   z: number,
  273 |   label: string,
  274 | ) {
  275 |   await p.evaluate(
  276 |     ({ x, y, z, label }) =>
  277 |       window.__WM_DEBUG__!.setFixturePosition({ x, y, z }, label),
  278 |     { x, y, z, label },
  279 |   );
  280 |   await p.waitForTimeout(250);
  281 | }
  282 | test("WM003 negative lifecycle probes: wall pause focus pull interruption heavy feedback and blocked web", async ({
  283 |   page,
  284 | }, info) => {
  285 |   test.setTimeout(90000);
  286 |   await start(page);
  287 |   await fixture(
  288 |     page,
  289 |     0,
  290 |     0,
  291 |     -60.4,
  292 |     "negative wall lifecycle; cannot award route",
  293 |   );
  294 |   await look(page, Math.PI / 2, 1.08);
  295 |   await page.keyboard.down("w");
  296 |   await page.waitForTimeout(100);
  297 |   await page.keyboard.up("w");
  298 |   await page.keyboard.down("c");
  299 |   await wait(page, (s) => s.traversal.surfaceId === "climb-wall");
  300 |   await page.keyboard.down("w");
  301 |   await wait(page, (s) => s.position.y > 2);
  302 |   await page.keyboard.up("w");
  303 |   await page.keyboard.press("Escape");
  304 |   await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  305 |   await shot(page, "save-unavailable-climbing");
  306 |   const paused = await state(page);
  307 |   await page.waitForTimeout(250);
  308 |   expect((await state(page)).position).toEqual(paused.position);
> 309 |   await page.getByRole("button", { name: /Resume/ }).click();
      |                                                      ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: /Resume/ }) resolved to 3 elements:
  310 |   await page.waitForTimeout(200);
  311 |   expect((await state(page)).traversal.surfaceId).toBeNull();
  312 |   await page.keyboard.up("c");
  313 |   await fixture(page, 0, 0, -60.4, "negative blur cleanup");
  314 |   await look(page, Math.PI / 2, 1.08);
  315 |   await page.keyboard.down("w");
  316 |   await page.waitForTimeout(100);
  317 |   await page.keyboard.up("w");
  318 |   await page.keyboard.down("c");
  319 |   await wait(page, (s) => !!s.traversal.surfaceId);
  320 |   await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  321 |   await page.waitForTimeout(150);
  322 |   expect((await state(page)).traversal.surfaceId).toBeNull();
  323 |   await page.keyboard.up("c");
  324 |   await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  325 |   await fixture(page, -9, 0, -51, "negative pull pause");
  326 |   await look(page, Math.PI, 1.45);
  327 |   // Arm the observer before pressing Q so a short valid PULLING phase cannot
  328 |   // pass between remote browser calls. Escape is ordinary DOM keyboard input.
  329 |   const pullAtPause=await page.evaluate(()=>new Promise<any>((resolve,reject)=>{
  330 |     const begun=performance.now();
  331 |     const frame=()=>{const s=window.__WM_DEBUG__!.getState();
  332 |       if(s.traversal.phase==='PULLING'){
  333 |         window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
  334 |         window.dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}));resolve(s);return;
  335 |       }
  336 |       if(performance.now()-begun>5000){reject(new Error(`No moving pull observed: ${s.traversal.phase} ${s.traversal.message}`));return;}
  337 |       requestAnimationFrame(frame);
  338 |     };
  339 |     requestAnimationFrame(frame);
  340 |     window.dispatchEvent(new KeyboardEvent('keydown',{key:'q',code:'KeyQ',bubbles:true}));
  341 |   }));
  342 |   expect(pullAtPause.traversal.pullId).toBe('route-step');
  343 |   expect(pullAtPause.pullObjects.some((o:any)=>o.speed>0)).toBe(true);
  344 |   await expect(page.getByRole('heading',{name:'Paused'})).toBeVisible();
  345 |   await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  346 |   await shot(page, "save-unavailable-pulling");
  347 |   const pulled = (await state(page)).pullObjects;
  348 |   await page.waitForTimeout(250);
  349 |   expect((await state(page)).pullObjects).toEqual(pulled);
  350 |   await page.getByRole("button", { name: /Resume/ }).click();
  351 |   await page.waitForTimeout(180);
  352 |   expect((await state(page)).traversal.pullId).toBeNull();
  353 |   expect((await state(page)).pullObjects.every((o) => o.speed === 0)).toBe(
  354 |     true,
  355 |   );
  356 |   await page.keyboard.up("q");
  357 |   await fixture(page, 2, 0, -49, "negative too-heavy demonstration");
  358 |   await look(page, Math.PI, 1.45);
  359 |   await page.keyboard.down("q");
  360 |   await wait(page, (s) => s.traversal.message === "Too heavy to pull");
  361 |   await shot(page, "too-heavy-feedback");
  362 |   await page.keyboard.up("q");
  363 |   await fixture(page, 10, 0, -51, "negative moving into obstructed pull path");
  364 |   await look(page, 0, 1.45);
  365 |   await page.keyboard.down("q");
  366 |   await wait(page, (s) => s.traversal.pullId === "route-step");
  367 |   await page.keyboard.down("a");
  368 |   await wait(page, (s) => s.traversal.message === "Path blocked");
  369 |   await stop(page);
  370 |   await shot(page, "blocked-pull-feedback");
  371 |   expect((await state(page)).traversal.pullId).toBeNull();
  372 |   await fixture(
  373 |     page,
  374 |     -11,
  375 |     2.6,
  376 |     -51,
  377 |     "negative finish placement without route stages",
  378 |   );
  379 |   expect((await state(page)).training.completed).toBe(false);
  380 |   for (let n = 0; n < 4; n++) {
  381 |     await fixture(
  382 |       page,
  383 |       0,
  384 |       -30,
  385 |       -40,
  386 |       "negative repeated fall and zero-health retry",
  387 |     );
  388 |     await page.waitForTimeout(750);
  389 |   }
  390 |   const recovered = await state(page);
  391 |   expect(recovered.health).toBe(100);
  392 |   expect(recovered.traversal.surfaceId).toBeNull();
  393 |   expect(recovered.traversal.pullId).toBeNull();
  394 |   expect(recovered.swing.web).toBeNull();
  395 |   expect(Object.values(recovered.velocity).every((v) => v === 0)).toBe(true);
  396 |   await writeFile(
  397 |     info.outputPath("negative-lifecycle.json"),
  398 |     JSON.stringify(
  399 |       {
  400 |         method:
  401 |           "Explicitly labeled negative placements; no route completion evidence",
  402 |         pullAtPause,
  403 |         recovered,
  404 |       },
  405 |       null,
  406 |       2,
  407 |     ),
  408 |   );
  409 | });
```