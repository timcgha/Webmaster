import { describe, expect, it } from "vitest";
import { mapStandardGamepad } from "../src/core/actions";
import {
  LIMITS, SURFACES, TRAINING_SOLIDS, newPullObjects, newTraversal,
  safeTraversal, selectWall, stepTraversal,
  type TraversalInput, type TraversalState,
} from "../src/core/traversal";
import { HERO_RADIUS, newSwing, type Solid } from "../src/core/swing";
import type { MotionState } from "../src/core/types";

const motion = (x = 0, y = 0, z = -59.86): MotionState => ({
  position: { x, y, z }, velocity: { x: 0, y: 0, z: 0 },
  grounded: true, facingYaw: Math.PI,
});
const input = (axes: Partial<TraversalInput> = {}): TraversalInput => ({
  moveX: 0, moveY: 0, climbHeld: true, pullHeld: false, swingHeld: false,
  run: false, jumpPressed: false, cameraForward: { x: 0, y: 0, z: -1 },
  aim: { origin: { x: 0, y: 2, z: -50 }, direction: { x: 0, y: 0, z: -1 } },
  ...axes,
});
const obstacle: Solid = {
  id: "qa-adjacent-solid", minX: 0.2, maxX: 0.45,
  minY: 0, maxY: 3.4, minZ: -60.8, maxZ: -60.4,
};

describe("F-WM003-QA-01 actual dynamic-object support", () => {
  it("keeps authored static roof2 safe despite a distant crate at the same Y", () => {
    expect(safeTraversal(motion(0, 2, 88), newTraversal(), false, newPullObjects())).toBe(true);
  });
  it.each(newPullObjects().map((o) => [o.id, o] as const))(
    "keeps standing on %s unsafe to persist transient object placement", (_, object) => {
      const { x, y, z } = object.position;
      expect(safeTraversal(motion(x, y + object.half.y, z), newTraversal(), false, [object])).toBe(false);
    },
  );
  it("requires overlap in both horizontal axes and top contact", () => {
    const object = newPullObjects()[0]!;
    const top = object.position.y + object.half.y;
    const edge = object.position.x + object.half.x + HERO_RADIUS;
    const safe = (x: number, y: number, z: number) => safeTraversal(motion(x, y, z), newTraversal(), false, [object]);
    expect(safe(edge - 0.01, top, object.position.z)).toBe(false);
    expect(safe(edge, top, object.position.z)).toBe(true);
    expect(safe(0, top, object.position.z + object.half.z + HERO_RADIUS)).toBe(true);
    expect(safe(0, top + 0.03, object.position.z)).toBe(true);
  });
});

describe("F-WM003-QA-02 full body clearance before wall attachment", () => {
  it("rejects the exact off-center obstruction before snapping, including repeated hold", () => {
    const solids = [...TRAINING_SOLIDS, obstacle];
    const start = motion();
    expect(selectWall(start, true, SURFACES, solids)).toBeNull();
    let current = { motion: start, traversal: newTraversal(), swing: newSwing(), objects: newPullObjects() };
    for (let n = 0; n < 61; n++) {
      current = stepTraversal(current.motion, current.traversal, current.swing, current.objects, input(), [], solids);
      expect(current.traversal.surfaceId).toBeNull();
      expect(current.motion.position).toEqual(start.position);
    }
    expect(start).toEqual(motion());
  });
  it("checks upper and lower body obstructions missed by a center ray", () => {
    for (const [minY, maxY] of [[0, 0.3], [3.1, 3.4]] as const) {
      expect(selectWall(motion(), true, SURFACES, [...TRAINING_SOLIDS, { ...obstacle, minY, maxY }])).toBeNull();
    }
  });
  it("retains free contact beside an obstacle and at the authored ceiling junction", () => {
    const free = { ...obstacle, minX: HERO_RADIUS + 0.01, maxX: 0.8 };
    const result = stepTraversal(motion(), newTraversal(), newSwing(), [], input(), [], [...TRAINING_SOLIDS, free]);
    expect(result.traversal.surfaceId).toBe("climb-wall");
    expect(result.motion.position.z).toBeCloseTo(-60.505);
    const ceiling = stepTraversal(motion(-6, 7.6), newTraversal(), newSwing(), [], input({ moveY: 1 }), [], TRAINING_SOLIDS);
    expect(ceiling.traversal.surfaceId).toBe("climb-ceiling");
  });
  it("retains the attached position when later movement meets an adjacent solid", () => {
    const block = { ...obstacle, minX: 0.55, maxX: 0.8 };
    let result = stepTraversal(motion(), newTraversal(), newSwing(), [], input(), [], [...TRAINING_SOLIDS, block]);
    for (let n = 0; n < 60; n++) {
      result = stepTraversal(result.motion, result.traversal, result.swing, [], input({ moveX: -1 }), [], [...TRAINING_SOLIDS, block]);
      expect(result.motion.position.x + HERO_RADIUS).toBeLessThanOrEqual(block.minX + 0.001);
    }
  });
});

const mapped = mapStandardGamepad({
  id: "DualSense synthetic regression", index: 0, connected: true, mapping: "standard",
  axes: [0.9, -0.9, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
});
const axes = [
  { label: "keyboard cardinal", moveX: 0, moveY: 1 },
  { label: "keyboard diagonal", moveX: 1, moveY: 1 },
  { label: "reverse diagonal", moveX: -1, moveY: -1 },
  { label: "controller diagonal", moveX: mapped.moveX, moveY: mapped.moveY },
  { label: "mixed keyboard/controller", moveX: 1, moveY: mapped.moveY },
  { label: "partial analog", moveX: 0.3, moveY: 0.4 },
  { label: "zero", moveX: 0, moveY: 0 },
];
for (const surface of ["wall", "ceiling"] as const) {
  describe(`F-WM003-QA-03 ${surface} combined input speed`, () => {
    it.each(axes)("bounds $label while preserving direction and analog scale", ({ moveX, moveY }) => {
      const speed = surface === "wall" ? LIMITS.climbSpeed : LIMITS.ceilingSpeed;
      for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
        const start = surface === "wall" ? motion(0, 3, -60.505) : motion(-6, 7.6, -55);
        let current = {
          motion: { ...start, grounded: false },
          traversal: { ...newTraversal(), surfaceId: `climb-${surface}`, phase: surface === "wall" ? "WALL_CLIMBING" : "CEILING_ATTACHED", cameraMode: surface } as TraversalState,
          swing: newSwing(), objects: newPullObjects(),
        };
        for (let n = 0; n < Math.round(0.25 / dt); n++)
          current = stepTraversal(current.motion, current.traversal, current.swing, current.objects, input({ moveX, moveY }), [], TRAINING_SOLIDS, SURFACES, dt);
        const elapsed = Math.round(0.25 / dt) * dt;
        const d = { x: current.motion.position.x - start.position.x, y: current.motion.position.y - start.position.y, z: current.motion.position.z - start.position.z };
        const axisLength = Math.hypot(moveX, moveY);
        expect(Math.hypot(d.x, d.y, d.z) / elapsed).toBeCloseTo(speed * Math.min(1, axisLength), 8);
        const divisor = Math.max(1, axisLength);
        expect(d.x / elapsed).toBeCloseTo(-moveX / divisor * speed, 8);
        expect((surface === "wall" ? d.y : -d.z) / elapsed).toBeCloseTo(moveY / divisor * speed, 8);
      }
    });
  });
}
