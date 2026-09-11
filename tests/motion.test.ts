import { describe, expect, it } from "vitest";
import { FIXED_STEP, runFixedFrames, stepMotion } from "../src/core/motion";
import type { MotionEnvironment, MotionState } from "../src/core/types";

const openFloor: MotionEnvironment = {
  floorHeightAt: () => 0,
  blocks: () => false,
};

const initial = (): MotionState => ({
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  grounded: true,
  facingYaw: 0,
});

const input = { moveX: 0, moveY: 1, run: false, cameraForward: { x: 0, y: 0, z: 1 } };

describe("fixed-step hero motion", () => {
  it("is consistent across 60 Hz and 30 Hz frame timing", () => {
    const at60 = runFixedFrames(initial(), input, openFloor, Array.from({ length: 120 }, () => 1 / 60));
    const at30 = runFixedFrames(initial(), input, openFloor, Array.from({ length: 60 }, () => 1 / 30));
    expect(at60.position.z).toBeCloseTo(at30.position.z, 5);
    expect(at60.position.y).toBe(0);
    expect(at30.grounded).toBe(true);
  });

  it("runs faster without changing control direction", () => {
    const walking = runFixedFrames(initial(), input, openFloor, Array.from({ length: 60 }, () => 1 / 60));
    const running = runFixedFrames(initial(), { ...input, run: true }, openFloor, Array.from({ length: 60 }, () => 1 / 60));
    expect(running.position.z).toBeGreaterThan(walking.position.z * 1.35);
  });

  it("jumps once, lands reliably, and does not accumulate downward velocity on floor", () => {
    let state = stepMotion(initial(), { ...input, moveY: 0, jumpPressed: true }, openFloor, FIXED_STEP);
    expect(state.position.y).toBeGreaterThan(0);
    expect(state.grounded).toBe(false);
    for (let index = 0; index < 120; index += 1) {
      state = stepMotion(state, { ...input, moveY: 0, jumpPressed: false }, openFloor, FIXED_STEP);
    }
    expect(state).toMatchObject({ position: { y: 0 }, velocity: { y: 0 }, grounded: true });
  });

  it("does not enter solid geometry", () => {
    const wall: MotionEnvironment = {
      floorHeightAt: () => 0,
      blocks: (_x, z) => z >= 1,
    };
    const state = runFixedFrames(initial(), input, wall, Array.from({ length: 60 }, () => 1 / 60));
    expect(state.position.z).toBeLessThan(1);
    expect(state.velocity.z).toBe(0);
  });

  it("caps long frame deltas instead of spiralling the simulation", () => {
    const state = runFixedFrames(initial(), input, openFloor, [2]);
    expect(state.position.z).toBeLessThan(0.2);
  });
});
