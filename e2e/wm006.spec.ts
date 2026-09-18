import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  enterCombat,
  menuChoice,
  installCombatControls,
} from "./routes/wm006-route";
import { state, padTap, hudLayout } from "./routes/wm003-route";
const out = "evidence/wm-006/rendered";

for (const pad of [false, true])
  test(`WM006 complete combat course, cleanup, saves and traversal return — ${pad ? "semantic-controller" : "keyboard-mouse"}`, async ({
    page,
  }) => {
    test.setTimeout(300000);
    await mkdir(out, { recursive: true });
    const input = pad ? "controller" : "keyboard",
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const checkpoints: any[] = [];
    await enterCombat(page, pad);
    const capture = async (name: string) => {
      checkpoints.push({ name, state: await state(page) });
      await page.screenshot({ path: `${out}/${input}-${name}.png` });
    };
    await capture("start");
    if (!pad) await hudLayout(page, "combat-start");
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.center(-52);
      await c.tap("j");
      c.keys("j");
      const heldAt=performance.now();
      while(performance.now()-heldAt<1300)await c.frame();
      c.keys();await c.rest(1100);
    });
    // One intentional tap followed by a second held press: no held repeat.
    const held = await state(page);
    expect(held.combat.history.length).toBe(2);
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.three("j");
      await c.until((s: any) => s.combat.stage === 1, "box complete");
    });
    await capture("box-complete");
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.center(-44);
      await c.tap("k");
      await c.until(
        (s: any) => s.combat.stage === 2 && s.grounded,
        "high kick complete",
      );
    });
    await capture("high-kick-complete");
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.center(-37);
      await c.three("l");
    });
    const wrapped = await state(page);
    expect(wrapped.combat.targets[2]!.hits).toEqual([1, 2, 3]);
    expect(wrapped.combat.targets[2]!.wrap).toBeGreaterThan(0);
    expect(wrapped.combat.targets[2]!.hp).toBe(84);
    await capture("wrapped-dummy");
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.until((s: any) => s.combat.stage === 3, "automatic unwrap");
      await c.center(-27);
    });
    await capture("dodge-warning");
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.dodge();
      await c.until((s: any) => s.combat.stage === 4, "successful dodge");
    });
    await capture("final-start");
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.center(-16);
      await c.three("j");
      await c.until((s: any) => s.combat.finalPart === 1, "final box");
      await c.center(-12);
      await c.tap("k");
      await c.until(
        (s: any) => s.combat.finalPart === 2 && s.grounded,
        "final kick",
      );
      await c.center(-8);
      await c.three("l");
      await c.until((s: any) => s.combat.finalPart === 3, "final unwrap");
      await c.center(-3);
      await c.dodge();
      await c.until((s: any) => s.combat.completed, "course complete");
      await c.rest(1100);
    });
    await capture("complete");
    expect((await state(page)).combat.successfulDodges).toBe(2);
    const pause = async () => {
      if (pad) await padTap(page, 9);
      else await page.keyboard.press("Escape");
    };
    await pause();
    await menuChoice(page, pad, /^Save Game/);
    await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
    await menuChoice(page, pad, /^Save & Quit/);
    await menuChoice(page, pad, /^Continue/);
    await page.waitForFunction(() => window.__WM_DEBUG__!.getState().safe);
    const loaded = await state(page);
    expect(loaded.combat.completed).toBe(true);
    expect(loaded.combat.attack).toBeNull();
    expect(loaded.combat.shots).toHaveLength(0);
    expect(loaded.combat.dodge).toBeNull();
    await capture("loaded-badge");
    await pause();
    await menuChoice(page, pad, /^Replay Combat Playground/);
    await installCombatControls(page, pad);
    await page.evaluate(async () => {
      const c = (window as any).__wm006Controls;
      await c.rest(300);
      await c.tap("l");
    });
    await pause();
    const paused = await state(page);
    expect(paused.combat.attack).toBeNull();
    expect(paused.combat.shots).toHaveLength(0);
    expect(paused.combat.queued).toBeNull();
    await menuChoice(page, pad, /^Restart at checkpoint/);
    await installCombatControls(page, pad);
    expect((await state(page)).combat.targets[0]!.hp).toBe(80);
    await pause();
    await menuChoice(page, pad, /^Return to traversal/);
    expect((await state(page)).combat.active).toBe(false);
    await capture("traversal-return");
    expect(errors).toEqual([]);
    await writeFile(
      `${out}/${input}-journey.json`,
      JSON.stringify(
        {
          method:
            "Ordinary menus, keyboard/mouse or standard Gamepad semantics; debug observations only; no position/progression/time writes",
          checkpoints,
          errors,
        },
        null,
        2,
      ),
    );
  });
