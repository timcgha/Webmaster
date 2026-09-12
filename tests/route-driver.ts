import {
  stepSwing,
  newSwing,
  distance,
  handOrigin,
  type Aim,
} from "../src/core/swing";
import {
  ANCHORS,
  ROOFS,
  FALLBACK,
  advanceSkyline,
  newSkyline,
} from "../src/core/skyline";
import type { MotionState } from "../src/core/types";
export function completeRoute(
  profile: number[] = [1 / 60],
  skipReattach = false,
) {
  let m: MotionState = {
      position: { x: 0, y: 0, z: -8 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      facingYaw: 0,
    },
    s = newSwing(),
    route = newSkyline();
  let phase = 0;
  const events: any[] = [];
  let maxRopeError = 0,
    maxSpeed = 0;
  let accumulator = 0,
    frame = 0,
    steps = 0,
    pendingJump = false;
  for (let i = 0; i < 3600; i++) {
    const p = m.position;
    let held = false,
      jump = false,
      moveX = 0,
      moveY = 1;
    if (phase === 0 && p.z >= 21) {
      phase = 1;
      held = true;
      jump = true;
    }
    if (phase === 1) {
      held = true;
      if (p.z > 37) {
        phase = 2;
        held = false;
      }
    }
    if (phase === 2 && route.stage === 1 && p.z >= 53) {
      phase = 3;
      held = true;
      jump = true;
    }
    if (phase === 3) {
      held = true;
      if (p.z > 76) {
        phase = 4;
        held = false;
      }
    }
    if (phase === 4 && route.stage === 2 && p.z >= 95) {
      phase = 5;
      held = true;
      jump = true;
    }
    if (phase === 5) {
      held = true;
      if (p.z > 122) {
        phase = 6;
        held = false;
      }
    }
    if (phase === 6 && p.z > 123) {
      phase = 7;
      held = !skipReattach;
    }
    if (phase === 7) {
      held = !skipReattach;
      if (p.z > 152) {
        phase = 8;
        held = false;
      }
    }
    if (phase === 8 && route.stage === 3 && p.z >= 166) {
      moveY = 0;
      moveX = 1;
      if (p.x > 5) {
        phase = 9;
        held = true;
        jump = true;
      }
    }
    if (phase === 9) {
      moveY = 0;
      moveX = 1;
      held = true;
      if (p.x > 20) {
        phase = 10;
        held = false;
      }
    }
    if (phase === 10) {
      moveY = 0;
      moveX = 1;
    }
    const f = phase >= 9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
    if (phase >= 9) {
      moveX = 0;
      moveY = 1;
    }
    const origin = { x: p.x - f.x * 9, y: p.y + 6, z: p.z - f.z * 9 };
    const aim: Aim = { origin, direction: { x: f.x, y: -0.16, z: f.z } };
    pendingJump ||= jump;
    const requested = {
      moveX,
      moveY,
      run: true,
      jumpPressed: pendingJump,
      swingHeld: held,
      cameraForward: f,
      aim,
    };
    accumulator += profile[frame++ % profile.length]!;
    while (accumulator + 1e-10 >= 1 / 60) {
      const old = m,
        oldS = s;
      const r = stepSwing(m, s, requested, ANCHORS, [...ROOFS, FALLBACK]);
      m = r.motion;
      s = r.swing;
      const a = advanceSkyline(route, old, m, oldS, s);
      route = a.route;
      requested.jumpPressed = false;
      pendingJump = false;
      accumulator -= 1 / 60;
      steps++;
      if (r.attached || r.released || r.landed || a.changed)
        events.push({
          step: steps,
          phase,
          position: { ...m.position },
          velocity: { ...m.velocity },
          web: s.web?.anchorId ?? null,
          stage: route.stage,
          attached: r.attached,
          released: r.released,
          landed: r.landed,
          reattach: route.reattached,
        });
      if (s.web)
        maxRopeError = Math.max(
          maxRopeError,
          distance(handOrigin(m), s.web.anchor) - s.web.length,
        );
      maxSpeed = Math.max(
        maxSpeed,
        Math.hypot(m.velocity.x, m.velocity.y, m.velocity.z),
      );
    }
    if (m.position.y < -18 || route.stage === 4) break;
  }
  return { motion: m, swing: s, route, events, maxRopeError, maxSpeed, steps };
}
