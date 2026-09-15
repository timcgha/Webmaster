# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> labels corrupt and incompatible save fixtures without hiding valid choices
- Location: e2e\wm001.spec.ts:804:1

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
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { writeFile } from "node:fs/promises";
  3   | const captures = process.env.WM_EVIDENCE_ROOT ? `${process.env.WM_EVIDENCE_ROOT}/wm001` : "evidence/wm-001/captures";
  4   | 
  5   | declare global {
  6   |   interface Window {
  7   |     __setTestGamepad?: (patch: Partial<TestGamepadConfig>) => void;
  8   |     __patchTestGamepad?: (index: number, patch: Partial<TestGamepadConfig>) => void;
  9   |     __setTestGamepads?: (pads: TestGamepadConfig[]) => void;
  10  |   }
  11  | }
  12  | 
  13  | interface TestGamepadConfig {
  14  |   id: string;
  15  |   index: number;
  16  |   connected: boolean;
  17  |   mapping: string;
  18  |   axes: number[];
  19  |   pressed: number[];
  20  |   values?: Record<number, number>;
  21  |   buttonCount?: number;
  22  | }
  23  | 
  24  | async function ready(page: Page): Promise<void> {
> 25  |   await page.goto("/?test=1");
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
  26  |   await expect(page.locator("#loading")).toHaveClass(/hidden/, { timeout: 30_000 });
  27  |   await expect(page.getByRole("heading", { name: "WEBMASTER" })).toBeVisible();
  28  | }
  29  | 
  30  | async function newGameWithMouse(page: Page, slot: 1 | 2 | 3 = 1, difficulty: "Easy" | "Normal" | "Hard" = "Normal"): Promise<void> {
  31  |   await page.getByRole("button", { name: /New Game/ }).click();
  32  |   await page.getByRole("button", { name: new RegExp(`Slot ${slot}`) }).click();
  33  |   await page.getByRole("button", { name: new RegExp(difficulty) }).click();
  34  |   if (await page.getByRole("heading", { name: new RegExp(`Replace slot ${slot}`) }).isVisible().catch(() => false)) {
  35  |     await page.getByRole("button", { name: /Replace and start/ }).click();
  36  |   }
  37  |   await expect(page.locator("#input-overlay")).toBeVisible();
  38  | }
  39  | 
  40  | async function hold(page: Page, keys: string[], milliseconds: number): Promise<void> {
  41  |   for (const key of keys) await page.keyboard.down(key);
  42  |   await page.waitForTimeout(milliseconds);
  43  |   for (const key of [...keys].reverse()) await page.keyboard.up(key);
  44  |   await page.waitForTimeout(100);
  45  | }
  46  | 
  47  | async function state(page: Page): Promise<any> {
  48  |   return page.evaluate(() => window.__WM_DEBUG__!.getState());
  49  | }
  50  | 
  51  | async function saveBytes(page: Page, slot = 1): Promise<Record<string, string>> {
  52  |   return page.evaluate((selectedSlot) =>
  53  |     Object.fromEntries(
  54  |       Object.entries(localStorage)
  55  |         .filter(([key]) => key.startsWith(`webmaster.save.v1.slot${selectedSlot}.`))
  56  |         .sort(([left], [right]) => left.localeCompare(right)),
  57  |     ), slot);
  58  | }
  59  | 
  60  | async function activeSavePayload(page: Page, slot: 1 | 2 | 3, kind: "manual" | "checkpoint"): Promise<any> {
  61  |   return page.evaluate(({ selectedSlot, selectedKind }) => {
  62  |     const base = `webmaster.save.v1.slot${selectedSlot}.${selectedKind}`;
  63  |     const pointer = localStorage.getItem(`${base}.pointer`);
  64  |     if (pointer !== "a" && pointer !== "b") return null;
  65  |     return JSON.parse(localStorage.getItem(`${base}.${pointer}`)!).payload;
  66  |   }, { selectedSlot: slot, selectedKind: kind });
  67  | }
  68  | 
  69  | async function expectInViewport(page: Page, selector: string): Promise<void> {
  70  |   const locator = page.locator(selector);
  71  |   await expect(locator).toBeVisible();
  72  |   const box = await locator.boundingBox();
  73  |   expect(box).not.toBeNull();
  74  |   expect(box!.x).toBeGreaterThanOrEqual(0);
  75  |   expect(box!.y).toBeGreaterThanOrEqual(0);
  76  |   expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  77  |   expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  78  | }
  79  | 
  80  | async function installGamepads(page: Page, initialPads: Partial<TestGamepadConfig>[]): Promise<void> {
  81  |   await page.addInitScript((seedPads) => {
  82  |     const normalize = (input: Partial<TestGamepadConfig>, fallbackIndex: number): TestGamepadConfig => ({
  83  |       id: input.id ?? "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)",
  84  |       index: input.index ?? fallbackIndex,
  85  |       connected: input.connected ?? true,
  86  |       mapping: input.mapping ?? "standard",
  87  |       axes: input.axes ?? [0, 0, 0, 0],
  88  |       pressed: input.pressed ?? [],
  89  |       values: input.values ?? {},
  90  |       buttonCount: input.buttonCount ?? 17,
  91  |     });
  92  |     let configs = seedPads.map(normalize);
  93  |     window.__setTestGamepad = (patch) => {
  94  |       configs[0] = normalize({ ...configs[0], ...patch }, configs[0]?.index ?? 0);
  95  |     };
  96  |     window.__patchTestGamepad = (index, patch) => {
  97  |       const position = configs.findIndex((config) => config.index === index);
  98  |       if (position >= 0) configs[position] = normalize({ ...configs[position], ...patch, index }, index);
  99  |       else configs.push(normalize({ ...patch, index }, index));
  100 |     };
  101 |     window.__setTestGamepads = (pads) => {
  102 |       configs = pads.map(normalize);
  103 |     };
  104 |     Object.defineProperty(navigator, "getGamepads", {
  105 |       configurable: true,
  106 |       value: () => {
  107 |         const result: Array<Gamepad | null> = Array.from({ length: Math.max(4, ...configs.map((config) => config.index + 1)) }, () => null);
  108 |         configs.forEach((config) => {
  109 |           if (!config.connected) return;
  110 |           result[config.index] = {
  111 |             id: config.id,
  112 |             index: config.index,
  113 |             connected: config.connected,
  114 |             mapping: config.mapping,
  115 |             timestamp: performance.now(),
  116 |             axes: config.axes,
  117 |             buttons: Array.from({ length: config.buttonCount ?? 17 }, (_, index) => ({
  118 |               pressed: config.pressed.includes(index),
  119 |               touched: config.pressed.includes(index),
  120 |               value: config.pressed.includes(index) ? 1 : config.values?.[index] ?? 0,
  121 |             })),
  122 |             vibrationActuator: null,
  123 |             hapticActuators: [],
  124 |           } as unknown as Gamepad;
  125 |         });
```