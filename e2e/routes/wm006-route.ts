import { expect, type Page } from "@playwright/test";
import { padTap, start, controllerStart } from "./wm003-route";
import { installCourseControls } from "./wm005-route";

export async function menuChoice(page: Page, pad: boolean, name: RegExp) {
  if (!pad) {
    await page.getByRole("button", { name }).click();
    return;
  }
  for (let n = 0; n < 18; n++) {
    const label = await page
      .locator('#menu-layer button[aria-current="true"]')
      .innerText();
    if (name.test(label)) {
      await padTap(page, 0);
      return;
    }
    await padTap(page, 13);
  }
  throw Error("Menu choice not reached: " + name);
}
export async function enterCombat(page: Page, pad: boolean) {
  if (pad) await controllerStart(page);
  else await start(page);
  if (pad) await padTap(page, 9);
  else await page.keyboard.press("Escape");
  await menuChoice(page, pad, /^Combat Playground/);
  await expect(page.locator(".combat-card")).toBeVisible();
  await installCombatControls(page, pad);
  await page.evaluate(async () => {
    await (window as any).__wm006Controls.rest(500);
  });
}
export async function installCombatControls(page: Page, pad: boolean) {
  await installCourseControls(page, pad);
  await page.evaluate((pad) => {
    const w = window as any,
      c = w.__wm005Controls,
      events: any[] = [],
      held = new Set<string>();
    const buttons: Record<string, number> = {
      j: 2,
      k: 3,
      l: 12,
      f: 1,
      Space: 0,
      e: 6,
      c: 5,
      q: 4,
      Shift: 7,
    };
    const state = c.state,
      frame = c.frame,
      until = c.until;
    function keys(...wanted: string[]) {
      const next = new Set(wanted);
      if (pad) {
        w.__wm003pad.pressed = [...next].flatMap((k) =>
          buttons[k] === undefined ? [] : [buttons[k]],
        );
        w.__wm003pad.axes = [
          Number(next.has("d")) - Number(next.has("a")),
          Number(next.has("s")) - Number(next.has("w")),
          0,
          0,
        ];
      } else
        for (const k of new Set([...held, ...next]))
          if (next.has(k) !== held.has(k))
            window.dispatchEvent(
              new KeyboardEvent(next.has(k) ? "keydown" : "keyup", {
                code:
                  k === "Space"
                    ? "Space"
                    : k === "Shift"
                      ? "ShiftLeft"
                      : `Key${k.toUpperCase()}`,
                key: k === "Space" ? " " : k,
                bubbles: true,
              }),
            );
      held.clear();
      next.forEach((k) => held.add(k));
      events.push({ at: performance.now(), keys: [...held] });
    }
    async function rest(ms = 500) {
      keys();
      const start = performance.now();
      while (performance.now() - start < ms) await frame();
    }
    async function tap(key: string) {
      keys(key);
      await frame();
      await frame();
      keys();
      await frame();
    }
    async function center(z: number) {
      keys();
      await c.look(-Math.PI / 2, 1.08);
      await c.center({ x: -38, z });
      // A final short forward press makes facing explicit without setting it.
      keys("w");
      await frame();
      keys();
      await rest(160);
    }
    async function three(key: string) {
      for (let i = 0; i < 3; i++) {
        await tap(key);
        await rest(350);
      }
      await until(
        (s: any) => !s.combat.attack && !s.combat.queued,
        "attack settles",
      );
    }
    async function dodge() {
      await until(
        (s: any) =>
          s.combat.machine.phase === "warning" && s.combat.machine.age >= 1.02 && s.combat.machine.age < 1.13,
        "late amber cue",
        12000,
      );
      keys("d", "f");
      await frame();
      await frame();
      keys();
      await rest(750);
    }
    w.__wm006Controls = {
      ...c,
      keys,
      rest,
      tap,
      center,
      three,
      dodge,
      events,
      state,
      frame,
      until,
    };
  }, pad);
}
