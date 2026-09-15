import { describe, it, expect } from "vitest";
import { newSwing, handOrigin, type SwingInput } from "../src/core/swing";
import {
  SURFACES,
  TRAINING_SOLIDS,
  TRAINING_ANCHOR,
  CLASSIFICATIONS,
  LIMITS,
  newTraversal,
  newPullObjects,
  newTrainingRoute,
  selectWall,
  selectPull,
  stepTraversal,
  clearTraversal,
  advanceTraining,
  validClimbSave,
  safeTraversal,
  restoreTraining,
  trainingCheckpoint,
  type TraversalPhase,
} from "../src/core/traversal";
import {
  HERO_PRESENTATION,
  bodyWebLines,
  swingLegPose,
  newLegPose,
} from "../src/core/presentation";
import { SaveStore } from "../src/core/save";
import { MemoryStorage, payload } from "./helpers";
import type { MotionState } from "../src/core/types";
import { driveTraining } from "./training-driver";
const m = (x = 0, y = 0, z = -60.5): MotionState => ({
  position: { x, y, z },
  velocity: { x: 0, y: 0, z: 0 },
  grounded: true,
  facingYaw: Math.PI,
});
const input = (
  more: Partial<SwingInput & { climbHeld: boolean; pullHeld: boolean }> = {},
) => ({
  moveX: 0,
  moveY: 0,
  run: false,
  jumpPressed: false,
  swingHeld: false,
  climbHeld: false,
  pullHeld: false,
  cameraForward: { x: 0, y: 0, z: -1 },
  aim: { origin: { x: 0, y: 2, z: -50 }, direction: { x: 0, y: 0, z: -1 } },
  ...more,
});
const tick = (
  motion = m(),
  state = newTraversal(),
  i = input(),
  objects = newPullObjects(),
  dt = 1 / 60,
) =>
  stepTraversal(
    motion,
    state,
    newSwing(),
    objects,
    i,
    [TRAINING_ANCHOR],
    TRAINING_SOLIDS,
    SURFACES,
    dt,
  );
