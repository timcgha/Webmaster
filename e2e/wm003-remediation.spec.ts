import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { start, state, wait, look } from "./routes/wm003-route";

const output = "evidence/wm-003/remediation-r1/captures";
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus)
    await writeFile(info.outputPath("last-state.json"), JSON.stringify(await state(page), null, 2));
});
async function records(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("webmaster.save"))));
}
async function saved(page: Page, kind: "manual" | "checkpoint") {
  return page.evaluate(async (kind) => {
    // Read through the production save reader, including generation/checksum validation.
    const path = "/src/core/save.ts";
    const { SaveStore } = await import(/* @vite-ignore */ path);
    return new SaveStore(localStorage).read(1, kind);
  }, kind);
}

test("WM003 R1 genuine roof2 checkpoint and manual save survive reload", async ({ page }) => {
  test.setTimeout(90000);
  await mkdir(output, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await start(page);
  const manualBefore = await saved(page, "manual");
  const camera = await state(page);
  await look(page, camera.cameraAlpha, camera.cameraBeta + 170 * 0.0035);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await wait(page, (s) => s.position.z >= 21);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await wait(page, (s) => !!s.swing.web);
  await wait(page, (s) => s.position.z >= 37);
  await page.keyboard.up("e");
  await wait(page, (s) => s.skyline.stage === 1);
  await wait(page, (s) => s.position.z >= 53);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await wait(page, (s) => s.position.z >= 76.5);
  await page.keyboard.up("e");
  await wait(page, (s) => s.skyline.stage === 2);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await wait(page, (s) => s.safe && s.grounded);
  await expect.poll(async () => (await saved(page, "checkpoint")).payload?.skyline?.checkpoint).toBe(2);
  expect(await saved(page, "manual")).toEqual(manualBefore);
  const checkpoint = await saved(page, "checkpoint");
  expect(checkpoint.payload.checkpoint).toEqual({ x: 0, y: 2, z: 88 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Save Game/ })).toBeEnabled();
  await page.screenshot({ path: `${output}/roof2-save-enabled.png` });
  await page.getByRole("button", { name: /Save Game/ }).click();
  const manual = await saved(page, "manual");
  expect(manual.payload.skyline.checkpoint).toBe(2);
  expect(manual.payload.position.y).toBe(2);
  expect(await saved(page, "checkpoint")).toEqual(checkpoint);
  const stored = await records(page);
  await page.reload();
  await expect(page.locator("#loading")).toHaveClass(/hidden/);
  await page.getByRole("button", { name: /Continue/ }).click();
  const loaded = await state(page);
  expect(loaded.skyline.stage).toBe(2);
  expect(loaded.grounded).toBe(true);
  expect(loaded.safe).toBe(true);
  expect(loaded.traversal.surfaceId).toBeNull();
  expect(loaded.traversal.pullId).toBeNull();
  expect(await records(page)).toEqual(stored);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `${output}/roof2-reloaded.png` });
  await writeFile(`${output}/roof2-save.json`, JSON.stringify({ method: "Ordinary New Game and two genuine swing gaps; checkpoint and manual save generation/readback, same-origin reload. No fixture placement.", checkpoint, manual, loaded, errors }, null, 2));
});

test("WM003 R1 standing on dynamic step still disables both save actions", async ({ page }) => {
  await mkdir(output, { recursive: true });
  await start(page);
  await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 0, y: 1.3, z: -51 }, "negative save restriction: standing on dynamic route-step"));
  await wait(page, (s) => s.grounded && ["FREE_OR_GROUNDED", "PULL_TARGET_AVAILABLE", "WALL_TARGET_AVAILABLE"].includes(s.traversal.phase));
  const grounded = await state(page);
  expect(grounded.traversal.surfaceId).toBeNull();
  expect(grounded.traversal.pullId).toBeNull();
  expect(grounded.swing.web).toBeNull();
  expect(grounded.safe).toBe(false);
  expect(grounded.position.y).toBe(1.3);
  const before = await records(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Save & Quit/ })).toBeDisabled();
  expect(await records(page)).toEqual(before);
  await page.screenshot({ path: `${output}/dynamic-step-save-disabled.png` });
  const graphics = await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>("#game-canvas")!.getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return { renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR), unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, version: gl.getParameter(gl.VERSION) };
  });
  await writeFile(`${output}/dynamic-step-save.json`, JSON.stringify({ method: "Explicit labelled negative fixture only, not route evidence", grounded, bytesPreserved: true, graphics }, null, 2));
});
