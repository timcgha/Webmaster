import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMBAT_HUD_BUTTON,
  COMBAT_INVITE,
  SAVE_UNAVAILABLE,
  prepareInherited,
  refreshCommonSelectors,
  refreshCurrentCourse,
  refreshWm002Routes,
  replaceAllMarked,
  replaceRange,
} from "./wm006-prepare-inherited.mjs";

test("replaceAllMarked fails closed when marker is missing", () => {
  assert.throws(
    () => replaceAllMarked("abc", "zzz", "y", "gone"),
    /missing marker: gone/,
  );
});

test("replaceRange uses start/end markers instead of brittle indexOf", () => {
  const source = `async function keyboardRoute(page: Page) {\n  old();\n}\ntest("WM-002 keyboard route") {}`;
  const next = replaceRange(
    source,
    /async function keyboardRoute\s*\(/,
    /test\(\s*"WM-002 keyboard/,
    "async function keyboardRoute(page:Page){return;}\n",
    "keyboard",
  );
  assert.match(next, /async function keyboardRoute\(page:Page\)\{return;\}/);
  assert.match(next, /test\("WM-002 keyboard route"\)/);
  assert.doesNotMatch(next, /old\(\)/);
});

test("common selector refresh is idempotent and updates legacy save copy", () => {
  const once = refreshCommonSelectors(
    `await page.getByRole("button", { name: /Resume/ }).click();\n` +
      `await expect(button).toContainText("Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering");`,
  );
  assert.match(once, /name: \/\^Resume\//);
  assert.ok(once.includes(SAVE_UNAVAILABLE));
  assert.equal(refreshCommonSelectors(once), once);
});

test("wm002 route overlay injects legacy sequencer once", () => {
  const source =
    `async function keyboardRoute(page: Page, captures = true) {\n  await look(page, 0, 170);\n}\n` +
    `test("WM-002 keyboard continuous four-gap route", async () => {});\n` +
    `async function controllerRoute(page: Page) {\n  await pad(page);\n}\n` +
    `test("WM-002 simulated PlayStation controller-only", async () => {});\n` +
    `const options = { headless: true, baseURL: "http://127.0.0.1:4173" };\n`;
  const once = refreshWm002Routes(source, "evidence/wm-006/regression-refresh");
  const twice = refreshWm002Routes(once, "evidence/wm-006/regression-refresh");
  assert.equal(
    once.split("async function currentLegacyRoute(").length - 1,
    1,
  );
  assert.equal(
    twice.split("async function currentLegacyRoute(").length - 1,
    1,
  );
  assert.match(once, /headless: true, channel: "chromium"/);
  assert.match(once, /installCourseControls/);
});

test("current-course overlay uses live combat invite and HUD button copy", () => {
  const source =
    `import {state,start,controllerStart,keyboard,controller,padTap,look,hudLayout} from "./routes/wm003-route";\n` +
    `const out="evidence/wm-005/captures";\n` +
    `await replayStart(page,c,pad);await fullCourse(page,label);expect(errors).toEqual([]);\n`;
  const next = refreshCurrentCourse(source);
  assert.ok(next.includes(COMBAT_INVITE));
  assert.ok(next.includes(COMBAT_HUD_BUTTON));
  assert.ok(next.includes('menuChoice'));
  assert.ok(next.includes('evidence/wm-006/regression-refresh/current-course'));
  assert.throws(
    () => refreshCurrentCourse('const out="evidence/wm-005/captures";'),
    /complete course handoff/,
  );
});

test("prepareInherited writes refresh overlays against live e2e sources", () => {
  const result = prepareInherited({ write: true });
  assert.ok(result.transformed.some((t) => t.overlay.includes("wm001")));
  assert.ok(
    result.transformed.some((t) => t.overlay.includes("current-course")),
  );
  const course = fs.readFileSync(
    "e2e/wm006-refresh-current-course.spec.ts",
    "utf8",
  );
  assert.ok(course.includes(COMBAT_INVITE));
  assert.ok(course.includes(COMBAT_HUD_BUTTON));
  assert.doesNotMatch(course, /Open training menu/);
  assert.doesNotMatch(course, /Try combat training next/);
});
