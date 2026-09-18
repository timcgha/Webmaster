import type { MotionState, Vec3Data } from "./types";
import { bodyClear } from "./course";
import { distance, type Solid } from "./swing";

export type AttackKind = "punch" | "kick" | "web";
export type ComboStep = 1 | 2 | 3;
export interface CombatSave {
  version: 1;
  completed: boolean;
}
export const COMBAT_START: Vec3Data = { x: -38, y: -18, z: -54 };
export const COMBAT_NAMES = {
  punch: ["Left jab", "Right cross", "Haymaker!"],
  kick: ["Jump kick", "Turning kick", "Spinning finisher!"],
  web: ["Web ball", "Twin spiral", "Web burst!"],
} as const;
export const STATION_NAMES = [
  "BOX COMBINATIONS",
  "JUMP-KICK TARGETS",
  "MOVING WEB DUMMY",
  "DODGE THE PAD",
  "FINAL COMBINATION",
  "PLAYGROUND COMPLETE",
];
export interface Target {
  id: string;
  kind: "box" | "high" | "dummy";
  position: Vec3Data;
  home: Vec3Data;
  hp: number;
  maxHp: number;
  wrap: number;
  wrappedOnce: boolean;
  released: boolean;
  flash: number;
  hits: number[];
  active: boolean;
}
export interface Attack {
  id: number;
  kind: AttackKind;
  step: ComboStep;
  age: number;
  duration: number;
  fired: boolean;
  direction: Vec3Data;
}
export interface Shot {
  id: number;
  step: ComboStep;
  position: Vec3Data;
  velocity: Vec3Data;
  life: number;
  hit: string[];
}
export interface CombatEvent {
  id: number;
  kind:
    | "swing"
    | "hit"
    | "break"
    | "wrap"
    | "release"
    | "dodge"
    | "bump"
    | "success";
  position: Vec3Data;
  power: number;
}
export interface CombatState {
  active: boolean;
  completed: boolean;
  stage: number;
  finalPart: number;
  time: number;
  serial: number;
  combo: Record<AttackKind, { step: number; last: number }>;
  attack: Attack | null;
  queued: { kind: AttackKind; step: ComboStep; expires: number } | null;
  dodge: { age: number; direction: Vec3Data } | null;
  dodgeCooldown: number;
  shots: Shot[];
  targets: Target[];
  machine: {
    phase: "idle" | "warning" | "strike" | "rest";
    age: number;
    aim: Vec3Data;
    resolved: boolean;
  };
  events: CombatEvent[];
  message: string;
  successfulDodges: number;
  bumps: number;
  history: { kind: AttackKind; step: ComboStep; id: number }[];
}
export function validCombatSave(s: unknown): s is CombatSave {
  return (
    !!s &&
    typeof s === "object" &&
    (s as CombatSave).version === 1 &&
    typeof (s as CombatSave).completed === "boolean"
  );
}
const target = (
  id: string,
  kind: Target["kind"],
  x: number,
  z: number,
  hp: number,
): Target => ({
  id,
  kind,
  position: { x, y: kind === "high" ? -14.25 : -16.3, z },
  home: { x, y: kind === "high" ? -14.25 : -16.3, z },
  hp,
  maxHp: hp,
  wrap: 0,
  wrappedOnce: false,
  released: false,
  flash: 0,
  hits: [],
  active: false,
});
export function newCombat(save?: CombatSave): CombatState {
  return {
    active: false,
    completed: save?.completed ?? false,
    stage: 0,
    finalPart: 0,
    time: 0,
    serial: 0,
    combo: {
      punch: { step: 0, last: -Infinity },
      kick: { step: 0, last: -Infinity },
      web: { step: 0, last: -Infinity },
    },
    attack: null,
    queued: null,
    dodge: null,
    dodgeCooldown: 0,
    shots: [],
    targets: [
      target("combo-box", "box", -38, -49, 80),
      target("high-pad", "high", -38, -41, 32),
      target("web-dummy", "dummy", -38, -33, 160),
      target("final-box", "box", -38, -13, 80),
      target("final-high", "high", -38, -9, 32),
      target("final-dummy", "dummy", -38, -4, 160),
    ],
    machine: {
      phase: "idle",
      age: 0,
      aim: { ...COMBAT_START },
      resolved: false,
    },
    events: [],
    message:
      "Pause → Combat Playground to begin. J / K / L / F are combat controls.",
    successfulDodges: 0,
    bumps: 0,
    history: [],
  };
}
export function beginCombat(completed = false): CombatState {
  const s = newCombat({ version: 1, completed });
  s.active = true;
  activateTargets(s);
  return s;
}
export function clearCombat(s: CombatState): void {
  s.attack = null;
  s.queued = null;
  s.dodge = null;
  s.dodgeCooldown = 0;
  s.shots = [];
  for (const k of ["punch", "kick", "web"] as const)
    s.combo[k] = { step: 0, last: -Infinity };
  for (const t of s.targets) {
    t.wrap = 0;
    t.wrappedOnce = false;
    t.released = false;
    t.flash = 0;
    if (t.kind === "dummy" && t.hp === 0) t.hp = t.maxHp;
  }
  s.machine = {
    phase: "idle",
    age: 0,
    aim: { ...COMBAT_START },
    resolved: false,
  };
  s.events = [];
}
export function retryCombat(s: CombatState): void {
  const stage = s.stage,
    completed = s.completed,
    serial = s.serial;
  Object.assign(s, beginCombat(completed));
  s.serial = serial;
  s.stage = Math.min(stage, 4);
  activateTargets(s);
}
export function combatStationStart(s: CombatState): Vec3Data {
  return {
    x: -38,
    y: -18,
    z: [-54, -46, -38, -28, -18][Math.min(s.stage, 4)]!,
  };
}
export function combatSafe(s: CombatState): boolean {
  return (
    !s.attack &&
    !s.queued &&
    !s.dodge &&
    !s.shots.length &&
    s.dodgeCooldown === 0 &&
    !s.targets.some((t) => t.wrap > 0) &&
    s.machine.phase !== "warning" &&
    s.machine.phase !== "strike"
  );
}
function emit(
  s: CombatState,
  kind: CombatEvent["kind"],
  position: Vec3Data,
  power = 1,
) {
  s.events.push({ id: ++s.serial, kind, position: { ...position }, power });
  s.events = s.events.slice(-24);
}
export function segmentBox(
  a: Vec3Data,
  b: Vec3Data,
  box: Solid,
): number | null {
  let lo = 0,
    hi = 1;
  for (const [axis, min, max] of [
    ["x", "minX", "maxX"],
    ["y", "minY", "maxY"],
    ["z", "minZ", "maxZ"],
  ] as const) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-9) {
      if (a[axis] < box[min] || a[axis] > box[max]) return null;
    } else {
      const p = (box[min] - a[axis]) / d,
        q = (box[max] - a[axis]) / d;
      lo = Math.max(lo, Math.min(p, q));
      hi = Math.min(hi, Math.max(p, q));
    }
  }
  return lo <= hi ? lo : null;
}
function visible(a: Vec3Data, b: Vec3Data, solids: readonly Solid[]): boolean {
  return !solids.some((o) => segmentBox(a, b, o) !== null);
}
function direction(m: MotionState): Vec3Data {
  return { x: Math.sin(m.facingYaw), y: 0, z: Math.cos(m.facingYaw) };
}
function aim(
  s: CombatState,
  m: MotionState,
  kind: AttackKind,
  solids: readonly Solid[],
): Vec3Data {
  const f = direction(m),
    origin = { ...m.position, y: m.position.y + 2.1 };
  let best: Target | undefined,
    score = Infinity;
  for (const t of s.targets) {
    if (!t.active || t.hp <= 0) continue;
    const dx = t.position.x - origin.x,
      dz = t.position.z - origin.z,
      d = Math.hypot(dx, dz);
    if (
      d > (kind === "web" ? 17 : 3.6) ||
      d < 0.01 ||
      (dx * f.x + dz * f.z) / d < Math.cos(Math.PI / 6) ||
      !visible(origin, t.position, solids)
    )
      continue;
    if (d < score) {
      best = t;
      score = d;
    }
  }
  if (!best) return f;
  const delta = {
      x: best.position.x - origin.x,
      y: kind === "web" ? best.position.y - origin.y : 0,
      z: best.position.z - origin.z,
    },
    n = Math.hypot(delta.x, delta.y, delta.z) || 1;
  return { x: delta.x / n, y: delta.y / n, z: delta.z / n };
}
export function comboPress(
  s: CombatState,
  kind: AttackKind,
  stampMs: number,
): ComboStep {
  const c = s.combo[kind];
  c.step =
    stampMs - c.last >= 0 && stampMs - c.last < 1000 ? (c.step % 3) + 1 : 1;
  c.last = stampMs;
  return c.step as ComboStep;
}
function launch(
  s: CombatState,
  m: MotionState,
  kind: AttackKind,
  step: ComboStep,
  solids: readonly Solid[],
) {
  const f = aim(s, m, kind, solids);
  s.attack = {
    id: ++s.serial,
    kind,
    step,
    age: 0,
    duration: step === 3 ? 0.56 : 0.36,
    fired: false,
    direction: f,
  };
  s.history.push({ kind, step, id: s.attack.id });
  s.history = s.history.slice(-60);
  s.message = COMBAT_NAMES[kind][step - 1]!;
  if (kind === "kick" && step === 1 && m.grounded) {
    m.velocity.y = 8;
    m.grounded = false;
  }
  emit(s, "swing", m.position, step);
}
export function pressAttack(
  s: CombatState,
  m: MotionState,
  kind: AttackKind,
  stampMs: number,
  solids: readonly Solid[] = [],
): boolean {
  const step = comboPress(s, kind, stampMs);
  if (s.dodge) return false;
  if (s.attack) {
    s.queued = { kind, step, expires: s.time + 0.4 };
    return true;
  }
  launch(s, m, kind, step, solids);
  return true;
}
export function pressDodge(
  s: CombatState,
  m: MotionState,
  moveX: number,
  cameraForward: Vec3Data,
): boolean {
  if (!m.grounded || s.dodgeCooldown > 0 || s.dodge) return false;
  const sign = Math.abs(moveX) > 0.2 ? Math.sign(moveX) : 0;
  const n = Math.hypot(cameraForward.x, cameraForward.z) || 1;
  const f = { x: cameraForward.x / n, y: 0, z: cameraForward.z / n };
  s.dodge = {
    age: 0,
    direction: sign
      ? { x: f.z * sign, y: 0, z: -f.x * sign }
      : { x: -Math.sin(m.facingYaw), y: 0, z: -Math.cos(m.facingYaw) },
  };
  s.dodgeCooldown = 0.95;
  s.attack = null;
  s.queued = null;
  emit(s, "dodge", m.position);
  s.message = sign ? "Side dodge!" : "Back hop!";
  return true;
}
export const protectedByDodge = (s: CombatState) =>
  !!s.dodge && s.dodge.age >= 0.04 && s.dodge.age < 0.3;
