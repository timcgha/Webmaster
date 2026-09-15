import { expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = "evidence/wm-003/captures";
export const state = (p: Page) =>
  p.evaluate(() => window.__WM_DEBUG__!.getState());
export async function wait(p: Page, fn: (s: any) => boolean, timeout = 20000) {
  await p.waitForFunction(
    ({ body }) =>
      new Function("s", `return (${body})(s)`)(window.__WM_DEBUG__!.getState()),
    { body: fn.toString() },
    { timeout },
  );
}
export async function shot(p: Page, name: string) {
  await mkdir(out, { recursive: true });
  await p.screenshot({ path: `${out}/${name}.png` });
}
export async function hudLayout(p: Page, label: string) {
  const original = p.viewportSize()!,
    records = [];
  for (const [width, height] of [
    [1280, 720],
    [1920, 1080],
    [1194, 834],
  ]) {
    await p.setViewportSize({ width: width!, height: height! });
    await p.waitForTimeout(180);
    const selectors = [
        ".objective-card",
        ".health-card",
        ".swing-card",
        ".traversal-card",
        ".input-overlay",
        ".controller-hud-card",
        ".run-card",
      ],
      boxes = [];
    for (const selector of selectors) {
      const element = p.locator(selector);
      if (!(await element.isVisible())) continue;
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width! + 0.5);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height! + 0.5);
      boxes.push({ selector, ...box! });
    }
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const x = boxes[a]!,
          y = boxes[b]!,
          overlapX =
            Math.min(x.x + x.width, y.x + y.width) - Math.max(x.x, y.x),
          overlapY =
            Math.min(x.y + x.height, y.y + y.height) - Math.max(x.y, y.y);
        expect(
          overlapX > 1 && overlapY > 1,
          `${label} ${width}x${height}: ${x.selector} overlaps ${y.selector}`,
        ).toBe(false);
      }
    records.push({ width, height, boxes });
    await shot(p, `layout-${label}-${width}x${height}`);
  }
  await p.setViewportSize(original);
  await p.waitForTimeout(180);
  await writeFile(
    `${out}/layout-${label}.json`,
    JSON.stringify(
      {
        method:
          "Actual ordinary route state; normal UI and three landscape viewports; all visible HUD cards within viewport and pairwise non-overlapping",
        records,
      },
      null,
      2,
    ),
  );
}
export async function start(p: Page) {
  await p.goto("/?test=1");
  await expect(p.locator("#loading")).toHaveClass(/hidden/);
  await p.getByRole("button", { name: /New Game/ }).click();
  await p.getByRole("button", { name: /Slot 1/ }).click();
  await p.getByRole("button", { name: /Normal/ }).click();
}
export async function look(p: Page, alpha: number, beta?: number) {
  const before = await state(p);
  const dx = (before.cameraAlpha - alpha) / 0.0035,
    dy = beta === undefined ? 0 : (beta - before.cameraBeta) / 0.0035;
  await p.locator("#game-canvas").dispatchEvent("mousedown", {
    clientX: 600,
    clientY: 380,
    button: 0,
    buttons: 1,
    bubbles: true,
  });
  for (let n = 1; n <= 10; n++) {
    await p.locator("body").dispatchEvent("mousemove", {
      clientX: 600 + (dx * n) / 10,
      clientY: 380 + (dy * n) / 10,
      buttons: 1,
      bubbles: true,
    });
    await p.waitForTimeout(20);
  }
  await p.locator("body").dispatchEvent("mouseup", {
    clientX: 600 + dx,
    clientY: 380 + dy,
    button: 0,
    bubbles: true,
  });
  await p.waitForTimeout(120);
}
interface Controls {
  down(k: string): Promise<void>;
  up(k: string): Promise<void>;
  press(k: string): Promise<void>;
  look(alpha: number, beta?: number): Promise<void>;
}
export const keyboard = (p: Page): Controls => ({
  down: (k) => p.keyboard.down(k),
  up: (k) => p.keyboard.up(k),
  press: (k) => p.keyboard.press(k),
  look: (a, b) => look(p, a, b),
});
export async function installPad(p: Page) {
  await p.addInitScript(() => {
    const w = window as any;
    w.__wm003pad = { connected: true, pressed: [], axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => {
        const s = w.__wm003pad;
        return s.connected
          ? [
              {
                id: "DualSense Wireless Controller",
                index: 0,
                connected: true,
                mapping: "standard",
                timestamp: performance.now(),
                axes: s.axes,
                buttons: Array.from({ length: 17 }, (_, i) => ({
                  pressed: s.pressed.includes(i),
                  value: s.pressed.includes(i) ? 1 : 0,
                })),
              },
            ]
          : [];
      },
    });
  });
}
export async function setPad(
  p: Page,
  pressed: number[] = [],
  axes: number[] = [0, 0, 0, 0],
) {
  await p.evaluate(
    ({ pressed, axes }) =>
      Object.assign((window as any).__wm003pad, { pressed, axes }),
    { pressed, axes },
  );
}
export async function padTap(p: Page, n: number) {
  await setPad(p, [n]);
  await p.waitForTimeout(90);
  await setPad(p);
  await p.waitForTimeout(170);
}
export async function controllerStart(p: Page) {
  await installPad(p);
  await p.goto("/?test=1");
  await expect(p.locator("#loading")).toHaveClass(/hidden/);
  await padTap(p, 0);
  await p.waitForFunction(
    () =>
      window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
      "CONTROLLER_READY",
  );
  await padTap(p, 0);
  await expect(
    p.getByRole("heading", { name: "Choose a save slot" }),
  ).toBeVisible();
  await padTap(p, 0);
  await padTap(p, 13);
  await padTap(p, 0);
  await expect(p.locator("#input-overlay")).toBeVisible();
  await p.waitForFunction(
    () =>
      window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
      "CONTROLLER_READY",
  );
}
export function controller(p: Page): Controls {
  const held = new Set<string>(),
    buttons: Record<string, number> = {
      e: 6,
      c: 5,
      q: 4,
      Shift: 7,
      Space: 0,
      Escape: 9,
      r: 11,
    };
  const update = async (rx = 0, ry = 0) =>
    setPad(
      p,
      [...held].flatMap((k) => (buttons[k] === undefined ? [] : [buttons[k]!])),
      [
        (held.has("d") ? 1 : 0) - (held.has("a") ? 1 : 0),
        (held.has("s") ? 1 : 0) - (held.has("w") ? 1 : 0),
        rx,
        ry,
      ],
    );
  return {
    down: async (k) => {
      held.add(k);
      await update();
    },
    up: async (k) => {
      held.delete(k);
      await update();
    },
    press: async (k) => {
      held.add(k);
      await update();
      await p.waitForTimeout(75);
      held.delete(k);
      await update();
    },
    look: async (alpha, beta) => {
      for (let n = 0; n < 400; n++) {
        const s = await state(p),
          dx = s.cameraAlpha - alpha,
          dy = beta === undefined ? 0 : beta - s.cameraBeta;
        if (Math.abs(dx) < 0.009 && Math.abs(dy) < 0.009) break;
        await update(
          Math.abs(dx) < 0.009
            ? 0
            : Math.sign(dx) * (0.18 + Math.min(0.5, Math.abs(dx) * 0.6)),
          Math.abs(dy) < 0.009
            ? 0
            : Math.sign(dy) * (0.18 + Math.min(0.5, Math.abs(dy) * 0.6)),
        );
        await p.waitForTimeout(25);
      }
      await update();
      await p.waitForTimeout(150);
      const s = await state(p);
      expect(Math.abs(s.cameraAlpha - alpha)).toBeLessThan(0.04);
      if (beta !== undefined)
        expect(Math.abs(s.cameraBeta - beta)).toBeLessThan(0.04);
    },
  };
}
export async function stop(p: Page, controls = keyboard(p)) {
  for (const k of ["w", "a", "s", "d", "Shift", "c", "q", "e"])
    await controls.up(k);
  await p.waitForTimeout(350);
}
export async function route(
  p: Page,
  controls = keyboard(p),
  prefix = "keyboard",
) {
  await controls.look(Math.PI / 2, 1.65);
  await controls.down("w");
  await controls.down("Shift");
  await wait(p, (s) => s.position.z < -21);
  await controls.down("e");
  await controls.press("Space");
  await wait(p, (s) => s.swing.web?.anchorId === "training-ring");
  await shot(p, prefix + "-entry-swing");
  await wait(p, (s) => s.position.z < -36);
  await controls.up("e");
  await wait(p, (s) => s.training.stage === 1);
  await stop(p, controls);
  await shot(p, prefix + "-entry-landing");
  await controls.look(Math.PI / 2, 1.08);
  await controls.down("d");
  await wait(p, (s) => s.position.x < -2.7);
  await controls.up("d");
  await p.waitForTimeout(250);
  await controls.down("w");
  await wait(p, (s) => s.position.z < -57.5);
  await controls.up("w");
  await p.waitForTimeout(250);
  await controls.down("a");
  await wait(p, (s) => s.position.x > -0.1);
  await controls.up("a");
  await p.waitForTimeout(250);
  await controls.down("w");
  await wait(p, (s) => s.position.z < -60.1);
  await controls.up("w");
  await p.waitForTimeout(300);
  await controls.down("c");
  await wait(p, (s) => s.traversal.surfaceId === "climb-wall");
  await shot(p, prefix + "-wall-attachment");
  if (prefix === "keyboard") await hudLayout(p, "wall");
  await controls.down("w");
  await wait(p, (s) => s.position.y > 6);
  await controls.up("w");
  await shot(p, prefix + "-vertical-climb");
  await controls.down("d");
  await wait(p, (s) => s.position.x < -6);
  await controls.up("d");
  await shot(p, prefix + "-lateral-climb");
  await controls.down("w");
  await wait(p, (s) => s.traversal.surfaceId === "climb-ceiling");
  await controls.up("w");
  await shot(p, prefix + "-ceiling-transition");
  await controls.down("s");
  await wait(p, (s) => s.position.z > -50.5);
  await controls.up("s");
  await shot(p, prefix + "-ceiling-movement");
  if (prefix === "keyboard") await hudLayout(p, "ceiling");
  await controls.up("c");
  await wait(p, (s) => s.training.stage === 4);
  await shot(p, prefix + "-deliberate-drop");
  await p.waitForTimeout(750);
  await controls.look(Math.PI / 2, 1.08);
  await controls.down("w");
  await wait(p, (s) => s.position.z < -50.9);
  await controls.up("w");
  await controls.down("d");
  await wait(p, (s) => s.position.x < -9.15);
  await stop(p, controls);
  await controls.look(Math.PI, 1.45);
  await controls.down("q");
  await wait(p, (s) => s.traversal.pullId === "route-step");
  await shot(p, prefix + "-hand-pull-web");
  await wait(p, (s) => s.training.stage === 5);
  await shot(p, prefix + "-crate-on-mark");
  if (prefix === "keyboard") await hudLayout(p, "pull");
  await controls.up("q");
  await p.waitForTimeout(350);
  // Jump east onto the moved crate, then turn west for the higher ledge.
  await controls.down("w");
  await p.waitForTimeout(170);
  await controls.press("Space");
  await wait(p, (s) => s.position.x > -7.5);
  await controls.up("w");
  await wait(p, (s) => s.grounded && s.position.y > 1);
  await shot(p, prefix + "-using-crate-step");
  await controls.look(0, 1.1);
  await controls.down("w");
  await p.waitForTimeout(190);
  await controls.press("Space");
  await wait(p, (s) => s.training.completed);
  await stop(p, controls);
  await wait(p, (s) => s.safe);
  await shot(p, prefix + "-combined-finish");
}
