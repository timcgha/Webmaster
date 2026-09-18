import { describe, it, expect } from "vitest";
import {
  beginCombat,
  newCombat,
  comboPress,
  pressAttack,
  pressDodge,
  stepCombat,
  clearCombat,
  retryCombat,
  combatSafe,
  protectedByDodge,
  segmentBox,
  validCombatSave,
  type CombatState,
} from "../src/core/combat";
import type { MotionState } from "../src/core/types";
import type { Solid } from "../src/core/swing";
const hero = (z = -51.5): MotionState => ({
  position: { x: -38, y: -18, z },
  velocity: { x: 0, y: 0, z: 0 },
  grounded: true,
  facingYaw: 0,
});
const tick = (
  s: CombatState,
  m: MotionState,
  n: number,
  solids: Solid[] = [],
) => {
  for (let i = 0; i < n; i++) stepCombat(s, m, 0.01, solids);
};
describe("strict independent press combinations", () => {
  for (const kind of ["punch", "kick", "web"] as const) {
    it(`${kind} loops 1-2-3-1 and resets at exactly 1000ms`, () => {
      const s = newCombat();
      expect([0, 999, 1998, 2997].map((t) => comboPress(s, kind, t))).toEqual([
        1, 2, 3, 1,
      ]);
      expect(comboPress(s, kind, 3997)).toBe(1);
      expect(comboPress(s, kind, 4998)).toBe(1);
    });
  }
  it("interleaved presses keep their own clock and reject backwards timestamps", () => {
    const s = newCombat();
    expect(comboPress(s, "punch", 0)).toBe(1);
    expect(comboPress(s, "web", 200)).toBe(1);
    expect(comboPress(s, "kick", 500)).toBe(1);
    expect(comboPress(s, "punch", 800)).toBe(2);
    expect(comboPress(s, "web", 1200)).toBe(1);
    expect(comboPress(s, "kick", 100)).toBe(1);
  });
  it("one queued attack maximum and no autonomous hold-repeat", () => {
    const s = newCombat(),
      m = hero();
    pressAttack(s, m, "punch", 0);
    for (let i = 1; i < 30; i++) pressAttack(s, m, "punch", i * 2);
    expect(s.history.length).toBe(1);
    tick(s, m, 150);
    expect(s.history.length).toBe(2);
    expect(s.attack).toBeNull();
    expect(s.queued).toBeNull();
    tick(s, m, 200);
    expect(s.history.length).toBe(2);
  });
});
describe("damage, aim and course", () => {
  it("one damage event per melee swing across many frames", () => {
    const s = beginCombat(),
      m = hero();
    pressAttack(s, m, "punch", 0);
    tick(s, m, 35);
    expect(s.targets[0]!.hp).toBe(62);
    expect(s.targets[0]!.hits).toEqual([1]);
    tick(s, m, 80);
    expect(s.targets[0]!.hp).toBe(62);
  });
  it("ordinary 3-punch combination breaks box only once and preserves full finisher", () => {
    const s = beginCombat(),
      m = hero();
    for (let i = 0; i < 3; i++) {
      pressAttack(s, m, "punch", i * 450);
      tick(s, m, 45);
    }
    expect(s.targets[0]!.hp).toBe(0);
    expect(s.attack?.step).toBe(3);
    tick(s, m, 30);
    expect(s.stage).toBe(1);
    expect(s.targets[1]!.active).toBe(true);
  });
  it("single jabs cannot trap finisher box at zero health", () => {
    const s = beginCombat(),
      m = hero();
    for (let i = 0; i < 8; i++) {
      pressAttack(s, m, "punch", i * 1100);
      tick(s, m, 50);
    }
    expect(s.targets[0]!.hp).toBe(1);
    pressAttack(s, m, "punch", 8000);
    tick(s, m, 40);
    pressAttack(s, m, "punch", 8400);
    tick(s, m, 80);
    expect(s.stage).toBe(1);
  });
  it("melee cone and range prevent behind/distant hits", () => {
    for (const [z, yaw] of [
      [-56, 0],
      [-47, 0],
    ]) {
      const s = beginCombat(),
        m = hero(z);
      m.facingYaw = yaw!;
      pressAttack(s, m, "punch", 0);
      tick(s, m, 50);
      expect(s.targets[0]!.hp).toBe(80);
    }
  });
  it("melee respects solid obstruction", () => {
    const s = beginCombat(),
      m = hero(),
      wall = {
        id: "wall",
        minX: -40,
        maxX: -36,
        minY: -18,
        maxY: -12,
        minZ: -50.5,
        maxZ: -50,
      };
    pressAttack(s, m, "punch", 0, [wall]);
    tick(s, m, 60, [wall]);
    expect(s.targets[0]!.hp).toBe(80);
  });
  it("high pad requires a kick and first kick launches a grounded hero", () => {
    const s = beginCombat(),
      m = hero(-43);
    s.stage = 1;
    tick(s, m, 1);
    pressAttack(s, m, "punch", 0);
    tick(s, m, 50);
    expect(s.targets[1]!.hp).toBe(32);
    pressAttack(s, m, "kick", 1000);
    expect(m.grounded).toBe(false);
    expect(m.velocity.y).toBe(8);
    m.position.y = -17;
    tick(s, m, 50);
    expect(s.stage).toBe(2);
  });
  it("web hits damage once, wrap stops movement then expires automatically", () => {
    const s = beginCombat(),
      m = hero(-37);
    s.stage = 2;
    tick(s, m, 1);
    pressAttack(s, m, "web", 0);
    tick(s, m, 45);
    const t = s.targets[2]!;
    expect(t.hp).toBe(142);
    expect(t.wrap).toBeGreaterThan(0);
    const x = t.position.x;
    tick(s, m, 60);
    expect(t.position.x).toBe(x);
    tick(s, m, 250);
    expect(t.wrap).toBe(0);
    expect(t.released).toBe(true);
    expect(t.position.x).not.toBe(x);
    expect(t.hp).toBe(142);
  });
  it("web projectile is swept and cannot cross a wall", () => {
    const s = beginCombat(),
      m = hero(-37);
    s.stage = 2;
    tick(s, m, 1);
    const wall = {
      id: "wall",
      minX: -41,
      maxX: -35,
      minY: -18,
      maxY: -12,
      minZ: -35,
      maxZ: -34.9,
    };
    pressAttack(s, m, "web", 0, [wall]);
    tick(s, m, 100, [wall]);
    expect(s.targets[2]!.hp).toBe(160);
    expect(s.shots).toHaveLength(0);
  });
  it("swept collision catches thin obstacles and starts-inside", () => {
    const wall = {
      id: "thin",
      minX: 0,
      maxX: 0.01,
      minY: -1,
      maxY: 1,
      minZ: -1,
      maxZ: 1,
    };
    expect(segmentBox({ x: -2, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, wall)).toBe(
      0.5,
    );
    expect(segmentBox({ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, wall)).toBe(
      0,
    );
  });
});
describe("dodge protection, recovery and lifecycle", () => {
  it("left/right are camera lateral; neutral hops opposite facing", () => {
    for (const x of [-1, 0, 1]) {
      const s = newCombat(),
        m = hero();
      expect(pressDodge(s, m, x, { x: 0, y: 0, z: 1 })).toBe(true);
      expect(s.dodge!.direction.x).toBeCloseTo(x);
      expect(s.dodge!.direction.y).toBe(0);
      expect(s.dodge!.direction.z).toBeCloseTo(x ? 0 : -1);
    }
  });
  it("protection is brief with vulnerable recovery and no chaining", () => {
    const s = newCombat(),
      m = hero();
    pressDodge(s, m, 0, { x: 0, y: 0, z: 1 });
    expect(protectedByDodge(s)).toBe(false);
    tick(s, m, 5);
    expect(protectedByDodge(s)).toBe(true);
    tick(s, m, 30);
    expect(protectedByDodge(s)).toBe(false);
    expect(pressDodge(s, m, 0, { x: 0, y: 0, z: 1 })).toBe(false);
    tick(s, m, 70);
    expect(pressDodge(s, m, 0, { x: 0, y: 0, z: 1 })).toBe(true);
  });
  it("dodge cannot move through a wall", () => {
    const s = newCombat(),
      m = hero();
    const wall = {
      id: "side",
      minX: -37.4,
      maxX: -35,
      minY: -18,
      maxY: 0,
      minZ: -60,
      maxZ: 0,
    };
    pressDodge(s, m, 1, { x: 0, y: 0, z: 1 });
    tick(s, m, 60, [wall]);
    expect(m.position.x).toBeLessThan(-37.88);
  });
  it("telegraph precedes harmless contact, then immediate retry remains available", () => {
    const s = beginCombat(),
      m = hero(-25);
    s.stage = 3;
    tick(s, m, 100);
    expect(s.machine.phase).toBe("warning");
    expect(s.bumps).toBe(0);
    tick(s, m, 50);
    expect(s.bumps).toBe(1);
    expect(s.stage).toBe(3);
    retryCombat(s);
    expect(s.stage).toBe(3);
    expect(s.machine.phase).toBe("idle");
    expect(s.bumps).toBe(0);
  });
  it("timely dodge earns training progress; final dodge earns completion once", () => {
    for (const stage of [3, 4]) {
      const s = beginCombat(),
        m = hero(stage === 3 ? -25 : -1);
      s.stage = stage;
      s.finalPart = 3;
      tick(s, m, 116);
      pressDodge(s, m, 1, { x: 0, y: 0, z: 1 });
      tick(s, m, 30);
      expect(s.successfulDodges).toBe(1);
      expect(s.stage).toBe(stage + 1);
      expect(s.completed).toBe(stage === 4);
      tick(s, m, 400);
      expect(s.successfulDodges).toBe(1);
    }
  });
  it("clear removes all dangerous transients without awarding completion", () => {
    const s = beginCombat(),
      m = hero();
    pressAttack(s, m, "web", 0);
    pressAttack(s, m, "kick", 100);
    pressDodge(s, m, 1, { x: 0, y: 0, z: 1 });
    s.targets[2]!.wrap = 2;
    s.machine.phase = "warning";
    expect(combatSafe(s)).toBe(false);
    clearCombat(s);
    expect(combatSafe(s)).toBe(true);
    expect(s.attack).toBeNull();
    expect(s.queued).toBeNull();
    expect(s.dodge).toBeNull();
    expect(s.shots).toEqual([]);
    expect(s.stage).toBe(0);
    expect(s.completed).toBe(false);
    expect(comboPress(s, "web", 500)).toBe(1);
  });
  it("retry resets damage/wrap/sequence but retains prior earned badge; only validated badge is persisted", () => {
    const s = beginCombat(true);
    s.targets[0]!.hp = 1;
    s.targets[2]!.wrap = 2;
    s.stage = 4;
    s.finalPart = 2;
    retryCombat(s);
    expect(s.targets[0]!.hp).toBe(80);
    expect(s.finalPart).toBe(0);
    expect(s.completed).toBe(true);
    expect(validCombatSave({ version: 1, completed: true })).toBe(true);
    for (const bad of [
      null,
      {},
      { version: 2, completed: true },
      { version: 1, completed: "yes" },
    ])
      expect(validCombatSave(bad)).toBe(false);
  });
});
