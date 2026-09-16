# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm003.spec.ts >> WM003 negative lifecycle probes: wall pause focus pull interruption heavy feedback and blocked web
- Location: e2e\wm003.spec.ts:282:1

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
        - text: PRACTICE 1 / 3
        - strong: Reach the glowing sky gate
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: "-9, 0, -51 • 14 FPS"
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
    - region "Climb and Pull status":
      - strong: CLIMB C / RB • PULL Q / LB
      - generic: Close enough! Release, then use your moved step.
    - paragraph: "TEST FIXTURE: negative pull pause"
  - status: Slot 1 started on Normal
```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | import { mkdir, writeFile } from "node:fs/promises";
  3   | const out = process.env.WM_EVIDENCE_ROOT ? `${process.env.WM_EVIDENCE_ROOT}/wm003` : "evidence/wm-003/captures";
  4   | export const state = (p: Page) =>
  5   |   p.evaluate(() => window.__WM_DEBUG__!.getState());
  6   | export async function wait(p: Page, fn: (s: any) => boolean, timeout = 20000) {
> 7   |   await p.waitForFunction(
      |           ^ TimeoutError: page.waitForFunction: Timeout 20000ms exceeded.
  8   |     ({ body }) =>
  9   |       new Function("s", `return (${body})(s)`)(window.__WM_DEBUG__!.getState()),
  10  |     { body: fn.toString() },
  11  |     { timeout },
  12  |   );
  13  | }
  14  | export async function shot(p: Page, name: string) {
  15  |   await mkdir(out, { recursive: true });
  16  |   await p.screenshot({ path: `${out}/${name}.png` });
  17  | }
  18  | export async function hudLayout(p: Page, label: string) {
  19  |   const original = p.viewportSize()!,
  20  |     records = [];
  21  |   for (const [width, height] of [
  22  |     [1280, 720],
  23  |     [1920, 1080],
  24  |     [1194, 834],
  25  |   ]) {
  26  |     await p.setViewportSize({ width: width!, height: height! });
  27  |     await p.waitForTimeout(180);
  28  |     const selectors = [
  29  |         ".objective-card",
  30  |         ".health-card",
  31  |         ".swing-card",
  32  |         ".traversal-card",
  33  |         ".input-overlay",
  34  |         ".controller-hud-card",
  35  |         ".run-card",
  36  |       ],
  37  |       boxes = [];
  38  |     for (const selector of selectors) {
  39  |       const element = p.locator(selector);
  40  |       if (!(await element.isVisible())) continue;
  41  |       const box = await element.boundingBox();
  42  |       expect(box).not.toBeNull();
  43  |       expect(box!.x).toBeGreaterThanOrEqual(0);
  44  |       expect(box!.y).toBeGreaterThanOrEqual(0);
  45  |       expect(box!.x + box!.width).toBeLessThanOrEqual(width! + 0.5);
  46  |       expect(box!.y + box!.height).toBeLessThanOrEqual(height! + 0.5);
  47  |       boxes.push({ selector, ...box! });
  48  |     }
  49  |     for (let a = 0; a < boxes.length; a++)
  50  |       for (let b = a + 1; b < boxes.length; b++) {
  51  |         const x = boxes[a]!,
  52  |           y = boxes[b]!,
  53  |           overlapX =
  54  |             Math.min(x.x + x.width, y.x + y.width) - Math.max(x.x, y.x),
  55  |           overlapY =
  56  |             Math.min(x.y + x.height, y.y + y.height) - Math.max(x.y, y.y);
  57  |         expect(
  58  |           overlapX > 1 && overlapY > 1,
  59  |           `${label} ${width}x${height}: ${x.selector} overlaps ${y.selector}`,
  60  |         ).toBe(false);
  61  |       }
  62  |     records.push({ width, height, boxes });
  63  |     await shot(p, `layout-${label}-${width}x${height}`);
  64  |   }
  65  |   await p.setViewportSize(original);
  66  |   await p.waitForTimeout(180);
  67  |   await writeFile(
  68  |     `${out}/layout-${label}.json`,
  69  |     JSON.stringify(
  70  |       {
  71  |         method:
  72  |           "Actual ordinary route state; normal UI and three landscape viewports; all visible HUD cards within viewport and pairwise non-overlapping",
  73  |         records,
  74  |       },
  75  |       null,
  76  |       2,
  77  |     ),
  78  |   );
  79  | }
  80  | export async function start(p: Page) {
  81  |   await p.goto("/?test=1");
  82  |   await expect(p.locator("#loading")).toHaveClass(/hidden/);
  83  |   await p.getByRole("button", { name: /New Game/ }).click();
  84  |   await p.getByRole("button", { name: /Slot 1/ }).click();
  85  |   await p.getByRole("button", { name: /Normal/ }).click();
  86  | }
  87  | export async function look(p: Page, alpha: number, beta?: number) {
  88  |   const before = await state(p);
  89  |   const dx = (before.cameraAlpha - alpha) / 0.0035,
  90  |     dy = beta === undefined ? 0 : (beta - before.cameraBeta) / 0.0035;
  91  |   await p.locator("#game-canvas").dispatchEvent("mousedown", {
  92  |     clientX: 600,
  93  |     clientY: 380,
  94  |     button: 0,
  95  |     buttons: 1,
  96  |     bubbles: true,
  97  |   });
  98  |   for (let n = 1; n <= 10; n++) {
  99  |     await p.locator("body").dispatchEvent("mousemove", {
  100 |       clientX: 600 + (dx * n) / 10,
  101 |       clientY: 380 + (dy * n) / 10,
  102 |       buttons: 1,
  103 |       bubbles: true,
  104 |     });
  105 |     await p.waitForTimeout(20);
  106 |   }
  107 |   await p.locator("body").dispatchEvent("mouseup", {
```