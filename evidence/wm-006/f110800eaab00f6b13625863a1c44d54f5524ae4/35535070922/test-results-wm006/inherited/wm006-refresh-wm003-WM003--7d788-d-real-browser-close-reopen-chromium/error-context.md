# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm006-refresh-wm003.spec.ts >> WM003 historical WM002 save to full swing plus climb route, safe save and real browser close/reopen
- Location: e2e\wm006-refresh-wm003.spec.ts:167:1

# Error details

```
TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
```

# Test source

```ts
  1   | // Exact WM002 accepted keyboard journey copied for cross-sprint save/load regression; assertions retained.
  2   | import { expect, type Page } from "@playwright/test";
  3   | const root = "evidence/wm-003/captures";
  4   | const state = (page: Page) =>
  5   |   page.evaluate(() => window.__WM_DEBUG__!.getState());
  6   | async function until(page: Page, axis: "x" | "z", position: number) {
  7   |   await page.waitForFunction(
  8   |     ({ axis, position }) =>
  9   |       window.__WM_DEBUG__!.getState().position[axis] >= position,
  10  |     { axis, position },
  11  |     { timeout: 20000 },
  12  |   );
  13  | }
  14  | async function stage(page: Page, n: number) {
> 15  |   await page.waitForFunction(
      |              ^ TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
  16  |     (n) => window.__WM_DEBUG__!.getState().skyline.stage === n,
  17  |     n,
  18  |     { timeout: 15000 },
  19  |   );
  20  | }
  21  | async function shot(page: Page, name: string) {
  22  |   await page.screenshot({ path: `${root}/${name}.png` });
  23  | }
  24  | async function look(page: Page, dx: number, dy: number) {
  25  |   const before = await state(page);
  26  |   const canvas = page.locator("#game-canvas");
  27  |   await canvas.dispatchEvent("mousedown", {
  28  |     clientX: 600,
  29  |     clientY: 380,
  30  |     button: 0,
  31  |     buttons: 1,
  32  |     bubbles: true,
  33  |   });
  34  |   for (let step = 1; step <= 8; step++) {
  35  |     await page
  36  |       .locator("body")
  37  |       .dispatchEvent("mousemove", {
  38  |         clientX: 600 + (dx * step) / 8,
  39  |         clientY: 380 + (dy * step) / 8,
  40  |         buttons: 1,
  41  |         bubbles: true,
  42  |       });
  43  |     await page.waitForTimeout(20);
  44  |   }
  45  |   await page
  46  |     .locator("body")
  47  |     .dispatchEvent("mouseup", {
  48  |       clientX: 600 + dx,
  49  |       clientY: 380 + dy,
  50  |       button: 0,
  51  |       bubbles: true,
  52  |     });
  53  |   await page.waitForTimeout(100);
  54  |   const after = await state(page);
  55  |   if (dx)
  56  |     expect(Math.abs(after.cameraAlpha - before.cameraAlpha)).toBeGreaterThan(1);
  57  |   if (dy) expect(after.cameraBeta).toBeGreaterThan(before.cameraBeta + 0.2);
  58  | }
  59  | export async function legacyKeyboardRoute(page: Page, captures = true) {
  60  |   await look(page, 0, 170); // Raise aim using the ordinary mouse-look path.
  61  |   await page.keyboard.down("Shift");
  62  |   await page.keyboard.down("w");
  63  |   await until(page, "z", 21);
  64  |   await page.keyboard.down("e");
  65  |   await page.keyboard.press("Space");
  66  |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  67  |   if (captures) await shot(page, "keyboard-hand-origin-web");
  68  |   await until(page, "z", 37);
  69  |   await page.keyboard.up("e");
  70  |   if (captures) await shot(page, "keyboard-release-momentum");
  71  |   await stage(page, 1);
  72  |   if (captures) await shot(page, "keyboard-first-landing");
  73  |   await until(page, "z", 53);
  74  |   await page.keyboard.down("e");
  75  |   await page.keyboard.press("Space");
  76  |   await until(page, "z", 76.5);
  77  |   await page.keyboard.up("e");
  78  |   await stage(page, 2);
  79  |   await until(page, "z", 95);
  80  |   await page.keyboard.down("e");
  81  |   await page.keyboard.press("Space");
  82  |   await until(page, "z", 122);
  83  |   await page.keyboard.up("e");
  84  |   await until(page, "z", 123.2);
  85  |   await page.keyboard.down("e");
  86  |   await page.waitForFunction(
  87  |     () => window.__WM_DEBUG__!.getState().swing.web?.anchorId === "ring-4",
  88  |   );
  89  |   if (captures) await shot(page, "keyboard-midair-reattachment");
  90  |   await until(page, "z", 152);
  91  |   await page.keyboard.up("e");
  92  |   await stage(page, 3);
  93  |   await until(page, "z", 166);
  94  |   await page.keyboard.up("w");
  95  |   await page.waitForTimeout(600);
  96  |   await look(page, Math.PI / 2 / 0.0035, 0); // Face the right-turn ring with mouse look.
  97  |   await page.keyboard.down("w");
  98  |   await until(page, "x", 5);
  99  |   await page.keyboard.down("e");
  100 |   await page.keyboard.press("Space");
  101 |   await until(page, "x", 20);
  102 |   await page.keyboard.up("e");
  103 |   await stage(page, 4);
  104 |   await page.keyboard.up("w");
  105 |   await page.keyboard.up("Shift");
  106 |   await page.waitForTimeout(850);
  107 |   expect((await state(page)).skyline).toMatchObject({
  108 |     stage: 4,
  109 |     completed: true,
  110 |     completions: 1,
  111 |     valid: true,
  112 |   });
  113 |   expect((await state(page)).swing.web).toBeNull();
  114 |   expect((await state(page)).safe).toBe(true);
  115 |   if (captures) await shot(page, "keyboard-route-complete");
```