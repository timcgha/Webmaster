import type { MotionState } from "../src/core/types";
import { newSwing } from "../src/core/swing";
import { ROOFS } from "../src/core/skyline";
import {
  newTraversal,
  newPullObjects,
  newTrainingRoute,
  stepTraversal,
  advanceTraining,
  TRAINING_ANCHOR,
  TRAINING_SOLIDS,
  SURFACES,
  type TraversalInput,
} from "../src/core/traversal";

/** Physical fixed-step driver: only semantic input, camera aim and ordinary start; never places later stages. */
export function driveTraining(schedule: readonly number[] = [1 / 60]) {
  let motion: MotionState = {
    position: { x: 0, y: 0, z: -8 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: true,
    facingYaw: Math.PI,
  };
  let traversal = newTraversal(),
    objects = newPullObjects(),
    swing = newSwing(),
    route = newTrainingRoute(),
    alpha = Math.PI / 2,
    beta = 1.65,
    n = 0,
    accumulator = 0,
    pendingJump = false;
  const history: { phase: string; stage: number }[] = [];
  function frame(i: Partial<TraversalInput> = {}) {
    const elapsed = schedule[n++ % schedule.length]!;
    accumulator += elapsed;
    pendingJump ||= Boolean(i.jumpPressed);
    while (accumulator >= 1 / 60) {
      const dt = 1 / 60;
      accumulator -= dt;
      const target = {
          x: motion.position.x,
          y: motion.position.y + (route.active ? 3.4 : 1.55),
          z: motion.position.z,
        },
        offset = {
          x: 10.5 * Math.cos(alpha) * Math.sin(beta),
          y: 10.5 * Math.cos(beta),
          z: 10.5 * Math.sin(alpha) * Math.sin(beta),
        };
      const input: TraversalInput = {
        moveX: 0,
        moveY: 0,
        run: false,
        swingHeld: false,
        climbHeld: false,
        pullHeld: false,
        cameraForward: { x: -Math.cos(alpha), y: 0, z: -Math.sin(alpha) },
        aim: {
          origin: {
            x: target.x + offset.x,
            y: target.y + offset.y,
            z: target.z + offset.z,
          },
          direction: { x: -offset.x, y: -offset.y, z: -offset.z },
        },
        ...i,
        jumpPressed: pendingJump,
      };
      pendingJump = false;
      const before = motion,
        old = swing,
        result = stepTraversal(
          motion,
          traversal,
          swing,
          objects,
          input,
          [TRAINING_ANCHOR],
          [ROOFS[0]!, ...TRAINING_SOLIDS],
          SURFACES,
          dt,
        );
      motion = result.motion;
      traversal = result.traversal;
      swing = result.swing;
      objects = result.objects;
      route = advanceTraining(
        route,
        before,
        motion,
        old,
        swing,
        traversal,
        objects,
      );
      if (
        history.at(-1)?.phase !== traversal.phase ||
        history.at(-1)?.stage !== route.stage
      )
        history.push({ phase: traversal.phase, stage: route.stage });
    }
  }
  function until(
    check: () => boolean,
    input: Partial<TraversalInput>,
    label: string,
  ) {
    for (let x = 0; x < 3000; x++) {
      if (check()) return;
      frame(input);
    }
    throw new Error(
      `${label}: ${JSON.stringify({ motion, route, traversal })}`,
    );
  }
  function hold(seconds: number, input: Partial<TraversalInput> = {}) {
    let time = 0;
    while (time < seconds) {
      time += schedule[n % schedule.length]!;
      frame(input);
    }
  }
  until(() => motion.position.z < -21, { moveY: 1, run: true }, "entry");
  frame({ moveY: 1, run: true, swingHeld: true, jumpPressed: true });
  until(
    () => motion.position.z < -36,
    { moveY: 1, run: true, swingHeld: true },
    "swing",
  );
  until(() => route.stage === 1, { moveY: 1, run: true }, "landing");
  hold(0.35);
  beta = 1.08;
  until(() => motion.position.x < -2.7, { moveX: 1 }, "go around crate");
  hold(0.25);
  until(() => motion.position.z < -57.5, { moveY: 1 }, "wall approach");
  hold(0.25);
  until(() => motion.position.x > -0.1, { moveX: -1 }, "start stripe");
  hold(0.25);
  until(() => motion.position.z < -60.1, { moveY: 1 }, "wall contact");
  hold(0.3);
  until(
    () => traversal.surfaceId === "climb-wall",
    { climbHeld: true },
    "attach",
  );
  until(() => motion.position.y > 6, { climbHeld: true, moveY: 1 }, "up");
  until(() => motion.position.x < -6, { climbHeld: true, moveX: 1 }, "lateral");
  until(
    () => traversal.surfaceId === "climb-ceiling",
    { climbHeld: true, moveY: 1 },
    "junction",
  );
  until(
    () => motion.position.z > -50.5,
    { climbHeld: true, moveY: -1 },
    "ceiling",
  );
  until(() => route.stage === 4, {}, "drop");
  hold(0.75);
  until(() => motion.position.z < -50.9, { moveY: 1 }, "pull line");
  until(() => motion.position.x < -9.15, { moveX: 1 }, "gold mark");
  hold(0.35);
  alpha = Math.PI;
  beta = 1.45;
  until(() => route.stage === 5, { pullHeld: true }, "pull");
  hold(0.35);
  hold(0.17, { moveY: 1 });
  frame({ moveY: 1, jumpPressed: true });
  until(() => motion.position.x > -7.5, { moveY: 1 }, "step jump");
  until(() => motion.grounded && motion.position.y > 1, {}, "step landing");
  alpha = 0;
  beta = 1.1;
  hold(0.55);
  hold(0.19, { moveY: 1 });
  frame({ moveY: 1, jumpPressed: true });
  until(() => route.stage === 6, { moveY: 1 }, "finish");
  hold(0.35);
  return { motion, traversal, swing, objects, route, history, frames: n };
}
