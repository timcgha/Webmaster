import type { MotionState, Vec3Data } from "./types";
import {
  clearSwing,
  distance,
  handOrigin,
  HERO_HEIGHT,
  HERO_RADIUS,
  segmentBlocked,
  stepSwing,
  type Aim,
  type Anchor,
  type Solid,
  type SwingInput,
  type SwingState,
} from "./swing";

export type AuthoredRole =
  | "ORDINARY_SOLID"
  | "SWING_ANCHOR"
  | "CLIMBABLE_WALL"
  | "CLIMBABLE_CEILING"
  | "CLIMB_TRANSITION"
  | "PULLABLE_LIGHT"
  | "PULLABLE_LIMITED"
  | "TOO_HEAVY"
  | "ROUTE_TRIGGER";
export type TraversalPhase =
  | "FREE_OR_GROUNDED"
  | "SWING_ATTACHED"
  | "WALL_TARGET_AVAILABLE"
  | "WALL_ATTACHING"
  | "WALL_CLIMBING"
  | "WALL_TO_CEILING_TRANSITION"
  | "CEILING_ATTACHED"
  | "CEILING_MOVING"
  | "SURFACE_DETACHING"
  | "AIRBORNE_FREE"
  | "PULL_TARGET_AVAILABLE"
  | "PULL_WEB_FIRING"
  | "PULL_ATTACHED"
  | "PULLING"
  | "PULL_RELEASING"
  | "LANDING"
  | "FALL_RECOVERY";
export interface Surface extends Solid {
  role: AuthoredRole;
  normal: Vec3Data;
  transition?: string;
  /** Street recovery walls allow a continuous climb above the lip and onto the roof. */
  topOut?: boolean;
}
export interface PullObject {
  id: string;
  role: AuthoredRole;
  position: Vec3Data;
  initial: Vec3Data;
  half: Vec3Data;
  speed: number;
}
export const LIMITS = Object.freeze({
  attachDistance: 1.15,
  facingCosine: Math.cos(Math.PI / 3),
  climbSpeed: 3.4,
  ceilingSpeed: 3.5,
  transitionTime: 0.24,
  pullRange: 15,
  limitedRange: 7,
  aimCosine: Math.cos(Math.PI / 5),
  lightSpeed: 3.4,
  limitedSpeed: 1.3,
  pullAcceleration: 9,
  minimumSeparation: 1.3,
  webFireTime: 0.12,
});
export const TRAINING_START = { x: 0, y: 0, z: -20 };
export const TRAINING_SOLIDS: readonly Solid[] = [
  {
    id: "climb-entry",
    minX: -6,
    maxX: 6,
    minY: -18,
    maxY: 0,
    minZ: -24,
    maxZ: -12,
  },
  {
    id: "climb-roof",
    minX: -12,
    maxX: 12,
    minY: -18,
    maxY: 0,
    minZ: -68,
    maxZ: -36,
  },
  {
    id: "climb-wall",
    minX: -10,
    maxX: 10,
    minY: 0,
    maxY: 11,
    minZ: -62,
    maxZ: -61,
  },
  {
    id: "climb-ceiling",
    minX: -10,
    maxX: -3,
    minY: 11,
    maxY: 11.5,
    minZ: -61,
    maxZ: -49,
  },
  {
    id: "pull-finish-ledge",
    minX: -16,
    maxX: -10,
    minY: 0,
    maxY: 2.6,
    minZ: -54,
    maxZ: -48,
  },
];
export const TRAINING_ANCHOR: Anchor = {
  id: "training-ring",
  position: { x: 0, y: 16, z: -29 },
  eligible: true,
  visible: true,
};
export const SURFACES: readonly Surface[] = [
  {
    ...TRAINING_SOLIDS[2]!,
    role: "CLIMBABLE_WALL",
    normal: { x: 0, y: 0, z: 1 },
    transition: "climb-ceiling",
  },
  {
    ...TRAINING_SOLIDS[3]!,
    role: "CLIMBABLE_CEILING",
    normal: { x: 0, y: -1, z: 0 },
  },
];
export const CLASSIFICATIONS: Readonly<Record<string, AuthoredRole>> =
  Object.freeze({
    "climb-entry": "ORDINARY_SOLID",
    "climb-roof": "ORDINARY_SOLID",
    "climb-wall": "CLIMBABLE_WALL",
    "climb-ceiling": "CLIMBABLE_CEILING",
    "wall-ceiling-junction": "CLIMB_TRANSITION",
    "training-ring": "SWING_ANCHOR",
    "route-step": "PULLABLE_LIGHT",
    "limited-crate": "PULLABLE_LIMITED",
    "heavy-crate": "TOO_HEAVY",
    "ordinary-crate": "ORDINARY_SOLID",
    "pull-finish-ledge": "ROUTE_TRIGGER",
  });
