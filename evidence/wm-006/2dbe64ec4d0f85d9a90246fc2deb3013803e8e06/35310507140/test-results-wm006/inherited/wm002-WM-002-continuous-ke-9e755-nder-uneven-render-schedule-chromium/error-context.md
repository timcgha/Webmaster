# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm002.spec.ts >> WM-002 continuous keyboard route under uneven render schedule
- Location: e2e\wm002.spec.ts:496:3

# Error details

```
TimeoutError: page.waitForFunction: Timeout 20000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: SKYLINE 4 / 4
        - strong: "Turn right: aim at the final ring and swing to the finish."
      - region "Swing status":
        - text: "SWING: Hold E / LT • release to let go"
        - strong: Ring in reach
        - generic: Ring ready. Hold E or LT / L2. Release to sail forward.
    - region "Health 75 percent":
      - text: HERO ENERGY
      - strong: 75 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 0, 0, 166 • 29 FPS
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
  - status: "Checkpoint: Turn right: aim at the final ring and swing to the finish."
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { writeFile } from "node:fs/promises";
  3   | const root = process.env.WM_EVIDENCE_ROOT ? `${process.env.WM_EVIDENCE_ROOT}/wm002` : "evidence/wm-002/captures";
  4   | const state = (page: Page) =>
  5   |   page.evaluate(() => window.__WM_DEBUG__!.getState());
  6   | async function until(page: Page, axis: "x" | "z", position: number) {
> 7   |   await page.waitForFunction(
      |              ^ TimeoutError: page.waitForFunction: Timeout 20000ms exceeded.
  8   |     ({ axis, position }) =>
  9   |       window.__WM_DEBUG__!.getState().position[axis] >= position,
  10  |     { axis, position },
  11  |     { timeout: 20000 },
  12  |   );
  13  | }
  14  | async function stage(page: Page, n: number) {
  15  |   await page.waitForFunction(
  16  |     (n) => window.__WM_DEBUG__!.getState().skyline.stage === n,
  17  |     n,
  18  |     { timeout: 15000 },
  19  |   );
  20  | }
  21  | async function shot(page: Page, name: string) {
  22  |   await page.screenshot({ path: `${root}/${name}.png` });
  23  | }
  24  | async function start(page: Page) {
  25  |   await page.goto("/?test=1");
  26  |   await expect(page.locator("#loading")).toHaveClass(/hidden/, {
  27  |     timeout: 30000,
  28  |   });
  29  |   await page.getByRole("button", { name: /New Game/ }).click();
  30  |   await page.getByRole("button", { name: /Slot 1/ }).click();
  31  |   await page.getByRole("button", { name: /Normal/ }).click();
  32  | }
  33  | async function look(page: Page, dx: number, dy: number) {
  34  |   const before = await state(page);
  35  |   const canvas = page.locator("#game-canvas");
  36  |   await canvas.dispatchEvent("mousedown", {
  37  |     clientX: 600,
  38  |     clientY: 380,
  39  |     button: 0,
  40  |     buttons: 1,
  41  |     bubbles: true,
  42  |   });
  43  |   for (let step = 1; step <= 8; step++) {
  44  |     await page
  45  |       .locator("body")
  46  |       .dispatchEvent("mousemove", {
  47  |         clientX: 600 + (dx * step) / 8,
  48  |         clientY: 380 + (dy * step) / 8,
  49  |         buttons: 1,
  50  |         bubbles: true,
  51  |       });
  52  |     await page.waitForTimeout(20);
  53  |   }
  54  |   await page
  55  |     .locator("body")
  56  |     .dispatchEvent("mouseup", {
  57  |       clientX: 600 + dx,
  58  |       clientY: 380 + dy,
  59  |       button: 0,
  60  |       bubbles: true,
  61  |     });
  62  |   await page.waitForTimeout(100);
  63  |   const after = await state(page);
  64  |   if (dx)
  65  |     expect(Math.abs(after.cameraAlpha - before.cameraAlpha)).toBeGreaterThan(1);
  66  |   if (dy) expect(after.cameraBeta).toBeGreaterThan(before.cameraBeta + 0.2);
  67  | }
  68  | async function keyboardRoute(page: Page, captures = true) {
  69  |   await look(page, 0, 170); // Raise aim using the ordinary mouse-look path.
  70  |   await page.keyboard.down("Shift");
  71  |   await page.keyboard.down("w");
  72  |   await until(page, "z", 21);
  73  |   await page.keyboard.down("e");
  74  |   await page.keyboard.press("Space");
  75  |   await page.waitForFunction(() => !!window.__WM_DEBUG__!.getState().swing.web);
  76  |   if (captures) await shot(page, "keyboard-hand-origin-web");
  77  |   await until(page, "z", 37);
  78  |   await page.keyboard.up("e");
  79  |   if (captures) await shot(page, "keyboard-release-momentum");
  80  |   await stage(page, 1);
  81  |   if (captures) await shot(page, "keyboard-first-landing");
  82  |   await until(page, "z", 53);
  83  |   await page.keyboard.down("e");
  84  |   await page.keyboard.press("Space");
  85  |   await until(page, "z", 76.5);
  86  |   await page.keyboard.up("e");
  87  |   await stage(page, 2);
  88  |   await until(page, "z", 95);
  89  |   await page.keyboard.down("e");
  90  |   await page.keyboard.press("Space");
  91  |   await until(page, "z", 122);
  92  |   await page.keyboard.up("e");
  93  |   await until(page, "z", 123.2);
  94  |   await page.keyboard.down("e");
  95  |   await page.waitForFunction(
  96  |     () => window.__WM_DEBUG__!.getState().swing.web?.anchorId === "ring-4",
  97  |   );
  98  |   if (captures) await shot(page, "keyboard-midair-reattachment");
  99  |   await until(page, "z", 152);
  100 |   await page.keyboard.up("e");
  101 |   await stage(page, 3);
  102 |   await until(page, "z", 166);
  103 |   await page.keyboard.up("w");
  104 |   await page.waitForTimeout(600);
  105 |   await look(page, Math.PI / 2 / 0.0035, 0); // Face the right-turn ring with mouse look.
  106 |   await page.keyboard.down("w");
  107 |   await until(page, "x", 5);
```