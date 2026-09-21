import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  newSwing,
  stepSwing,
  selectAnchor,
  segmentBlocked,
  handOrigin,
  clearSwing,
  safeToSave,
  distance,
  MAX_SWING_SPEED,
  type Anchor,
  type SwingInput,
  type Solid,
} from "../src/core/swing";
import {
  newSkyline,
  advanceSkyline,
  validSkylineSave,
  restoreSkylinePosition,
  ROOFS,
  ANCHORS,
} from "../src/core/skyline";
import type { MotionState } from "../src/core/types";
import { completeRoute } from "./route-driver";
const motion = (p = { x: 0, y: 0, z: 0 }): MotionState => ({
  position: { ...p },
  velocity: { x: 0, y: 0, z: 0 },
  grounded: false,
  facingYaw: 0,
});
const anchor: Anchor = {
  id: "ring",
  position: { x: 0, y: 15, z: 10 },
  eligible: true,
  visible: true,
};
const input: SwingInput = {
  moveX: 0,
  moveY: 0,
  run: false,
  jumpPressed: false,
  swingHeld: false,
  cameraForward: { x: 0, y: 0, z: 1 },
  aim: { origin: { x: 0, y: 4, z: -9 }, direction: { x: 0, y: 0, z: 1 } },
};
const wall: Solid = {
  id: "wall",
  minX: -10,
  maxX: 10,
  minY: -10,
  maxY: 30,
  minZ: 4,
  maxZ: 4.25,
};
describe("WM-002 explicit anchors and one hand-origin web", () => {
  it("selects only authored visible eligible anchors within range and aim cone", () => {
    const m = motion();
    expect(selectAnchor(m, input.aim, [anchor], [])).toEqual(anchor);
    for (const a of [
      { ...anchor, eligible: false },
      { ...anchor, visible: false },
      { ...anchor, position: { x: 0, y: 0, z: 80 } },
      { ...anchor, position: { x: 0, y: 0, z: -25 } },
    ])
      expect(selectAnchor(m, input.aim, [a], [])).toBeNull();
    expect(selectAnchor(m, input.aim, [], [])).toBeNull();
  });
  it("rejects obstruction and chooses best visible aim with deterministic ID ties", () => {
    expect(segmentBlocked(handOrigin(motion()), anchor.position, [wall])).toBe(
      true,
    );
    expect(selectAnchor(motion(), input.aim, [anchor], [wall])).toBeNull();
    const a = { ...anchor, id: "a" },
      b = { ...anchor, id: "b" },
      side = { ...anchor, id: "side", position: { x: 10, y: 15, z: 10 } };
    expect(selectAnchor(motion(), input.aim, [side, b, a], [])?.id).toBe("a");
    expect(selectAnchor(motion(), input.aim, [a, b, side], [])?.id).toBe("a");
  });
  it("fires from the right wrist, remains attached to a stable copied anchor, and holds one web", () => {
    let m = motion(),
      s = newSwing();
    const r = stepSwing(m, s, { ...input, swingHeld: true }, [anchor], []);
    m = r.motion;
    s = r.swing;
    expect(s.phase).toBe("WEB_FIRING");
    expect(s.web?.origin).toBe("right-wrist");
    expect(handOrigin(m)).toEqual({
      x: m.position.x + 0.56,
      y: m.position.y + 2.03,
      z: m.position.z + 0.71,
    });
    const changed = { ...anchor, position: { x: 8, y: 18, z: 12 } };
    for (let i = 0; i < 15; i++) {
      const r = stepSwing(m, s, { ...input, swingHeld: true }, [changed], []);
      m = r.motion;
      s = r.swing;
    }
    expect(s.phase).toBe("SWING_ATTACHED");
    expect(s.attachments).toBe(1);
    expect(s.web?.anchor).toEqual(anchor.position);
  });
  it("releases with exact current momentum before the next physics interval and can reattach", () => {
    const r = stepSwing(
      { ...motion(), velocity: { x: 3, y: 4, z: 8 } },
      newSwing(),
      { ...input, swingHeld: true },
      [anchor],
      [],
    );
    const release = stepSwing(r.motion, r.swing, input, [anchor], [], 0);
    expect(release.motion.velocity).toEqual(r.motion.velocity);
    expect(release.swing.web).toBeNull();
    expect(release.swing.phase).toBe("SWING_RELEASING");
    const re = stepSwing(
      release.motion,
      release.swing,
      { ...input, swingHeld: true },
      [anchor],
      [],
      0,
    );
    expect(re.swing.web?.anchorId).toBe("ring");
    expect(re.swing.attachments).toBe(2);
  });
});
describe("WM-002 constrained gravity, collision and lifecycle", () => {
  it("keeps gravity active, bounds steering and maximum rope distance", () => {
    let m = { ...motion(), velocity: { x: 0, y: 0, z: 8 } },
      s = newSwing();
    let maxError = 0;
    // Nearby airborne catch: short horizontal span stays gravity-led (no mid-gap yank).
    const near = { ...anchor, position: { x: 0, y: 8, z: 4 } };
    const first = stepSwing(m, s, { ...input, swingHeld: true }, [near], []);
    expect(first.motion.velocity.y).toBeLessThan(0);
    expect(first.motion.position.y).toBeLessThan(0);
    m = first.motion;
    s = first.swing;
    for (let i = 0; i < 5000; i++) {
      const r = stepSwing(
        m,
        s,
        { ...input, moveX: Math.sin(i / 80), moveY: 1, swingHeld: true },
        [near],
        [],
      );
      m = r.motion;
      s = r.swing;
      if (s.web)
        maxError = Math.max(
          maxError,
          distance(handOrigin(m), s.web.anchor) - s.web.length,
        );
      expect(
        Math.hypot(m.velocity.x, m.velocity.y, m.velocity.z),
      ).toBeLessThanOrEqual(MAX_SWING_SPEED + 0.001);
    }
    expect(maxError).toBeLessThan(0.021);
    expect(s.attachments).toBe(1);
    expect(JSON.stringify(s).length).toBeLessThan(700);
  });
  it("blocks a thin major wall even at the maximum high-speed interval and handles landing", () => {
    const m = {
      ...motion({ x: 0, y: 0, z: 3 }),
      velocity: { x: 0, y: 0, z: 26 },
    };
    const r = stepSwing(m, newSwing(), input, [], [wall], 0.1);
    expect(r.motion.position.z).toBeLessThan(3.53);
    expect(r.motion.velocity.z).toBe(0);
    const land = stepSwing(
      { ...motion({ x: 0, y: 0.1, z: 0 }), velocity: { x: 0, y: -20, z: 0 } },
      newSwing(),
      input,
      [],
      [ROOFS[0]!],
    );
    expect(land.landed).toBe(true);
    expect(land.motion.position.y).toBe(0);
    expect(land.swing.phase).toBe("LANDING");
  });
  it("clears a rope whose segment becomes obstructed instead of pulling through geometry", () => {
    const r = stepSwing(
      motion(),
      newSwing(),
      { ...input, swingHeld: true },
      [anchor],
      [],
    );
    const b = stepSwing(
      r.motion,
      r.swing,
      { ...input, swingHeld: true },
      [anchor],
      [wall],
    );
    expect(b.swing.web).toBeNull();
    expect(b.swing.freshRequired).toBe(true);
  });
  it("freezes pause and gates fresh input after focus, disconnect or recovery cleanup", () => {
    const r = stepSwing(
      motion(),
      newSwing(),
      { ...input, swingHeld: true },
      [anchor],
      [],
    );
    const pause = stepSwing(
      r.motion,
      r.swing,
      { ...input, swingHeld: true, moveY: 1, paused: true },
      [anchor],
      [],
      1,
    );
    expect(pause.motion).toEqual(r.motion);
    expect(pause.swing).toEqual(r.swing);
    for (const phase of ["GROUNDED_OR_FREE", "FALL_RECOVERY"] as const) {
      const cleared = clearSwing(r.swing, phase);
      expect(cleared.web).toBeNull();
      const held = stepSwing(
        r.motion,
        cleared,
        { ...input, swingHeld: true },
        [anchor],
        [],
      );
      expect(held.swing.web).toBeNull();
      const neutral = stepSwing(held.motion, held.swing, input, [anchor], []);
      const fresh = stepSwing(
        neutral.motion,
        neutral.swing,
        { ...input, swingHeld: true },
        [anchor],
        [],
      );
      expect(fresh.swing.web).not.toBeNull();
    }
  });
  it("permits saves only in settled grounded states and validates additive WM-001 compatible progress", () => {
    const m = { ...motion(), grounded: true };
    expect(safeToSave(m, newSwing())).toBe(true);
    expect(safeToSave({ ...m, grounded: false }, newSwing())).toBe(false);
    expect(safeToSave(m, newSwing(), true)).toBe(false);
    for (const phase of [
      "WEB_FIRING",
      "SWING_ATTACHED",
      "SWING_RELEASING",
      "AIRBORNE_FREE",
      "LANDING",
      "FALL_RECOVERY",
    ] as const) {
      expect(
        safeToSave(
          { ...m, grounded: phase !== "AIRBORNE_FREE" },
          { ...newSwing(), phase },
        ),
      ).toBe(false);
    }
    expect(
      validSkylineSave({ version: 1, checkpoint: 2, completed: false }),
    ).toBe(true);
    for (const v of [
      { version: 99, checkpoint: 2, completed: false },
      { version: 1, checkpoint: 4, completed: false },
      { version: 1, checkpoint: 1.2, completed: false },
      { version: 1, checkpoint: 8, completed: true },
    ])
      expect(validSkylineSave(v)).toBe(false);
  });
});
describe("WM-002 continuous authored route and negative completion", () => {
  it("crosses four gaps at 30, 60, 120 and uneven rendered-frame timings with bounded rope and consistent release", () => {
    const profiles = {
      fps30: [1 / 30],
      fps60: [1 / 60],
      fps120: [1 / 120],
      uneven: [1 / 144, 1 / 32, 1 / 48, 1 / 90],
    };
    const results = Object.entries(profiles).map(([name, profile]) => ({
      name,
      ...completeRoute(profile),
    }));
    for (const r of results) {
      expect(r.route.stage, r.name).toBe(4);
      expect(r.route.completed).toBe(true);
      expect(r.route.completions).toBe(1);
      expect(r.maxRopeError).toBeLessThan(0.021);
      expect(r.maxSpeed).toBeLessThanOrEqual(26.001);
      expect(r.swing.attachments).toBe(5);
      expect(r.events.some((e) => e.reattach)).toBe(true);
    }
    const firstSpeeds = results.map((r) => {
      const v = r.events.find((e) => e.released).velocity;
      return Math.hypot(v.x, v.y, v.z);
    });
    expect(Math.max(...firstSpeeds) - Math.min(...firstSpeeds)).toBeLessThan(
      1.5,
    );
    const output=process.env.WM_TEST_EVIDENCE_ROOT ?? "test-results/unit";
    mkdirSync(output, { recursive: true });
    writeFileSync(
      `${output}/timing-profiles.json`,
      JSON.stringify(
        {
          method:
            "Identical fixed 60 Hz physics; render frames sample the same threshold-based ordinary input route. No fixture placement or state completion writes.",
          results,
        },
        null,
        2,
      ),
    );
  });
  it("cannot complete the long gap without the required mid-air reattachment", () => {
    const r = completeRoute([1 / 60], true);
    expect(r.route.stage).toBe(2);
    expect(r.route.completed).toBe(false);
    expect(r.motion.position.y).toBeLessThan(-10);
  });
  it("rejects finish placement, falling through finish and duplicate finish awards", () => {
    const r = newSkyline();
    const finish = { ...motion({ x: 33, y: 1, z: 166 }), grounded: true };
    expect(
      advanceSkyline(r, motion(), finish, newSwing(), newSwing()).route
        .completed,
    ).toBe(false);
    const falling = advanceSkyline(
      { ...r, active: true, stage: 3 },
      motion({ x: 33, y: 2, z: 166 }),
      finish,
      newSwing(),
      newSwing(),
    );
    expect(falling.route.stage).toBe(3);
    let complete = completeRoute().route;
    for (let i = 0; i < 60; i++)
      complete = advanceSkyline(
        complete,
        finish,
        finish,
        newSwing(),
        newSwing(),
      ).route;
    expect(complete.completions).toBe(1);
  });
  it("uses differing anchor heights, a right-angle final leg and four physically separated roofs", () => {
    expect(
      new Set(ANCHORS.map((a) => a.position.y)).size,
    ).toBeGreaterThanOrEqual(3);
    expect(ROOFS[1]!.minZ - ROOFS[0]!.maxZ).toBeGreaterThan(10);
    expect(ROOFS[2]!.minZ - ROOFS[1]!.maxZ).toBeGreaterThan(15);
    expect(ROOFS[3]!.minZ - ROOFS[2]!.maxZ).toBeGreaterThan(40);
    expect(ROOFS[4]!.minX - ROOFS[3]!.maxX).toBeGreaterThan(15);
  });
});

it("restores an earned grounded manual position and rejects airborne or wrong-roof placement", () => {
  expect(restoreSkylinePosition({ x: 1, y: 2, z: 91 }, 2)).toEqual({
    x: 1,
    y: 2,
    z: 91,
  });
  expect(restoreSkylinePosition({ x: 33, y: 1, z: 166 }, 2)).toEqual({
    x: 0,
    y: 2,
    z: 88,
  });
  expect(restoreSkylinePosition({ x: 0, y: 12, z: 88 }, 2)).toEqual({
    x: 0,
    y: 2,
    z: 88,
  });
});

