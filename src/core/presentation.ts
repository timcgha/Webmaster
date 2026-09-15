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
