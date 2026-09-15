import type { MotionState, Vec3Data } from "./types";
import type { SwingState } from "./swing";
export const HERO_PRESENTATION = Object.freeze({
  red: "#df4052",
  blue: "#2456bd",
  eyeY: 3.12,
  eyeAngle: Math.PI / 4,
  web: "#f4cfd7",
  capsuleRadius: 0.48,
  capsuleHeight: 3.4,
});
/** Original cylindrical lattice: six meridians, five gently scalloped rings. One line system per region. */
export function bodyWebLines(
  height: number,
  radiusAt: (y: number) => number,
): Vec3Data[][] {
  const lines: Vec3Data[][] = [];
  for (let meridian = 0; meridian < 6; meridian++) {
    const angle = (meridian * Math.PI) / 3;
    lines.push(
      Array.from({ length: 17 }, (_, i) => {
        const y = -height / 2 + (height * i) / 16,
          r = radiusAt(y) + 0.008;
        return { x: Math.sin(angle) * r, y, z: Math.cos(angle) * r };
      }),
    );
  }
  for (let ring = 1; ring <= 5; ring++) {
    const base = -height / 2 + (height * ring) / 6;
    lines.push(
      Array.from({ length: 49 }, (_, i) => {
        const angle = (i * Math.PI) / 24,
          y = base + 0.035 * Math.sin(angle * 6),
          r = radiusAt(y) + 0.01;
        return { x: Math.sin(angle) * r, y, z: Math.cos(angle) * r };
      }),
    );
  }
  return lines;
}
export interface LegPose {
  blend: number;
  angle: number;
  phase: number;
}
export const newLegPose = (): LegPose => ({ blend: 0, angle: 0, phase: 0 });

export const HERO_RIG = Object.freeze({
  hipHeight: 1.46, hipSeparation: 0.44, upperLeg: 0.66, lowerLeg: 0.66,
  hipJointRadius: 0.18, kneeJointRadius: 0.16,
  pelvisBottom: 1.28, pelvisTop: 1.72, torsoBottom: 1.54, torsoTop: 2.64,
  headBottom: 2.60, headTop: 3.38,
});
export interface GaitPose {
  phase: number; weight: number; hips: [number, number]; knees: [number, number];
  arms: [number, number]; lift: number;
}
export const newGait = (): GaitPose => ({ phase: 0, weight: 0, hips: [0,0], knees: [0,0], arms: [0,0], lift: 0 });
/** Distance-driven stance: the planted foot travels backwards at walking speed.
 * Swing knees lift for clearance; exponential blending removes attach/stop snaps.
 * These values only drive child transforms, never gameplay position/collision. */
export function gaitPose(previous: GaitPose, speed: number, mode: "ground" | "air" | "climb", swing: LegPose, dt: number): GaitPose {
  const elapsed = Math.max(0, Math.min(dt, 0.1)), blend = 1 - Math.exp(-elapsed * 12);
  const moving = mode !== "air" && speed > 0.08;
  const weight = previous.weight + ((moving ? 1 : 0) - previous.weight) * blend;
  const amplitude = mode === "climb" ? 0.38 : Math.min(0.75, 0.38 + speed * 0.045);
  const stride = 4 * (HERO_RIG.upperLeg + HERO_RIG.lowerLeg) * Math.sin(amplitude);
  const phase = (previous.phase + (moving ? speed * elapsed / stride : 0)) % 1;
  const hips: [number, number] = [0,0], knees: [number, number] = [0,0];
  for (const i of [0,1] as const) {
    const p = (phase + i * 0.5) % 1;
    const planted = p < 0.5;
    const angle = planted ? Math.asin(Math.sin(amplitude) * (p * 4 - 1)) : amplitude * Math.cos((p - 0.5) * 2 * Math.PI);
    const knee = planted ? 0 : 0.7 * Math.sin((p - 0.5) * 2 * Math.PI);
    const target = (angle - knee * 0.35) * weight * (1 - swing.blend) - swing.angle * swing.blend;
    hips[i] = previous.hips[i] + (target - previous.hips[i]) * blend;
    knees[i] = previous.knees[i] + (knee * weight * (1 - swing.blend) - previous.knees[i]) * blend;
  }
  const stance = phase < 0.5 ? hips[0] : hips[1];
  const desiredLift = mode === "ground" ? -(1 - Math.cos(stance)) * 1.32 * weight * (1 - swing.blend) : 0;
  return { phase, weight, hips, knees, arms: [-hips[0] * 0.65, -hips[1] * 0.65],
    lift: previous.lift + (desiredLift - previous.lift) * blend };
}
/** No clock-driven kick cycle: pose follows rope angle and signed travel velocity. */
export function swingLegPose(
  previous: LegPose,
  m: MotionState,
  s: SwingState,
  dt: number,
): LegPose {
  const rate = 1 - Math.exp(-Math.max(0, dt) * 8),
    blend = previous.blend + ((s.web ? 1 : 0) - previous.blend) * rate;
  const travel =
    m.velocity.x * Math.sin(m.facingYaw) + m.velocity.z * Math.cos(m.facingYaw);
  const radial = s.web
    ? ((m.position.x - s.web.anchor.x) * Math.sin(m.facingYaw) +
        (m.position.z - s.web.anchor.z) * Math.cos(m.facingYaw)) /
      Math.max(2, s.web.length)
    : 0;
  const phase = Math.max(-1, Math.min(1, radial));
  const desired = s.web
    ? Math.max(
        -0.65,
        Math.min(0.65, -travel * 0.02 + phase * 1.3 + m.velocity.y * 0.018),
      )
    : 0;
  return {
    blend,
    phase,
    angle: previous.angle + (desired - previous.angle) * rate,
  };
}
