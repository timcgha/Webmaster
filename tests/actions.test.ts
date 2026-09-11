import { describe, expect, it } from "vitest";
import { controllerFamily, mapStandardGamepad, type GamepadLike } from "../src/core/actions";

function pad(id: string, axes = [0, 0, 0, 0], pressed: number[] = []): GamepadLike {
  return {
    id,
    index: 0,
    connected: true,
    mapping: "standard",
    axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: pressed.includes(index), value: pressed.includes(index) ? 1 : 0 })),
  };
}

describe("standard Gamepad semantic mapping", () => {
  it("identifies Xbox, PlayStation, and generic prompt families", () => {
    expect(controllerFamily("Xbox Wireless Controller")).toBe("xbox");
    expect(controllerFamily("DualSense Wireless Controller")).toBe("playstation");
    expect(controllerFamily("8BitDo Pro")).toBe("generic");
  });

  it("maps standard sticks, south/east buttons, trigger, menu, and stick click", () => {
    const mapped = mapStandardGamepad(pad("Xbox Controller", [0.8, -0.7, 0.4, -0.5], [0, 1, 7, 9, 10]));
    expect(mapped.moveX).toBeGreaterThan(0.7);
    expect(mapped.moveY).toBeGreaterThan(0.6);
    expect(mapped.lookX).toBeGreaterThan(0.2);
    expect(mapped.lookY).toBeLessThan(-0.3);
    expect(mapped).toMatchObject({ run: true, confirm: true, back: true, pause: true, recenter: true, family: "xbox" });
  });

  it("uses d-pad for menus and suppresses stick drift", () => {
    expect(mapStandardGamepad(pad("DualShock", [0.08, -0.1, 0.05, 0.02])).neutral).toBe(true);
    expect(mapStandardGamepad(pad("DualShock", [0, 0, 0, 0], [12, 15]))).toMatchObject({ menuX: 1, menuY: -1 });
  });
});