describe("authored surface and object roles", () => {
  for (const role of [
    "ORDINARY_SOLID",
    "SWING_ANCHOR",
    "CLIMBABLE_WALL",
    "CLIMBABLE_CEILING",
    "CLIMB_TRANSITION",
    "PULLABLE_LIGHT",
    "PULLABLE_LIMITED",
    "TOO_HEAVY",
    "ROUTE_TRIGGER",
  ])
    it(`authors ${role} explicitly`, () =>
      expect(Object.values(CLASSIFICATIONS)).toContain(role));
  it("does not grant attachment to ordinary walls or ceilings", () => {
    for (const role of ["ORDINARY_SOLID", "CLIMBABLE_CEILING"] as const)
      expect(
        selectWall(m(), true, [{ ...SURFACES[0]!, role }], TRAINING_SOLIDS),
      ).toBeNull();
  });
});
describe("deliberate wall contact and local-plane movement", () => {
  it("requires a held deliberate action", () => {
    expect(selectWall(m(), false, SURFACES, TRAINING_SOLIDS)).toBeNull();
    expect(tick().traversal.surfaceId).toBeNull();
  });
  it.each([0.5, 0.7, 1.14])("accepts allowed wall distance %s", (z) =>
    expect(
      selectWall(m(0, 0, -61 + z), true, SURFACES, TRAINING_SOLIDS)?.id,
    ).toBe("climb-wall"),
  );
  it.each([0.1, 1.16, 2])("rejects invalid wall distance %s", (z) =>
    expect(
      selectWall(m(0, 0, -61 + z), true, SURFACES, TRAINING_SOLIDS),
    ).toBeNull(),
  );
  it.each([Math.PI, Math.PI - 0.5, Math.PI + 0.5])("accepts facing %s", (yaw) =>
    expect(
      selectWall({ ...m(), facingYaw: yaw }, true, SURFACES, TRAINING_SOLIDS),
    ).not.toBeNull(),
  );
  it.each([0, Math.PI / 2, Math.PI + 1.1])("rejects facing %s", (yaw) =>
    expect(
      selectWall({ ...m(), facingYaw: yaw }, true, SURFACES, TRAINING_SOLIDS),
    ).toBeNull(),
  );
  it("rejects intervening contact geometry", () =>
    expect(
      selectWall(m(0, 0, -60), true, SURFACES, [
        ...TRAINING_SOLIDS,
        {
          id: "block",
          minX: -1,
          maxX: 1,
          minY: 0,
          maxY: 4,
          minZ: -60.8,
          maxZ: -60.5,
        },
      ]),
    ).toBeNull());
  it("attaches without sliding and clears an existing swing", () => {
    const sw = {
      ...newSwing(),
      web: {
        anchorId: "training-ring",
        anchor: TRAINING_ANCHOR.position,
        length: 20,
        origin: "right-wrist" as const,
      },
    };
    let r = stepTraversal(
      m(),
      newTraversal(),
      sw,
      newPullObjects(),
      input({ climbHeld: true }),
      [TRAINING_ANCHOR],
      TRAINING_SOLIDS,
    );
    for (let n = 0; n < 120; n++)
      r = stepTraversal(
        r.motion,
        r.traversal,
        r.swing,
        r.objects,
        input({ climbHeld: true }),
        [TRAINING_ANCHOR],
        TRAINING_SOLIDS,
      );
    expect(r.traversal.phase).toBe("WALL_CLIMBING");
    expect(r.motion.position.y).toBe(0);
    expect(r.swing.web).toBeNull();
    expect(r.motion.velocity).toEqual({ x: 0, y: 0, z: 0 });
  });
  it.each([
    [0, 1, "y", 1],
    [0, -1, "y", -1],
    [1, 0, "x", -1],
    [-1, 0, "x", 1],
  ] as const)("moves on local wall plane %s %s", (x, y, axis, sign) => {
    let r = tick(m(0, 3), newTraversal(), input({ climbHeld: true }));
    const p = { ...r.motion.position };
    for (let n = 0; n < 30; n++)
      r = tick(
        r.motion,
        r.traversal,
        input({ climbHeld: true, moveX: x, moveY: y }),
      );
    expect((r.motion.position[axis] - p[axis]) * sign).toBeCloseTo(
      LIMITS.climbSpeed / 2,
      5,
    );
    expect(r.motion.position.z).toBeCloseTo(-60.505);
  });
  it("bounds edge movement and cannot enter adjacent solids", () => {
    let r = tick(m(9.4, 3), newTraversal(), input({ climbHeld: true }));
    for (let n = 0; n < 60; n++)
      r = tick(r.motion, r.traversal, input({ climbHeld: true, moveX: -1 }));
    expect(r.motion.position.x).toBeLessThan(9.52);
  });
  it.each(["release", "jump", "swing", "invalid"] as const)(
    "detaches for %s",
    (why) => {
      const a = tick(m(0, 3), newTraversal(), input({ climbHeld: true }));
      const r = stepTraversal(
        a.motion,
        a.traversal,
        a.swing,
        a.objects,
        input({
          climbHeld: why !== "release",
          jumpPressed: why === "jump",
          swingHeld: why === "swing",
        }),
        [TRAINING_ANCHOR],
        TRAINING_SOLIDS,
        why === "invalid" ? [] : SURFACES,
      );
      expect(r.traversal.surfaceId).toBeNull();
      expect(r.motion.grounded).toBe(false);
    },
  );
  it.each([1 / 30, 1 / 60, 1 / 120])(
    "retains stable distance/speed at dt=%s",
    (dt) => {
      let r = tick(
        m(0, 1),
        newTraversal(),
        input({ climbHeld: true }),
        newPullObjects(),
        dt,
      );
      for (let n = 0; n < 1 / dt; n++)
        r = tick(
          r.motion,
          r.traversal,
          input({ climbHeld: true, moveY: 1 }),
          r.objects,
          dt,
        );
      expect(r.motion.position.y).toBeCloseTo(4.4, 5);
      expect(r.motion.position.z).toBeCloseTo(-60.505);
    },
  );
});
describe("authored ceiling junction and cleanup", () => {
  function ceiling() {
    return tick(
      m(-6, 7.6),
      newTraversal(),
      input({ climbHeld: true, moveY: 1 }),
    );
  }
  it("uses only the explicit adjoining ceiling", () => {
    expect(ceiling().traversal).toMatchObject({
      surfaceId: "climb-ceiling",
      phase: "WALL_TO_CEILING_TRANSITION",
      cameraMode: "ceiling",
    });
    expect(
      tick(m(2, 7.6), newTraversal(), input({ climbHeld: true, moveY: 1 }))
        .traversal.surfaceId,
    ).toBe("climb-wall");
  });
  it("rejects a renamed or non-climbable ceiling junction", () => {
    for (const role of ["ORDINARY_SOLID", "CLIMBABLE_WALL"] as const) {
      const r = stepTraversal(
        m(-6, 7.6),
        newTraversal(),
        newSwing(),
        newPullObjects(),
        input({ climbHeld: true, moveY: 1 }),
        [],
        TRAINING_SOLIDS,
        [SURFACES[0]!, { ...SURFACES[1]!, role }],
      );
      expect(r.traversal.surfaceId).toBe("climb-wall");
    }
  });
  it("stops, reverses and moves in the ceiling plane without passing through", () => {
    let r = ceiling();
    for (let n = 0; n < 90; n++)
      r = tick(r.motion, r.traversal, input({ climbHeld: true, moveY: -1 }));
    const z = r.motion.position.z;
    expect(z).toBeGreaterThan(-57);
    expect(r.motion.position.y + 3.4).toBe(11);
    for (let n = 0; n < 30; n++)
      r = tick(r.motion, r.traversal, input({ climbHeld: true }));
    expect(r.motion.position.z).toBe(z);
    expect(r.traversal.phase).toBe("CEILING_ATTACHED");
    for (let n = 0; n < 30; n++)
      r = tick(r.motion, r.traversal, input({ climbHeld: true, moveY: 1 }));
    expect(r.motion.position.z).toBeLessThan(z);
  });
  it("leaving eligible ceiling clears orientation and attachment", () => {
    let r = ceiling();
    for (let n = 0; n < 250; n++)
      r = tick(r.motion, r.traversal, input({ climbHeld: true, moveY: -1 }));
    expect(r.traversal.surfaceId).toBeNull();
    expect(r.traversal.cameraMode).toBe("ground");
  });
  it("cannot pull while surface-attached", () => {
    const a = ceiling(),
      r = tick(
        a.motion,
        a.traversal,
        input({ climbHeld: true, pullHeld: true }),
      );
    expect(r.traversal.pullId).toBeNull();
    expect(r.traversal.message).toContain("ground");
  });
});
describe("targeted bounded object pulling", () => {
  const hero = m(-9, 0, -51),
    aim = { origin: { x: -9, y: 1, z: -51 }, direction: { x: 1, y: 0, z: 0 } };
  it("chooses light object and derives right wrist origin", () => {
    expect(
      selectPull(hero, aim, newPullObjects(), TRAINING_SOLIDS),
    ).toMatchObject({ object: { id: "route-step" }, reason: "Ready to pull" });
    const r = tick(hero, newTraversal(), input({ pullHeld: true, aim }));
    expect(r.traversal).toMatchObject({
      pullId: "route-step",
      phase: "PULL_WEB_FIRING",
      webOrigin: "right-wrist",
    });
    expect(handOrigin(hero)).not.toEqual(hero.position);
  });
  it.each([
    ["TOO_HEAVY", "Too heavy to pull"],
    ["ORDINARY_SOLID", "This object cannot be pulled"],
  ] as const)("rejects %s", (role, reason) => {
    const o = { ...newPullObjects()[0]!, role };
    expect(selectPull(hero, aim, [o], TRAINING_SOLIDS).reason).toBe(reason);
  });
  it("limits distance, aim cone, and shorter limited range", () => {
    expect(
      selectPull(
        { ...hero, position: { x: -25, y: 0, z: -51 } },
        { ...aim, origin: { x: -25, y: 1, z: -51 } },
        [newPullObjects()[0]!],
        [],
      ).reason,
    ).toBe("Target out of range");
    expect(
      selectPull(
        hero,
        { ...aim, direction: { x: -1, y: 0, z: 0 } },
        newPullObjects(),
        [],
      ).object,
    ).toBeNull();
    expect(
      selectPull(
        hero,
        aim,
        [{ ...newPullObjects()[0]!, role: "PULLABLE_LIMITED" }],
        [],
      ).reason,
    ).toBe("Target out of range");
  });
  it("rejects line-of-sight obstruction", () =>
    expect(
      selectPull(
        hero,
        aim,
        [newPullObjects()[0]!],
        [
          {
            id: "block",
            minX: -5,
            maxX: -4,
            minY: 0,
            maxY: 5,
            minZ: -53,
            maxZ: -49,
          },
        ],
      ).reason,
    ).toBe("Path blocked"));
  it("selects deterministic ties and does not hide a visible target behind an occluded one", () => {
    const a = newPullObjects()[0]!,
      b = { ...a, id: "aaa" };
    expect(selectPull(hero, aim, [a, b], []).object?.id).toBe("aaa");
    expect(selectPull(hero, aim, [b, a], []).object?.id).toBe("aaa");
  });
  it.each(["TOO_HEAVY", "ORDINARY_SOLID", "PULLABLE_LIMITED"] as const)(
    "eligible visible light target wins over a closer-aim %s",
    (role) => {
      const near = { ...newPullObjects()[0]!, id: "near", role },
        eligible = {
          ...newPullObjects()[0]!,
          id: "visible-light",
          position: { x: 0, y: 0.65, z: -49.8 },
        };
      expect(selectPull(hero, aim, [near, eligible], [])).toMatchObject({
        object: { id: "visible-light" },
        reason: "Ready to pull",
      });
    },
  );
  it("reports the LIMITED range failure accurately after attachment", () => {
    const o = {
        ...newPullObjects()[0]!,
        role: "PULLABLE_LIMITED" as const,
        position: { x: -4, y: 0.65, z: -51 },
      },
      r = tick(hero, newTraversal(), input({ pullHeld: true, aim }), [o]);
    const moved = { ...r.motion, position: { x: -12, y: 0, z: -51 } },
      next = tick(
        moved,
        r.traversal,
        input({ pullHeld: true, aim }),
        r.objects,
      );
    expect(next.traversal.pullId).toBeNull();
    expect(next.traversal.message).toBe("Target out of range");
    expect(next.objects[0]!.speed).toBe(0);
  });
  it("collision wins and repeated pull cycles never accumulate velocity", () => {
    const initial = newPullObjects()[0]!,
      block = {
        id: "barrier",
        minX: -4,
        maxX: -3.7,
        minY: 0,
        maxY: 0.4,
        minZ: -53,
        maxZ: -49,
      };
    let r = tick(hero, newTraversal(), input({ pullHeld: true, aim }), [
      initial,
    ]);
    for (let n = 0; n < 180; n++)
      r = stepTraversal(
        r.motion,
        r.traversal,
        r.swing,
        r.objects,
        input({ pullHeld: true, aim }),
        [],
        [...TRAINING_SOLIDS, block],
      );
    expect(r.objects[0]!.position.x).toBeGreaterThanOrEqual(-2.71);
    expect(r.traversal.message).toBe("Path blocked");
    for (let n = 0; n < 40; n++) {
      r = tick(r.motion, r.traversal, input({ aim }), r.objects);
      r = tick(
        r.motion,
        r.traversal,
        input({ aim, pullHeld: true }),
        r.objects,
      );
      expect(r.objects[0]!.speed).toBeLessThanOrEqual(LIMITS.lightSpeed);
    }
  });
  it("moves light crate with bounded speed and safe separation, then clears on release", () => {
    let r = tick(hero, newTraversal(), input({ pullHeld: true, aim }));
    for (let n = 0; n < 250; n++) {
      r = tick(
        r.motion,
        r.traversal,
        input({ pullHeld: true, aim }),
        r.objects,
      );
      expect(r.objects[0]!.speed).toBeLessThanOrEqual(LIMITS.lightSpeed);
    }
    expect(r.objects[0]!.position.x).toBeLessThan(-6);
    expect(
      Math.abs(r.objects[0]!.position.x - r.motion.position.x),
    ).toBeGreaterThanOrEqual(2.8 - 0.001);
    const released = tick(r.motion, r.traversal, input({ aim }), r.objects);
    expect(released.traversal.pullId).toBeNull();
    expect(released.objects.every((o) => o.speed === 0)).toBe(true);
  });
  it("does not move too-heavy or ordinary objects after failed input", () => {
    for (const role of ["TOO_HEAVY", "ORDINARY_SOLID"] as const) {
      const o = { ...newPullObjects()[0]!, role };
      const r = tick(hero, newTraversal(), input({ pullHeld: true, aim }), [o]);
      expect(r.objects[0]!.position).toEqual(o.position);
      expect(r.traversal.pullId).toBeNull();
    }
  });
  it("limited object moves slowly inside shorter range", () => {
    const o = {
        ...newPullObjects()[0]!,
        role: "PULLABLE_LIMITED" as const,
        position: { x: -4, y: 0.65, z: -51 },
      },
      r = tick(hero, newTraversal(), input({ pullHeld: true, aim }), [o]);
    let x = r;
    for (let n = 0; n < 60; n++)
      x = tick(
        x.motion,
        x.traversal,
        input({ pullHeld: true, aim }),
        x.objects,
      );
    expect(x.objects[0]!.speed).toBeLessThanOrEqual(LIMITS.limitedSpeed);
    expect(x.objects[0]!.position.x).toBeLessThan(-4);
  });
  it("keeps visible selection on the active web and restores idle aim after release", () => {
    const other = {
        ...newPullObjects()[0]!,
        id: "other-light",
        position: { x: -7, y: 0.65, z: -46 },
      },
      a = tick(hero, newTraversal(), input({ pullHeld: true, aim }), [
        newPullObjects()[0]!,
        other,
      ]),
      rotated = { origin: aim.origin, direction: { x: 0, y: 0, z: 1 } },
      b = tick(
        a.motion,
        a.traversal,
        input({ pullHeld: true, aim: rotated }),
        a.objects,
      );
    expect(b.traversal.pullId).toBe("route-step");
    expect(b.traversal.targetId).toBe("route-step");
    const released = tick(
      b.motion,
      b.traversal,
      input({ aim: rotated }),
      b.objects,
    );
    expect(released.traversal.pullId).toBeNull();
    expect(released.traversal.targetId).toBe("other-light");
  });
  it("pause freezes every constraint and object", () => {
    const r = tick(hero, newTraversal(), input({ pullHeld: true, aim }));
    const next = tick(
      r.motion,
      r.traversal,
      input({ pullHeld: true, aim, paused: true }),
      r.objects,
    );
    expect(next.traversal).toEqual(r.traversal);
    expect(next.motion).toEqual(r.motion);
    expect(next.objects).toEqual(r.objects);
  });
  it("one pull remains stable even when aim changes; swing interrupts", () => {
    const r = tick(hero, newTraversal(), input({ pullHeld: true, aim }));
    const stable = tick(
      r.motion,
      r.traversal,
      input({
        pullHeld: true,
        aim: { ...aim, direction: { x: 0, y: 0, z: 1 } },
      }),
      r.objects,
    );
    expect(stable.traversal.pullId).toBe("route-step");
    const interrupt = tick(
      stable.motion,
      stable.traversal,
      input({ swingHeld: true, pullHeld: true, aim }),
      stable.objects,
    );
    expect(interrupt.traversal.pullId).toBeNull();
  });
});
describe("save-safe phases and earned route state", () => {
  it.each([
    { schedule: [1 / 30] },
    { schedule: [1 / 60] },
    { schedule: [1 / 120, 1 / 60, 1 / 30] },
  ])("completes genuine semantic route under %j timing", ({ schedule }) => {
    const r = driveTraining(schedule);
    expect(r.route).toMatchObject({
      stage: 6,
      completed: true,
      completions: 1,
      valid: true,
      stepped: true,
    });
    expect(r.route.vertical).toBeGreaterThanOrEqual(4);
    expect(r.route.lateral).toBeGreaterThanOrEqual(3);
    expect(r.route.ceilingDistance).toBeGreaterThanOrEqual(6);
    expect(r.route.pulledDistance).toBeGreaterThanOrEqual(5);
    expect(r.history.some((h) => h.phase === "SWING_ATTACHED")).toBe(true);
  });
  it("rejects finish checkpoint without completion; earlier completed replay cannot skip current stages", () => {
    expect(
      validClimbSave({ version: 1, checkpoint: 6, completed: false }),
    ).toBe(false);
    for (const checkpoint of [0, 1, 4] as const) {
      const replay = restoreTraining({
        version: 1,
        checkpoint,
        completed: true,
      });
      expect(replay.stage).toBe(checkpoint);
      expect(replay.completions).toBe(0);
      expect(trainingCheckpoint(checkpoint).y).toBe(0);
    }
  });
  const unsafe: TraversalPhase[] = [
    "WALL_ATTACHING",
    "WALL_CLIMBING",
    "WALL_TO_CEILING_TRANSITION",
    "CEILING_ATTACHED",
    "CEILING_MOVING",
    "SURFACE_DETACHING",
    "AIRBORNE_FREE",
    "PULL_WEB_FIRING",
    "PULL_ATTACHED",
    "PULLING",
    "PULL_RELEASING",
    "SWING_ATTACHED",
    "LANDING",
    "FALL_RECOVERY",
  ];
  it.each(unsafe)("cannot save during %s", (phase) =>
    expect(safeTraversal(m(), { ...newTraversal(), phase })).toBe(false),
  );
  it("allows only stable ground with no live target constraint", () => {
    expect(safeTraversal(m(), newTraversal())).toBe(true);
    expect(safeTraversal({ ...m(), grounded: false }, newTraversal())).toBe(
      false,
    );
    expect(
      safeTraversal(m(), { ...newTraversal(), pullId: "route-step" }),
    ).toBe(false);
  });
  it.each([0, 1, 4, 6] as const)(
    "restores checkpoint %s with no transient stage",
    (checkpoint) => {
      const save = {
        version: 1 as const,
        checkpoint,
        completed: checkpoint === 6,
      };
      expect(validClimbSave(save)).toBe(true);
      const r = restoreTraining(save);
      expect(r.stage).toBe(checkpoint);
      expect(r.wallStart).toBeNull();
      expect(r.ceilingStart).toBeNull();
      expect(r.stepped).toBe(false);
      expect(trainingCheckpoint(checkpoint).y).toBe(checkpoint === 6 ? 2.6 : 0);
    },
  );
  it.each([2, 3, 5, -1, 7])(
    "rejects unearned transient checkpoint %s",
    (checkpoint) =>
      expect(validClimbSave({ version: 1, checkpoint, completed: false })).toBe(
        false,
      ),
  );
  it("retains old WM001/WM002 saves and manual/checkpoint separation", () => {
    const store = new SaveStore(new MemoryStorage()),
      old = payload();
    expect(store.write(1, "manual", old).ok).toBe(true);
    expect(store.read(1, "manual").payload).toEqual(old);
    const wm2 = {
      ...old,
      skyline: { version: 1 as const, checkpoint: 4 as const, completed: true },
    };
    expect(store.write(1, "checkpoint", wm2).ok).toBe(true);
    expect(store.read(1, "checkpoint").payload).toEqual(wm2);
    expect(store.read(1, "manual").payload).toEqual(old);
    const next = {
      ...wm2,
      climb: { version: 1 as const, checkpoint: 4 as const, completed: false },
    };
    expect(store.write(1, "checkpoint", next).ok).toBe(true);
    expect(store.read(1, "checkpoint").payload?.climb).toEqual(next.climb);
    expect(store.read(1, "manual").payload).toEqual(old);
  });
  it("fall/reload/fixture cannot award completion without stages", () => {
    for (const stage of [0, 1, 2, 3, 4, 5]) {
      const r = { ...newTrainingRoute(), active: true, stage };
      const finish = m(-11, 2.6, -51);
      expect(
        advanceTraining(
          r,
          finish,
          finish,
          newSwing(),
          newSwing(),
          newTraversal(),
          newPullObjects(),
        ).completed,
      ).toBe(false);
    }
    const r = advanceTraining(
      newTrainingRoute(),
      m(),
      m(-11, 2.6, -51),
      newSwing(),
      newSwing(),
      newTraversal(),
      newPullObjects(),
    );
    expect(r.valid).toBe(false);
  });
  it("cleanup gates held actions until release", () => {
    const s = clearTraversal({
      ...newTraversal(),
      surfaceId: "climb-wall",
      pullId: "route-step",
    });
    expect(s).toMatchObject({
      surfaceId: null,
      pullId: null,
      freshClimb: true,
      freshPull: true,
      cameraMode: "ground",
    });
    expect(
      tick(m(), s, input({ climbHeld: true })).traversal.surfaceId,
    ).toBeNull();
  });
});
describe("original visual configuration and physics separation", () => {
  it("raises outward eyes and uses original red/blue palette", () => {
    expect(HERO_PRESENTATION.eyeY).toBeGreaterThan(2.98);
    expect(HERO_PRESENTATION.eyeAngle).toBeCloseTo(Math.PI / 4);
    expect(HERO_PRESENTATION.red).toBe("#df4052");
    expect(HERO_PRESENTATION.blue).toBe("#2456bd");
  });
  it.each([
    [1.75, 0.45],
    [0.7, 0.43],
    [1.65, 0.19],
    [1.62, 0.24],
  ])("generates body-following ring/meridian lines for region %s", (h, r) => {
    const lines = bodyWebLines(h, () => r);
    expect(lines.length).toBe(11);
    expect(new Set(lines.map((l) => JSON.stringify(l))).size).toBe(11);
    expect(
      lines.flat().every((p) => [p.x, p.y, p.z].every(Number.isFinite)),
    ).toBe(true);
    expect(
      Math.max(...lines.flat().map((p) => Math.hypot(p.x, p.z))),
    ).toBeCloseTo(r + 0.01);
  });
  it("leg direction responds to actual swing phase, blends and never mutates physics", () => {
    const motion = m(0, 6, -20),
      copy = structuredClone(motion),
      sw = {
        ...newSwing(),
        web: {
          anchorId: "x",
          anchor: { x: 0, y: 15, z: -25 },
          length: 15,
          origin: "right-wrist" as const,
        },
      };
    const forward = swingLegPose(
        newLegPose(),
        { ...motion, velocity: { x: 0, y: 0, z: -12 } },
        sw,
        0.1,
      ),
      back = swingLegPose(
        newLegPose(),
        { ...motion, velocity: { x: 0, y: 0, z: 12 } },
        sw,
        0.1,
      );
    expect(forward.angle).toBeLessThan(back.angle);
    let rest = forward;
    for (let i = 0; i < 120; i++)
      rest = swingLegPose(rest, motion, newSwing(), 1 / 60);
    expect(Math.abs(rest.angle)).toBeLessThan(0.001);
    expect(rest.blend).toBeLessThan(0.001);
    expect(motion).toEqual(copy);
    expect([
      HERO_PRESENTATION.capsuleRadius,
      HERO_PRESENTATION.capsuleHeight,
    ]).toEqual([0.48, 3.4]);
  });
});
