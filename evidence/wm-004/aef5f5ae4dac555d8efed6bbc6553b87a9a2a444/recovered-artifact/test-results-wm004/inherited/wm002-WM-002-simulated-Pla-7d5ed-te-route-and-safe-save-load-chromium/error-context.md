# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm002.spec.ts >> WM-002 simulated PlayStation controller-only complete route and safe save/load
- Location: e2e\wm002.spec.ts:349:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
Call log:
  - navigating to "http://127.0.0.1:4173/?test=1", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 127.0.0.1
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  161 |   await expect(reopened.locator("#loading")).toHaveClass(/hidden/);
  162 |   await reopened.getByRole("button", { name: /Continue/ }).click();
  163 |   const loaded = await state(reopened);
  164 |   expect(loaded.skyline.completed).toBe(true);
  165 |   expect(loaded.skyline.stage).toBe(4);
  166 |   expect(loaded.swing.web).toBeNull();
  167 |   expect(loaded.velocity).toEqual({ x: 0, y: 0, z: 0 });
  168 |   expect(loaded.grounded).toBe(true);
  169 |   expect(
  170 |     await reopened.evaluate(() =>
  171 |       Object.fromEntries(
  172 |         Object.entries(localStorage).filter(([k]) =>
  173 |           k.startsWith("webmaster.save"),
  174 |         ),
  175 |       ),
  176 |     ),
  177 |   ).toEqual(before);
  178 |   await shot(reopened, "keyboard-saved-return");
  179 |   await writeFile(
  180 |     `${root}/keyboard-continuous-route.json`,
  181 |     JSON.stringify(
  182 |       {
  183 |         source:
  184 |           "ordinary menu plus keyboard/mouse only; no fixture positioning; entire persistent browser context closed and reopened at exact same origin/profile",
  185 |         saved,
  186 |         loaded,
  187 |         errors,
  188 |       },
  189 |       null,
  190 |       2,
  191 |     ),
  192 |   );
  193 |   expect(errors).toEqual([]);
  194 |   await context.close();
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
> 261 |   await page.goto("/?test=1");
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
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
  295 |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
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
```