function damage(
  s: CombatState,
  t: Target,
  a: { kind: AttackKind; step: ComboStep },
  position: Vec3Data,
) {
  if (
    (t.kind === "box" && a.kind !== "punch") ||
    (t.kind === "high" && a.kind !== "kick") ||
    (t.kind === "dummy" && a.kind !== "web")
  )
    return;
  const amount =
    a.kind === "punch"
      ? [18, 22, 44][a.step - 1]!
      : a.kind === "kick"
        ? [34, 38, 52][a.step - 1]!
        : [18, 22, 36][a.step - 1]!;
  // Practice combo boxes wait for a finisher; dummies retain a soft core so
  // their wrap can always expire, even after repeated shots or a pause.
  const floor =
    t.kind === "dummy" || (t.kind === "box" && a.step !== 3) ? 1 : 0;
  const before = t.hp;
  t.hp = Math.max(floor, t.hp - amount);
  t.flash = 0.25;
  if (!t.hits.includes(a.step)) t.hits.push(a.step);
  emit(s, t.hp === 0 ? "break" : "hit", position, a.step);
  if (a.kind === "web" && t.kind === "dummy") {
    t.wrap = 2.2 + a.step * 0.2;
    t.wrappedOnce = true;
    t.released = false;
    emit(s, "wrap", t.position, a.step);
  }
  s.message = `${COMBAT_NAMES[a.kind][a.step - 1]} −${before - t.hp} · ${t.hp}/${t.maxHp}${floor === 1 && t.hp === 1 ? " · practice core ready" : ""}`;
}
function activateTargets(s: CombatState) {
  for (const t of s.targets)
    t.active =
      (s.stage === 0 && t.id === "combo-box") ||
      (s.stage === 1 && t.id === "high-pad") ||
      (s.stage === 2 && t.id === "web-dummy") ||
      (s.stage === 4 &&
        t.id === ["final-box", "final-high", "final-dummy"][s.finalPart]);
}
function advance(s: CombatState) {
  if (s.attack || s.queued) return;
  const t = s.targets.find((x) => x.active);
  let done = false;
  if (t?.kind === "box") done = t.hp === 0 && t.hits.includes(3);
  if (t?.kind === "high") done = t.hp === 0;
  if (t?.kind === "dummy") done = t.hits.length === 3 && t.released;
  if (!done) return;
  if (s.stage === 4 && s.finalPart < 3) s.finalPart++;
  else s.stage++;
  clearCombat(s);
  activateTargets(s);
  s.message = "Nice work! Follow the next colored mat.";
  emit(s, "success", t!.position);
}
export function stepCombat(
  s: CombatState,
  m: MotionState,
  dt: number,
  solids: readonly Solid[],
): void {
  dt = Math.max(0, Math.min(0.05, dt));
  s.time += dt;
  s.dodgeCooldown = Math.max(0, s.dodgeCooldown - dt);
  if (s.dodge) {
    s.dodge.age += dt;
    if (s.dodge.age < 0.32) {
      const p = {
        ...m.position,
        x: m.position.x + s.dodge.direction.x * 9 * dt,
        z: m.position.z + s.dodge.direction.z * 9 * dt,
      };
      if (bodyClear(p, solids)) m.position = p;
      m.velocity.x = 0;
      m.velocity.z = 0;
    }
    if (s.dodge.age >= 0.48) s.dodge = null;
  }
  for (const t of s.targets) {
    t.flash = Math.max(0, t.flash - dt);
    if (t.wrap > 0) {
      t.wrap = Math.max(0, t.wrap - dt);
      if (t.wrap === 0 && t.wrappedOnce) {
        t.released = true;
        emit(s, "release", t.position);
      }
    } else if (t.kind === "dummy" && t.active) {
      t.position.x = t.home.x + Math.sin(s.time * 1.25) * 1.25;
    }
  }
  const a = s.attack;
  if (a) {
    a.age += dt;
    if (!a.fired && a.age >= 0.14) {
      a.fired = true;
      const origin = {
        x: m.position.x + a.direction.x * 0.55,
        y: m.position.y + 2.1,
        z: m.position.z + a.direction.z * 0.55,
      };
      if (a.kind === "web") {
        s.shots.push({
          id: a.id,
          step: a.step,
          position: origin,
          velocity: {
            x: a.direction.x * 19,
            y: a.direction.y * 19,
            z: a.direction.z * 19,
          },
          life: 1.3,
          hit: [],
        });
      } else
        for (const t of s.targets) {
          const dx = t.position.x - m.position.x,
            dz = t.position.z - m.position.z,
            d = Math.hypot(dx, dz),
            height = Math.abs(
              t.position.y - (m.position.y + (a.kind === "kick" ? 1.7 : 2.1)),
            );
          if (
            t.active &&
            t.hp > 0 &&
            d <= 3.5 &&
            (d < 0.1 || (dx * a.direction.x + dz * a.direction.z) / d > 0.55) &&
            height < (a.kind === "kick" ? 1.65 : 1.1) &&
            visible(origin, t.position, solids) &&
            (t.kind !== "high" || a.kind === "kick")
          )
            damage(s, t, a, t.position);
        }
    }
    if (a.age >= a.duration) s.attack = null;
  }
  for (const p of s.shots) {
    const to = {
      x: p.position.x + p.velocity.x * dt,
      y: p.position.y + p.velocity.y * dt,
      z: p.position.z + p.velocity.z * dt,
    };
    let closest = 1,
      hit: Target | undefined;
    for (const b of solids) {
      const d = segmentBox(p.position, to, b);
      if (d !== null) closest = Math.min(closest, d);
    }
    for (const t of s.targets) {
      if (!t.active || t.hp <= 0 || p.hit.includes(t.id)) continue;
      const radius = 0.8,
        b: Solid = {
          id: t.id,
          minX: t.position.x - radius,
          maxX: t.position.x + radius,
          minY: t.position.y - 1,
          maxY: t.position.y + 1,
          minZ: t.position.z - radius,
          maxZ: t.position.z + radius,
        },
        d = segmentBox(p.position, to, b);
      if (d !== null && d < closest) {
        closest = d;
        hit = t;
      }
    }
    if (hit) {
      damage(s, hit, { kind: "web", step: p.step }, hit.position);
      p.hit.push(hit.id);
    }
    p.position = to;
    p.life -= dt;
    if (closest < 1) p.life = 0;
  }
  s.shots = s.shots.filter((p) => p.life > 0);
  if (!s.attack && s.queued) {
    const q = s.queued;
    s.queued = null;
    if (q.expires >= s.time) launch(s, m, q.kind, q.step, solids);
  }
  if (s.active && s.stage < 5) {
    activateTargets(s);
    advance(s);
    const machine = s.stage === 3 || (s.stage === 4 && s.finalPart === 3),
      z = s.stage === 3 ? -23 : 1;
    if (machine) {
      const p = s.machine;
      if (
        p.phase === "idle" &&
        Math.hypot(m.position.x + 38, m.position.z - z) < 6
      ) {
        p.phase = "warning";
        p.age = 0;
        p.aim = { ...m.position };
        p.resolved = false;
        s.message = "Amber warning! Dodge when the pad turns pink.";
      } else if (p.phase !== "idle") {
        p.age += dt;
        if (p.phase === "warning" && p.age >= 1.3) {
          p.phase = "strike";
          p.age = 0;
        }
        if (p.phase === "strike" && !p.resolved) {
          p.resolved = true;
          const inside = distance(m.position, p.aim) < 1.5;
          const avoided =
            protectedByDodge(s) || (!inside && s.dodgeCooldown > 0);
          if (avoided) {
            s.successfulDodges++;
            s.message = "Great dodge!";
            if (s.stage === 3) s.stage = 4;
            else {
              s.stage = 5;
              s.completed = true;
            }
            clearCombat(s);
            activateTargets(s);
            emit(s, "success", m.position);
          } else {
            s.bumps++;
            emit(s, "bump", m.position);
            s.message =
              "Soft bump. Try again: dodge at the end of the amber warning.";
          }
        }
        if (p.phase === "strike" && p.age >= 0.3) {
          p.phase = "rest";
          p.age = 0;
        }
        if (p.phase === "rest" && p.age >= 1.0) {
          p.phase = "idle";
          p.age = 0;
        }
      }
    }
  }
}
export function combatLabel(s: CombatState): string {
  if (s.stage === 5)
    return "Course complete! Save safely, replay, or return to traversal.";
  if (s.stage === 0)
    return "Punch the orange box. Tap J / X / □ quickly for 1 → 2 → HAYMAKER.";
  if (s.stage === 1)
    return "Kick the high pad with K / Y / △. First kick jumps automatically.";
  if (s.stage === 2)
    return "Use all 3 web shots: L / D-pad Up. Watch damage, wrap, then release.";
  if (s.stage === 3)
    return "Dodge the training pad: F / B / ○ + left/right, or neutral for back hop.";
  return [
    "Final: punch combination box",
    "Final: jump-kick high pad",
    "Final: all three web variations, then automatic unwrap",
    "Final: dodge the warning pad",
  ][s.finalPart]!;
}