export function newPullObjects(): PullObject[] {
  return [
    ["route-step", "PULLABLE_LIGHT", 0, -51, 1.3, 3],
    ["limited-crate", "PULLABLE_LIMITED", 4, -57, 1.1, 1.5],
    ["heavy-crate", "TOO_HEAVY", 4, -49, 2, 2],
    ["ordinary-crate", "ORDINARY_SOLID", 7, -55, 1.8, 1.8],
  ].map(([id, role, x, z, h, w]) => ({
    id: String(id),
    role: role as AuthoredRole,
    position: { x: Number(x), y: Number(h) / 2, z: Number(z) },
    initial: { x: Number(x), y: Number(h) / 2, z: Number(z) },
    half: { x: Number(w) / 2, y: Number(h) / 2, z: Number(w) / 2 },
    speed: 0,
  }));
}
export function objectSolid(o: PullObject): Solid {
  return {
    id: o.id,
    minX: o.position.x - o.half.x,
    maxX: o.position.x + o.half.x,
    minY: o.position.y - o.half.y,
    maxY: o.position.y + o.half.y,
    minZ: o.position.z - o.half.z,
    maxZ: o.position.z + o.half.z,
  };
}
export interface ClimbSave {
  version: 1;
  checkpoint: 0 | 1 | 4 | 6;
  completed: boolean;
}
export interface TrainingRoute {
  active: boolean;
  stage: number;
  checkpoint: ClimbSave["checkpoint"];
  completed: boolean;
  completions: number;
  valid: boolean;
  swingAttached: boolean;
  swingReleased: boolean;
  wallStart: Vec3Data | null;
  vertical: number;
  lateral: number;
  ceilingStart: Vec3Data | null;
  ceilingDistance: number;
  pulledDistance: number;
  stepped: boolean;
}
export const newTrainingRoute = (): TrainingRoute => ({
  active: false,
  stage: 0,
  checkpoint: 0,
  completed: false,
  completions: 0,
  valid: true,
  swingAttached: false,
  swingReleased: false,
  wallStart: null,
  vertical: 0,
  lateral: 0,
  ceilingStart: null,
  ceilingDistance: 0,
  pulledDistance: 0,
  stepped: false,
});
export const TRAINING_LABELS = [
  "Climb & Pull: turn toward the south ring. Jump, hold your swing web, then release over the far roof.",
  "Start at the wall’s gold stripe. Hold C / R1 / RB. Climb up, then right to the ceiling corner.",
  "Keep holding climb. Move right into the marked ceiling corner.",
  "Ceiling: pull the stick back / press S to crawl toward the drop arrow. Release climb to drop.",
  "Pull the pale crate toward the gold floor mark. Use it as a step to the finish ledge.",
  "Jump onto your moved crate, then jump onto the gold finish ledge.",
  "Climb & Pull complete! Land, save, or replay from Pause.",
];
export interface TraversalState {
  phase: TraversalPhase;
  surfaceId: string | null;
  targetId: string | null;
  pullId: string | null;
  webOrigin: "right-wrist" | null;
  phaseTime: number;
  freshClimb: boolean;
  freshPull: boolean;
  heldClimb: boolean;
  heldPull: boolean;
  message: string;
  cameraMode: "ground" | "wall" | "ceiling";
}
export const newTraversal = (): TraversalState => ({
  phase: "FREE_OR_GROUNDED",
  surfaceId: null,
  targetId: null,
  pullId: null,
  webOrigin: null,
  phaseTime: 0,
  freshClimb: false,
  freshPull: false,
  heldClimb: false,
  heldPull: false,
  message: "South of practice: follow the Climb & Pull arrows.",
  cameraMode: "ground",
});
export function clearTraversal(
  s: TraversalState,
  phase: TraversalPhase = "SURFACE_DETACHING",
): TraversalState {
  return {
    ...s,
    phase,
    surfaceId: null,
    targetId: null,
    pullId: null,
    webOrigin: null,
    phaseTime: 0.16,
    freshClimb: true,
    freshPull: true,
    heldClimb: false,
    heldPull: false,
    cameraMode: "ground",
    message: "Released safely. Let go of controls, then press again.",
  };
}
const norm = (v: Vec3Data) => {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
};
const minus = (a: Vec3Data, b: Vec3Data) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const dot = (a: Vec3Data, b: Vec3Data) => a.x * b.x + a.y * b.y + a.z * b.z;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
function heroOverlaps(p: Vec3Data, b: Solid): boolean {
  return (
    p.x + HERO_RADIUS > b.minX + 0.001 &&
    p.x - HERO_RADIUS < b.maxX - 0.001 &&
    p.z + HERO_RADIUS > b.minZ + 0.001 &&
    p.z - HERO_RADIUS < b.maxZ - 0.001 &&
    p.y + HERO_HEIGHT > b.minY + 0.001 &&
    p.y < b.maxY - 0.001
  );
}
function wallContact(m: MotionState, wall: Surface): Vec3Data {
  return { ...m.position, z: wall.maxZ + HERO_RADIUS + 0.015 };
}
function clearAttachmentPath(
  from: Vec3Data,
  to: Vec3Data,
  solids: readonly Solid[],
): boolean {
  // Wall contact changes only Z. Its swept body volume therefore is this box,
  // including the final pose, rather than only a center-line visibility ray.
  return !solids.some(
    (b) =>
      from.x + HERO_RADIUS > b.minX + 0.001 &&
      from.x - HERO_RADIUS < b.maxX - 0.001 &&
      Math.max(from.z, to.z) + HERO_RADIUS > b.minZ + 0.001 &&
      Math.min(from.z, to.z) - HERO_RADIUS < b.maxZ - 0.001 &&
      from.y + HERO_HEIGHT > b.minY + 0.001 &&
      from.y < b.maxY - 0.001,
  );
}
export function selectWall(
  m: MotionState,
  held: boolean,
  surfaces: readonly Surface[],
  solids: readonly Solid[],
): Surface | null {
  if (!held) return null;
  const facing = { x: Math.sin(m.facingYaw), y: 0, z: Math.cos(m.facingYaw) };
  return (
    surfaces
      .filter(
        (s) =>
          s.role === "CLIMBABLE_WALL" &&
          s.normal.z === 1 &&
          m.position.x > s.minX + HERO_RADIUS &&
          m.position.x < s.maxX - HERO_RADIUS &&
          m.position.y >= s.minY - 0.1 &&
          m.position.y + (s.topOut ? 0 : HERO_HEIGHT) <= s.maxY + 0.03 &&
          m.position.z >= s.maxZ + HERO_RADIUS - 0.03 &&
          m.position.z - s.maxZ <= (s.topOut ? HERO_RADIUS + 0.12 : LIMITS.attachDistance) &&
          dot(facing, s.normal) <= -LIMITS.facingCosine &&
          clearAttachmentPath(
            m.position,
            wallContact(m, s),
            solids.filter((b) => b.id !== s.id),
          ) &&
          !segmentBlocked(
            { x: m.position.x, y: m.position.y + 1.5, z: m.position.z },
            { x: m.position.x, y: m.position.y + 1.5, z: s.maxZ + 0.01 },
            solids.filter((b) => b.id !== s.id),
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0] ?? null
  );
}
export interface PullSelection {
  object: PullObject | null;
  reason: string;
}
export function selectPull(
  m: MotionState,
  aim: Aim,
  objects: readonly PullObject[],
  solids: readonly Solid[],
): PullSelection {
  const forward = norm(aim.direction),
    hand = handOrigin(m);
  const candidates = objects
    .filter(
      (o) =>
        dot(norm(minus(o.position, aim.origin)), forward) >= LIMITS.aimCosine &&
        dot(norm(minus(o.position, m.position)), forward) > 0.02,
    )
    .map((o) => ({
      o,
      score: dot(norm(minus(o.position, aim.origin)), forward),
      range: distance(hand, o.position),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.range - b.range || a.o.id.localeCompare(b.o.id),
    );
  if (!candidates.length)
    return { object: null, reason: "No target. Aim at a marked crate." };
  // Visible candidates win; an occluded nearer candidate cannot hide a clear target.
  const clear = candidates.filter(
    (c) =>
      !segmentBlocked(
        hand,
        c.o.position,
        solids.filter((b) => b.id !== c.o.id),
      ),
  );
  const eligible = clear.filter(
    (c) =>
      ["PULLABLE_LIGHT", "PULLABLE_LIMITED"].includes(c.o.role) &&
      c.range <=
        (c.o.role === "PULLABLE_LIMITED"
          ? LIMITS.limitedRange
          : LIMITS.pullRange),
  );
  const c = eligible[0] ?? clear[0] ?? candidates[0]!;
  if (!clear.length) return { object: c.o, reason: "Path blocked" };
  if (c.o.role === "TOO_HEAVY")
    return { object: c.o, reason: "Too heavy to pull" };
  if (!["PULLABLE_LIGHT", "PULLABLE_LIMITED"].includes(c.o.role))
    return { object: c.o, reason: "This object cannot be pulled" };
  if (
    c.range >
    (c.o.role === "PULLABLE_LIMITED" ? LIMITS.limitedRange : LIMITS.pullRange)
  )
    return { object: c.o, reason: "Target out of range" };
  return { object: c.o, reason: "Ready to pull" };
}
export interface TraversalInput extends SwingInput {
  climbHeld: boolean;
  pullHeld: boolean;
}
export function stepTraversal(
  motion: MotionState,
  state: TraversalState,
  swing: SwingState,
  objects: readonly PullObject[],
  input: TraversalInput,
  anchors: readonly Anchor[],
  solids: readonly Solid[],
  surfaces: readonly Surface[] = SURFACES,
  dt = 1 / 60,
): {
  motion: MotionState;
  traversal: TraversalState;
  swing: SwingState;
  objects: PullObject[];
} {
  if (input.paused)
    return {
      motion: structuredClone(motion),
      traversal: structuredClone(state),
      swing: structuredClone(swing),
      objects: structuredClone([...objects]),
    };
  const step = clamp(dt, 0, 1 / 30);
  let m = structuredClone(motion),
    s = structuredClone(state),
    sw = structuredClone(swing),
    os = structuredClone([...objects]);
  s.phaseTime = Math.max(0, s.phaseTime - step);
  if (!input.climbHeld) s.freshClimb = false;
  if (!input.pullHeld) s.freshPull = false;
  const allSolids = () => [...solids, ...os.map(objectSolid)];
  let surface = surfaces.find((x) => x.id === s.surfaceId);
  if (
    s.surfaceId &&
    (!surface ||
      !["CLIMBABLE_WALL", "CLIMBABLE_CEILING"].includes(surface.role) ||
      !input.climbHeld ||
      input.jumpPressed ||
      input.swingHeld)
  ) {
    s = clearTraversal(s);
    m.grounded = false;
    m.velocity = {
      x: 0,
      y: input.jumpPressed ? 4 : 0,
      z: surface?.role === "CLIMBABLE_WALL" ? 3 : 0,
    };
    surface = undefined;
  }
  const availableWall = selectWall(m, true, surfaces, allSolids());
  const wall = input.climbHeld && !s.freshClimb ? availableWall : null;
  if (!surface && wall && !input.swingHeld && !s.pullId) {
    sw = clearSwing(sw);
    s.surfaceId = wall.id;
    s.phase = "WALL_ATTACHING";
    s.phaseTime = 0.12;
    s.cameraMode = "wall";
    s.message =
      "Wall held. Up/down climbs; left/right moves sideways. Let go to detach.";
    surface = wall;
    m.velocity = { x: 0, y: 0, z: 0 };
    m.grounded = false;
    m.position = wallContact(m, wall);
  }
  if (surface) {
    // Bound combined keyboard/controller axes without promoting a partial
    // analog deflection to full speed. Camera rotation preserves this length.
    const inputLength = Math.max(1, Math.hypot(input.moveX, input.moveY));
    const moveX = input.moveX / inputLength;
    const moveY = input.moveY / inputLength;
    m.grounded = false;
    m.velocity = { x: 0, y: 0, z: 0 };
    sw.web = null;
    if (surface.role === "CLIMBABLE_WALL") {
      const p = {
        ...m.position,
        x: clamp(
          m.position.x - moveX * LIMITS.climbSpeed * step,
          surface.minX + HERO_RADIUS + 0.02,
          surface.maxX - HERO_RADIUS - 0.02,
        ),
        y: clamp(
          m.position.y + moveY * LIMITS.climbSpeed * step,
          surface.minY,
          surface.maxY - (surface.topOut ? 0 : HERO_HEIGHT),
        ),
      };
      if (!allSolids().some((b) => b.id !== surface!.id && heroOverlaps(p, b)))
        m.position = p;
      m.facingYaw = Math.PI;
      if (s.phaseTime === 0) s.phase = "WALL_CLIMBING";
      if (surface.topOut && p.y >= surface.maxY - 0.001 && moveY > 0.2) {
        const onTop = { ...m.position, z: m.position.z - moveY * LIMITS.climbSpeed * step };
        if (!allSolids().some(b => heroOverlaps(onTop, b))) m.position = onTop;
        if (m.position.z <= surface.maxZ - HERO_RADIUS - 0.05) {
          s = clearTraversal(s, "LANDING");
          s.message = "Back on the rooftop! Follow the numbered rings.";
          m.grounded = true;
        }
      }
      const ceiling = surfaces.find(
        (c) => c.id === surface!.transition && c.role === "CLIMBABLE_CEILING",
      );
      if (
        ceiling &&
        input.moveY > 0.2 &&
        m.position.y >= ceiling.minY - HERO_HEIGHT - 0.025 &&
        m.position.x > ceiling.minX + HERO_RADIUS &&
        m.position.x < ceiling.maxX - HERO_RADIUS &&
        m.position.z >= ceiling.minZ &&
        m.position.z <= ceiling.maxZ &&
        !allSolids().some(
          (b) =>
            b.id !== surface!.id &&
            b.id !== ceiling.id &&
            heroOverlaps(m.position, b),
        )
      ) {
        s.surfaceId = ceiling.id;
        s.phase = "WALL_TO_CEILING_TRANSITION";
        s.phaseTime = LIMITS.transitionTime;
        s.cameraMode = "ceiling";
        s.message =
          "Ceiling held. Press S / pull the stick back to crawl toward the drop arrow.";
      }
    } else {
      const f = norm({ ...input.cameraForward, y: 0 });
      const p = {
        x:
          m.position.x +
          (f.z * moveX + f.x * moveY) * LIMITS.ceilingSpeed * step,
        y: surface.minY - HERO_HEIGHT,
        z:
          m.position.z +
          (-f.x * moveX + f.z * moveY) * LIMITS.ceilingSpeed * step,
      };
      if (s.phaseTime === 0) {
        if (
          p.x < surface.minX + HERO_RADIUS ||
          p.x > surface.maxX - HERO_RADIUS ||
          p.z < surface.minZ + HERO_RADIUS ||
          p.z > surface.maxZ - HERO_RADIUS
        ) {
          s = clearTraversal(s);
          m.velocity = { x: 0, y: 0, z: 0 };
        } else if (
          !allSolids().some((b) => b.id !== surface!.id && heroOverlaps(p, b))
        ) {
          m.position = p;
          s.phase =
            Math.hypot(input.moveX, input.moveY) > 0.05
              ? "CEILING_MOVING"
              : "CEILING_ATTACHED";
        }
      }
    }
    if (input.pullHeld)
      s.message = "Let go and reach safe ground before pulling.";
  } else {
    const result = stepSwing(
      m,
      sw,
      { ...input, swingHeld: input.swingHeld && !s.pullId },
      anchors,
      allSolids(),
      step,
    );
    m = result.motion;
    sw = result.swing;
    if (result.landed) {
      s.phase = "LANDING";
      s.phaseTime = 0.16;
    } else if (!s.pullId && s.phaseTime === 0)
      s.phase = sw.web
        ? "SWING_ATTACHED"
        : m.grounded
          ? "FREE_OR_GROUNDED"
          : "AIRBORNE_FREE";
  }
  if (input.pullHeld && !s.surfaceId && !sw.web && m.grounded)
    m.facingYaw = Math.atan2(input.aim.direction.x, input.aim.direction.z);
  const selected = selectPull(m, input.aim, os, allSolids());
  s.targetId = selected.object?.id ?? null;
  if (
    !s.surfaceId &&
    !s.pullId &&
    m.grounded &&
    !sw.web &&
    s.phaseTime === 0 &&
    selected.reason === "Ready to pull"
  )
    s.phase = "PULL_TARGET_AVAILABLE";
  if (
    s.pullId &&
    (!input.pullHeld || input.climbHeld || input.swingHeld || !m.grounded)
  ) {
    s.pullId = null;
    s.webOrigin = null;
    s.phase = "PULL_RELEASING";
    s.phaseTime = 0.12;
    s.freshPull = true;
    s.message = "Pull released.";
  }
  if (input.pullHeld && !s.heldPull && !s.freshPull && !s.pullId) {
    if (s.surfaceId || sw.web || !m.grounded) {
      s.message = "Let go and reach safe ground before pulling.";
      s.freshPull = true;
    } else if (selected.reason === "Ready to pull" && selected.object) {
      s.pullId = selected.object.id;
      s.webOrigin = "right-wrist";
      s.phase = "PULL_WEB_FIRING";
      s.phaseTime = LIMITS.webFireTime;
      s.message = "Web attached. Hold pull; let go to release.";
      sw = clearSwing(sw);
    } else {
      s.message = selected.reason;
      s.freshPull = true;
    }
  }
  for (const o of os) {
    if (o.id !== s.pullId) {
      o.speed = 0;
      continue;
    }
    const hand = handOrigin(m),
      d = minus(m.position, o.position),
      range = Math.hypot(d.x, d.z);
    const blockers = allSolids().filter((b) => b.id !== o.id);
    if (
      distance(hand, o.position) >
        (o.role === "PULLABLE_LIMITED"
          ? LIMITS.limitedRange
          : LIMITS.pullRange) ||
      segmentBlocked(hand, o.position, blockers)
    ) {
      s.message =
        distance(hand, o.position) >
        (o.role === "PULLABLE_LIMITED" ? LIMITS.limitedRange : LIMITS.pullRange)
          ? "Target out of range"
          : "Path blocked";
      s.pullId = null;
      s.webOrigin = null;
      s.phase = "PULL_RELEASING";
      s.phaseTime = 0.12;
      s.freshPull = true;
      o.speed = 0;
      continue;
    }
    if (s.phaseTime > 0) {
      o.speed = 0;
      continue;
    }
    if (range <= LIMITS.minimumSeparation + o.half.x) {
      s.phase = "PULL_ATTACHED";
      o.speed = 0;
      s.message = "Close enough! Release, then use your moved step.";
      continue;
    }
    o.speed = Math.min(
      o.role === "PULLABLE_LIMITED" ? LIMITS.limitedSpeed : LIMITS.lightSpeed,
      o.speed + LIMITS.pullAcceleration * step,
    );
    const amount = Math.min(
        o.speed * step,
        range - LIMITS.minimumSeparation - o.half.x,
      ),
      p = {
        ...o.position,
        x: o.position.x + (d.x / range) * amount,
        z: o.position.z + (d.z / range) * amount,
      };
    const moved = { ...o, position: p },
      box = objectSolid(moved);
    const supported = blockers.some(
      (b) =>
        Math.abs(box.minY - b.maxY) < 0.02 &&
        box.minX >= b.minX &&
        box.maxX <= b.maxX &&
        box.minZ >= b.minZ &&
        box.maxZ <= b.maxZ,
    );
    const collision =
      !supported ||
      blockers.some(
        (b) =>
          box.maxX > b.minX + 0.001 &&
          box.minX < b.maxX - 0.001 &&
          box.maxZ > b.minZ + 0.001 &&
          box.minZ < b.maxZ - 0.001 &&
          box.maxY > b.minY + 0.001 &&
          box.minY < b.maxY - 0.001,
      ) ||
      heroOverlaps(m.position, box);
    if (collision) {
      o.speed = 0;
      s.message = "Path blocked";
      s.pullId = null;
      s.webOrigin = null;
      s.phase = "PULL_RELEASING";
      s.phaseTime = 0.12;
      s.freshPull = true;
    } else {
      o.position = p;
      s.phase = "PULLING";
      s.message = "Pulling. Let go when the crate reaches the gold mark.";
    }
  }
  // A held web owns the selected outline; idle aim resumes only after release.
  s.targetId = s.pullId ?? selected.object?.id ?? null;
  s.heldClimb = input.climbHeld;
  s.heldPull = input.pullHeld;
  if (
    !s.surfaceId &&
    availableWall &&
    !s.pullId &&
    s.phase === "FREE_OR_GROUNDED"
  ) {
    s.phase = "WALL_TARGET_AVAILABLE";
    s.message = "Striped wall ready. Hold C / R1 / RB to stick.";
  }
  return { motion: m, traversal: s, swing: sw, objects: os };
}
export function advanceTraining(
  route: TrainingRoute,
  before: MotionState,
  m: MotionState,
  oldSwing: SwingState,
  swing: SwingState,
  t: TraversalState,
  objects: readonly PullObject[],
): TrainingRoute {
  let r = structuredClone(route);
  if (distance(before.position, m.position) > 1.1)
    return { ...r, valid: false };
  if (!r.valid) return r;
  if (
    !r.active &&
    m.grounded &&
    Math.abs(m.position.x) < 5 &&
    m.position.z < -17 &&
    m.position.z > -23
  )
    r.active = true;
  if (!r.active || r.stage === 6) return r;
  if (r.stage === 0) {
    if (swing.web?.anchorId === "training-ring") r.swingAttached = true;
    if (
      oldSwing.web?.anchorId === "training-ring" &&
      !swing.web &&
      swing.releases > oldSwing.releases &&
      !m.grounded
    )
      r.swingReleased = true;
    if (
      r.swingAttached &&
      r.swingReleased &&
      m.grounded &&
      m.position.z < -38 &&
      m.position.z > -60
    ) {
      r.stage = 1;
      r.checkpoint = 1;
    }
  }
  if (r.stage === 1 || r.stage === 2) {
    if (t.surfaceId === "climb-wall") {
      r.wallStart ??= { ...m.position };
      r.vertical = Math.max(r.vertical, m.position.y - r.wallStart.y);
      r.lateral = Math.max(r.lateral, Math.abs(m.position.x - r.wallStart.x));
      if (r.vertical >= 4 && r.lateral >= 3) r.stage = 2;
    }
    if (r.stage === 2 && t.surfaceId === "climb-ceiling") {
      r.stage = 3;
      r.ceilingStart = { ...m.position };
    }
  }
  if (r.stage === 3) {
    if (t.surfaceId === "climb-ceiling" && r.ceilingStart)
      r.ceilingDistance = Math.max(
        r.ceilingDistance,
        distance(m.position, r.ceilingStart),
      );
    if (
      !t.surfaceId &&
      m.grounded &&
      m.position.y === 0 &&
      r.ceilingDistance >= 6 &&
      m.position.z > -54
    ) {
      r.stage = 4;
      r.checkpoint = 4;
    }
  }
  const step = objects.find((o) => o.id === "route-step")!;
  if (r.stage === 4 && t.pullId === step.id) {
    r.pulledDistance = Math.max(
      r.pulledDistance,
      distance(step.position, step.initial),
    );
    if (r.pulledDistance >= 5 && step.position.x < -6.3) r.stage = 5;
  }
  if (r.stage === 5) {
    const b = objectSolid(step);
    if (
      m.grounded &&
      Math.abs(m.position.y - b.maxY) < 0.02 &&
      Math.abs(m.position.x - step.position.x) < step.half.x &&
      Math.abs(m.position.z - step.position.z) < step.half.z
    )
      r.stepped = true;
    if (
      r.stepped &&
      m.grounded &&
      Math.abs(m.position.y - 2.6) < 0.02 &&
      m.position.x < -10.5 &&
      m.position.z > -53.5 &&
      m.position.z < -48.5
    ) {
      r.stage = 6;
      r.checkpoint = 6;
      r.completed = true;
      r.completions++;
    }
  }
  return r;
}
export function validClimbSave(v: unknown): v is ClimbSave {
  if (!v || typeof v !== "object") return false;
  const x = v as ClimbSave;
  return (
    x.version === 1 &&
    [0, 1, 4, 6].includes(x.checkpoint) &&
    typeof x.completed === "boolean" &&
    (x.checkpoint !== 6 || x.completed)
  );
}
export function trainingCheckpoint(stage: ClimbSave["checkpoint"]): Vec3Data {
  return stage === 6
    ? { x: -11, y: 2.6, z: -51 }
    : stage === 4
      ? { x: -6, y: 0, z: -50 }
      : stage === 1
        ? { x: 0, y: 0, z: -41 }
        : { ...TRAINING_START };
}
export function restoreTraining(save: ClimbSave): TrainingRoute {
  return {
    ...newTrainingRoute(),
    active: true,
    stage: save.checkpoint,
    checkpoint: save.checkpoint,
    completed: save.completed,
  };
}
export function safeTraversal(
  m: MotionState,
  t: TraversalState,
  recovering = false,
  objects: readonly PullObject[] = [],
): boolean {
  return (
    m.grounded &&
    !recovering &&
    !t.surfaceId &&
    !t.pullId &&
    !objects.some((o) => {
      const b = objectSolid(o);
      // Match the horizontal footprint used by grounding. An unrelated crate
      // at the same elevation must not make a static roof unsafe to save on.
      return (
        Math.abs(m.position.y - b.maxY) < 0.02 &&
        m.position.x + HERO_RADIUS > b.minX &&
        m.position.x - HERO_RADIUS < b.maxX &&
        m.position.z + HERO_RADIUS > b.minZ &&
        m.position.z - HERO_RADIUS < b.maxZ
      );
    }) &&
    [
      "FREE_OR_GROUNDED",
      "PULL_TARGET_AVAILABLE",
      "WALL_TARGET_AVAILABLE",
    ].includes(t.phase)
  );
}
