import type { MotionInput, MotionState, Vec3Data } from "./types";

export type SwingPhase =
  | "GROUNDED_OR_FREE"
  | "TARGET_AVAILABLE"
  | "WEB_FIRING"
  | "SWING_ATTACHED"
  | "SWING_RELEASING"
  | "AIRBORNE_FREE"
  | "LANDING"
  | "FALL_RECOVERY";
export interface Solid {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
export interface Anchor {
  id: string;
  position: Vec3Data;
  eligible: boolean;
  visible: boolean;
}
export interface Aim {
  origin: Vec3Data;
  direction: Vec3Data;
}
export interface Web {
  anchorId: string;
  anchor: Vec3Data;
  length: number;
  origin: "right-wrist";
  age?: number;
}
export interface SwingState {
  phase: SwingPhase;
  web: Web | null;
  targetId: string | null;
  held: boolean;
  freshRequired: boolean;
  phaseTime: number;
  message: string;
  attachments: number;
  releases: number;
  collisions: number;
}
export const SWING_RANGE = 31;
export const AIM_COSINE = Math.cos((58 * Math.PI) / 180);
export const MAX_SWING_SPEED = 48;
export const HERO_RADIUS = 0.48;
export const HERO_HEIGHT = 3.4;
const GRAVITY = 22;
const WRIST = { x: 0.56, y: 2.03, z: 0.71 };
export const distance = (a: Vec3Data, b: Vec3Data): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const subtract = (a: Vec3Data, b: Vec3Data): Vec3Data => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const dot = (a: Vec3Data, b: Vec3Data): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;
const normalized = (a: Vec3Data): Vec3Data => {
  const n = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / n, y: a.y / n, z: a.z / n };
};
const approach = (a: number, b: number, n: number): number =>
  a < b ? Math.min(b, a + n) : Math.max(b, a - n);
export function handOrigin(motion: MotionState): Vec3Data {
  const s = Math.sin(motion.facingYaw),
    c = Math.cos(motion.facingYaw);
  return {
    x: motion.position.x + WRIST.x * c + WRIST.z * s,
    y: motion.position.y + WRIST.y,
    z: motion.position.z - WRIST.x * s + WRIST.z * c,
  };
}
export function newSwing(): SwingState {
  return {
    phase: "GROUNDED_OR_FREE",
    web: null,
    targetId: null,
    held: false,
    freshRequired: false,
    phaseTime: 0,
    message: "Look for glowing rings. Hold E or LT / L2 to swing.",
    attachments: 0,
    releases: 0,
    collisions: 0,
  };
}

