# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm003.spec.ts >> WM003 historical WM002 save to full swing plus climb route, safe save and real browser close/reopen
- Location: e2e\wm003.spec.ts:167:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
Call log:
  - navigating to "http://127.0.0.1:4173/?test=1", waiting until "load"

```

# Test source

```ts
  90  |     expect(loaded.traversal.surfaceId).toBeNull();
  91  |     expect(loaded.traversal.pullId).toBeNull();
  92  |     expect(loaded.swing.web).toBeNull();
  93  |     expect(Object.values(loaded.velocity).every((v) => v === 0)).toBe(true);
  94  |     await page.keyboard.down("w");
  95  |     await page.waitForTimeout(180);
  96  |     await page.keyboard.up("w");
  97  |     expect((await state(page)).position).not.toEqual(loaded.position);
  98  |     expect(errors).toEqual([]);
  99  |     await writeFile(
  100 |       `${out}/controller-route.json`,
  101 |       JSON.stringify(
  102 |         {
  103 |           method:
  104 |             "Simulated standard PlayStation semantic actions only through route and save/load menus; keyboard fallback separately; not physical evidence",
  105 |           loaded,
  106 |           errors,
  107 |         },
  108 |         null,
  109 |         2,
  110 |       ),
  111 |     );
  112 |   } catch (e) {
  113 |     await writeFile(
  114 |       info.outputPath("last-state.json"),
  115 |       JSON.stringify(await state(page), null, 2),
  116 |     );
  117 |     await shot(page, "failed-controller-route");
  118 |     throw e;
  119 |   }
  120 | });
  121 | 
  122 | for (const name of ["WM-001", "WM-002"])
  123 |   test(`WM003 loads exact historical ${name} writer records without changing old generations`, async ({
  124 |     page,
  125 |   }) => {
  126 |     const fixture = JSON.parse(
  127 |       await readFile(`evidence/wm-003/legacy-saves/${name}.json`, "utf8"),
  128 |     );
  129 |     await page.addInitScript((stored) => {
  130 |       for (const [k, v] of Object.entries(stored))
  131 |         localStorage.setItem(k, String(v));
  132 |     }, fixture.stored);
  133 |     await page.goto("/?test=1");
  134 |     await expect(page.locator("#loading")).toHaveClass(/hidden/);
  135 |     await page.getByRole("button", { name: /Continue/ }).click();
  136 |     const loaded = await state(page);
  137 |     expect(loaded.position).toEqual(fixture.payload.position);
  138 |     expect(loaded.health).toBe(75);
  139 |     expect(loaded.traversal.surfaceId).toBeNull();
  140 |     expect(loaded.traversal.pullId).toBeNull();
  141 |     expect(loaded.training.active).toBe(false);
  142 |     expect(loaded.swing.web).toBeNull();
  143 |     const after = await page.evaluate(() =>
  144 |       Object.fromEntries(
  145 |         Object.entries(localStorage).filter(([k]) =>
  146 |           k.startsWith("webmaster.save"),
  147 |         ),
  148 |       ),
  149 |     );
  150 |     expect(after).toEqual(fixture.stored);
  151 |     await writeFile(
  152 |       `${out}/${name}-compatibility.json`,
  153 |       JSON.stringify(
  154 |         {
  155 |           fixtureSource: fixture.source_head,
  156 |           classification:
  157 |             "Exact historical-writer synthetic save fixture; not sponsor data or earned route evidence",
  158 |           loaded,
  159 |           bytesPreserved: true,
  160 |         },
  161 |         null,
  162 |         2,
  163 |       ),
  164 |     );
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
> 190 |   await page.goto("/?test=1");
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
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
```