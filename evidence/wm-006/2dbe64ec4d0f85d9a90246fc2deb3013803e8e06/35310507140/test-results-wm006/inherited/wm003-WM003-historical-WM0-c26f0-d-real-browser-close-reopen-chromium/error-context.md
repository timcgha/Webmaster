# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm003.spec.ts >> WM003 historical WM002 save to full swing plus climb route, safe save and real browser close/reopen
- Location: e2e\wm003.spec.ts:167:1

# Error details

```
Error: browserContext.close: Target page, context or browser has been closed
```

# Test source

```ts
  165 |   });
  166 | 
  167 | test("WM003 historical WM002 save to full swing plus climb route, safe save and real browser close/reopen", async ({
  168 |   playwright,
  169 | }, info) => {
  170 |   test.setTimeout(240000);
  171 |   const profile = info.outputPath("wm003-persistent-profile"),
  172 |     options = {
  173 |       headless: true,
  174 |       ...(process.env.WM_BROWSER_CHANNEL ? {channel:process.env.WM_BROWSER_CHANNEL} : {}),
  175 |       baseURL: "http://127.0.0.1:4173",
  176 |       viewport: { width: 1280, height: 720 },
  177 |       ...(process.env.WM_EVIDENCE_ROOT ? {} : {recordVideo: { dir: info.outputPath("persistent-video") }}),
  178 |       ...(process.env.WM_CHROMIUM_PATH
  179 |         ? { executablePath: process.env.WM_CHROMIUM_PATH }
  180 |         : {}),
  181 |     };
  182 |   let context = await playwright.chromium.launchPersistentContext(
  183 |       profile,
  184 |       options,
  185 |     ),
  186 |     page = await context.newPage();
  187 |   const old = JSON.parse(
  188 |     await readFile("evidence/wm-003/legacy-saves/WM-002.json", "utf8"),
  189 |   );
  190 |   await page.goto("/?test=1");
  191 |   await expect(page.locator("#loading")).toHaveClass(/hidden/);
  192 |   await page.evaluate((stored) => {
  193 |     for (const [k, v] of Object.entries(stored))
  194 |       localStorage.setItem(k, String(v));
  195 |   }, old.stored);
  196 |   await page.reload();
  197 |   await expect(page.locator("#loading")).toHaveClass(/hidden/);
  198 |   await page.getByRole("button", { name: /Continue/ }).click();
  199 |   expect((await state(page)).skyline.stage).toBe(1);
  200 |   await page.keyboard.press("Escape");
  201 |   await page.getByRole("button", { name: /Replay skyline/ }).click();
  202 |   try {
  203 |     await legacyKeyboardRoute(page, false);
  204 |   } catch (e) {
  205 |     await writeFile(
  206 |       info.outputPath("legacy-last-state.json"),
  207 |       JSON.stringify(await state(page), null, 2),
  208 |     );
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
> 265 |   await context.close();
      |   ^ Error: browserContext.close: Target page, context or browser has been closed
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
  309 |   await page.getByRole("button", { name: /Resume/ }).click();
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
```