/** Slab intersection, excluding endpoint touch. Shared by selection and rope obstruction. */
export function segmentBlocked(
  a: Vec3Data,
  b: Vec3Data,
  solids: readonly Solid[],
): boolean {
  return solids.some((box) => {
    let low = 0,
      high = 1;
    for (const axis of ["x", "y", "z"] as const) {
      const d = b[axis] - a[axis];
      const min = box[`min${axis.toUpperCase()}` as keyof Solid] as number;
      const max = box[`max${axis.toUpperCase()}` as keyof Solid] as number;
      if (Math.abs(d) < 1e-9) {
        if (a[axis] <= min + 0.001 || a[axis] >= max - 0.001) return false;
      } else {
        let t0 = (min - a[axis]) / d,
          t1 = (max - a[axis]) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        low = Math.max(low, t0);
        high = Math.min(high, t1);
        if (low > high) return false;
      }
    }
    return high > 0.002 && low < 0.998;
  });
}
export function selectAnchor(
  motion: MotionState,
  aim: Aim,
  anchors: readonly Anchor[],
  solids: readonly Solid[],
): Anchor | null {
  const hand = handOrigin(motion),
    forward = normalized(aim.direction);
  return (
    anchors
      .filter(
        (a) =>
          a.eligible &&
          a.visible &&
          distance(hand, a.position) <= SWING_RANGE &&
          dot(normalized(subtract(a.position, aim.origin)), forward) >=
            AIM_COSINE &&
          !segmentBlocked(hand, a.position, solids),
      )
      .map((anchor) => ({
        anchor,
        score: dot(normalized(subtract(anchor.position, aim.origin)), forward),
        range: distance(hand, anchor.position),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.range - b.range ||
          a.anchor.id.localeCompare(b.anchor.id),
      )[0]?.anchor ?? null
  );
}
export function clearSwing(
  state: SwingState,
  phase: SwingPhase = "GROUNDED_OR_FREE",
): SwingState {
  return {
    ...state,
    phase,
    web: null,
    targetId: null,
    held: false,
    freshRequired: true,
    phaseTime: 0,
    message:
      phase === "FALL_RECOVERY"
        ? "Back to your safe rooftop. Release controls, then try again."
        : "Web released. Release controls, then press again.",
  };
}
export function safeToSave(
  motion: MotionState,
  swing: SwingState,
  recovering = false,
): boolean {
  return (
    motion.grounded &&
    !recovering &&
    !swing.web &&
    ![
      "WEB_FIRING",
      "SWING_ATTACHED",
      "SWING_RELEASING",
      "LANDING",
      "FALL_RECOVERY",
    ].includes(swing.phase)
  );
}
function overlaps(p: Vec3Data, b: Solid): boolean {
  return (
    p.x + HERO_RADIUS > b.minX + 0.00001 &&
    p.x - HERO_RADIUS < b.maxX - 0.00001 &&
    p.z + HERO_RADIUS > b.minZ + 0.00001 &&
    p.z - HERO_RADIUS < b.maxZ - 0.00001 &&
    p.y + HERO_HEIGHT > b.minY + 0.00001 &&
    p.y < b.maxY - 0.00001
  );
}
/** Small swept substeps cannot cross a thin wall at the bounded maximum speed. */
function moveSolid(
  state: MotionState,
  to: Vec3Data,
  solids: readonly Solid[],
): { motion: MotionState; hit: boolean } {
  const p = { ...state.position },
    v = { ...state.velocity };
  let hit = false,
    grounded = false;
  const delta = subtract(to, p);
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(delta.x, delta.y, delta.z) / 0.16),
  );
  for (let i = 0; i < steps; i++) {
    for (const axis of ["x", "z", "y"] as const) {
      const old = p[axis];
      p[axis] += delta[axis] / steps;
      const blocks = solids.filter((b) => overlaps(p, b));
      if (!blocks.length) continue;
      hit = true;
      if (axis === "y") {
        if (delta.y <= 0) {
          p.y = Math.max(...blocks.map((b) => b.maxY));
          grounded = true;
        } else p.y = Math.min(...blocks.map((b) => b.minY - HERO_HEIGHT));
      } else p[axis] = old;
      v[axis] = 0;
    }
  }
  // Standing contact survives a zero-length collision correction.
  grounded ||=
    solids.some(
      (b) =>
        Math.abs(p.y - b.maxY) < 0.001 &&
        p.x + HERO_RADIUS > b.minX &&
        p.x - HERO_RADIUS < b.maxX &&
        p.z + HERO_RADIUS > b.minZ &&
        p.z - HERO_RADIUS < b.maxZ,
    ) && v.y <= 0;
  return { motion: { ...state, position: p, velocity: v, grounded }, hit };
}
export interface SwingInput extends MotionInput {
  swingHeld: boolean;
  aim: Aim;
  paused?: boolean;
}
export function stepSwing(
  motion: MotionState,
  state: SwingState,
  input: SwingInput,
  anchors: readonly Anchor[],
  solids: readonly Solid[],
  dt = 1 / 60,
): {
  motion: MotionState;
  swing: SwingState;
  landed: boolean;
  attached: boolean;
  released: boolean;
} {
  if (input.paused)
    return {
      motion: structuredClone(motion),
      swing: structuredClone(state),
      landed: false,
      attached: false,
      released: false,
    };
  let s = {
    ...state,
    web: state.web ? { ...state.web, anchor: { ...state.web.anchor } } : null,
    phaseTime: Math.max(0, state.phaseTime - dt),
  };
  let m: MotionState = structuredClone(motion),
    attached = false,
    released = false;
  if (!input.swingHeld) s.freshRequired = false;
  const target = selectAnchor(m, input.aim, anchors, solids);
  s.targetId = target?.id ?? null;
  if (s.web && !input.swingHeld) {
    s.web = null;
    s.phase = "SWING_RELEASING";
    s.phaseTime = 0.14;
    s.releases++;
    released = true;
    s.message = "Released! Keep your momentum, then aim for the next ring.";
  }
  if (input.swingHeld && !s.held && !s.freshRequired && !s.web) {
    if (target) {
      s.web = {
        anchorId: target.id,
        anchor: { ...target.position },
        length: distance(handOrigin(m), target.position),
        origin: "right-wrist",
      };
      s.phase = "WEB_FIRING";
      s.phaseTime = 0.12;
      s.attachments++;
      attached = true;
      s.message = "Web attached. Steer gently. Let go to sail onward.";
    } else
      s.message =
        "No clear ring in reach. Turn the camera toward a nearby glowing ring.";
  }
  s.held = input.swingHeld;
  if (s.web && s.phase !== "WEB_FIRING") s.phase = "SWING_ATTACHED";
  else if (s.web && s.phaseTime === 0) s.phase = "SWING_ATTACHED";
  if (!s.web && s.phaseTime === 0) {
    s.phase = m.grounded
      ? target
        ? "TARGET_AVAILABLE"
        : "GROUNDED_OR_FREE"
      : "AIRBORNE_FREE";
    if (!input.swingHeld)
      s.message = target
        ? "Ring ready. Hold E or LT / L2. Release to sail forward."
        : "Aim at a glowing ring. Walk toward the skyline arrows.";
  }
  if(s.web){s.web.age=(s.web.age??0)+dt;
    if(s.web.age>3.5)s.message="Web held. Press forward to build momentum for a loop; let go to release.";
  }
  const forward = normalized({ ...input.cameraForward, y: 0 });
  const desire = normalized({
    x: forward.z * input.moveX + forward.x * input.moveY,
    y: 0,
    z: -forward.x * input.moveX + forward.z * input.moveY,
  });
  const moving = Math.hypot(input.moveX, input.moveY) > 0.03;
  if (m.grounded) {
    const speed = input.run ? 8 : 5;
    const accel = moving ? 24 : 30;
    m.velocity.x = approach(m.velocity.x, desire.x * speed, accel * dt);
    m.velocity.z = approach(m.velocity.z, desire.z * speed, accel * dt);
    // Fresh grounded attachment launches upward so the arc clears rooftops.
    // Standing gets the strongest loft; running attaches still lift (second-roof
    // approaches often have horizontal speed and used to skim building lips).
    if (attached) {
      const horizontal = Math.hypot(motion.velocity.x, motion.velocity.z);
      const loft = horizontal < 1 ? 17 : horizontal < 5 ? 15 : 13.5;
      m.velocity.y = Math.max(m.velocity.y, loft);
    } else if (input.jumpPressed) m.velocity.y = 9;
  } else if (moving) {
    m.velocity.x += desire.x * 9 * dt;
    m.velocity.z += desire.z * 9 * dt;
  }
  // Mid-gap airborne reattach (release ring A, catch ring B): one-shot pull up
  // and toward the next ring so a long downswing does not hit the street.
  // Requires a real fall into a long span — nearby catches and roof scrapes stay normal.
  if (
    attached &&
    !motion.grounded &&
    s.web &&
    motion.velocity.y < -2.5
  ) {
    const hand = handOrigin(m);
    const below = s.web.anchor.y - hand.y;
    const horizontal = Math.hypot(
      hand.x - s.web.anchor.x,
      hand.z - s.web.anchor.z,
    );
    if (below > 5 && horizontal > 12) {
      const to = normalized(subtract(s.web.anchor, hand));
      const fall = Math.max(0, -motion.velocity.y);
      const up = Math.min(18, 9 + below * 0.5 + fall * 0.4);
      m.velocity.y = Math.max(m.velocity.y, up);
      const along = Math.min(11, 4 + horizontal * 0.24);
      m.velocity.x += to.x * along;
      m.velocity.z += to.z * along;
    }
  }
  if(s.web && moving && !m.grounded) {
    const radial=normalized(subtract(handOrigin(m),s.web.anchor));
    const along=dot(m.velocity,radial);
    const tangent={x:m.velocity.x-radial.x*along,y:m.velocity.y-radial.y*along,z:m.velocity.z-radial.z*along};
    const speed=Math.hypot(tangent.x,tangent.y,tangent.z);
    // Forward pumping adds bounded tangential force, never radial position or
    // angle. Ordinary short transfers retain their established steering. Holding the
    // same web for3.5seconds enables gradual pumping; energy still obeys gravity.
    if(input.moveY>0 && (s.web.age??0)>3.5 && speed>.5){const force=12*Math.min(1,input.moveY)*dt/speed;
      m.velocity.x+=tangent.x*force;m.velocity.y+=tangent.y*force;m.velocity.z+=tangent.z*force;}
  }
  m.velocity.y -= GRAVITY * dt;
  // Soft loft only on early, long-gap swings (large horizontal span). Tight orbits
  // for 360 pumps sit under the ring and must keep full pendulum energy.
  if (s.web && !m.grounded && m.velocity.y < 0 && (s.web.age ?? 0) < 2.1) {
    const hand = handOrigin(m);
    const below = s.web.anchor.y - hand.y;
    const horizontal = Math.hypot(
      hand.x - s.web.anchor.x,
      hand.z - s.web.anchor.z,
    );
    if (below > 1.5 && horizontal > 6) {
      const loft = Math.min(22, (below - 1.5) * 3.8) * dt;
      m.velocity.y = Math.min(0, m.velocity.y + loft);
    }
  }
  const speed = Math.hypot(m.velocity.x, m.velocity.y, m.velocity.z);
  const incomingLimit=Math.min(MAX_SWING_SPEED,Math.max(26,Math.hypot(motion.velocity.x,motion.velocity.y,motion.velocity.z)));
  const limit=s.web && (s.web.age??0)>3.5 ? MAX_SWING_SPEED : incomingLimit;
  if (speed > limit) {
    const scale = limit / speed;
    for (const axis of ["x", "y", "z"] as const) m.velocity[axis] *= scale;
  }
  if (moving && !s.web) m.facingYaw = Math.atan2(desire.x, desire.z);
  const moved = moveSolid(
    m,
    {
      x: m.position.x + m.velocity.x * dt,
      y: m.position.y + m.velocity.y * dt,
      z: m.position.z + m.velocity.z * dt,
    },
    solids,
  );
  m = moved.motion;
  if (moved.hit && !m.grounded) s.collisions++;
  if (s.web) {
    const h = handOrigin(m),
      radial = subtract(h, s.web.anchor),
      len = Math.hypot(radial.x, radial.y, radial.z);
    if (len > s.web.length) {
      const n = normalized(radial),
        excess = len - s.web.length;
      const solved = moveSolid(
        m,
        {
          x: m.position.x - n.x * excess,
          y: m.position.y - n.y * excess,
          z: m.position.z - n.z * excess,
        },
        solids,
      );
      m = solved.motion;
      const outward = dot(m.velocity, n);
      if (outward > 0) {
        m.velocity.x -= n.x * outward;
        m.velocity.y -= n.y * outward;
        m.velocity.z -= n.z * outward;
      }
    }
    // Collision wins. Projection roundoff/roof contact must not cancel a valid
    // held web. Only a real segment obstruction invalidates the attachment.
    if (
      segmentBlocked(handOrigin(m), s.web.anchor, solids)
    ) {
      s.web = null;
      s.phase = "SWING_RELEASING";
      s.phaseTime = 0.14;
      s.freshRequired = true;
      s.message = "Web blocked by a building. Release, then aim again.";
    }
  }
  const landed = !motion.grounded && m.grounded;
  if (landed && !s.web) {
    s.web = null;
    s.phase = "LANDING";
    s.phaseTime = 0.16;
    s.freshRequired = input.swingHeld;
    s.message = "Nice landing! Release controls before your next swing.";
  }
  return { motion: m, swing: s, landed, attached, released };
}
