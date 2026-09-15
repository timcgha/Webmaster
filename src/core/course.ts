import { ANCHORS, ROOFS } from "./skyline";
import { TRAINING_ANCHOR, TRAINING_SOLIDS, type Surface } from "./traversal";
import { distance, HERO_HEIGHT, HERO_RADIUS, type Anchor, type Solid, type SwingState } from "./swing";
import type { MotionState, Vec3Data } from "./types";

// S4 adds fourteen short, forgiving gaps after the five accepted skyline rings.
// The south training ring is the first of twenty: start on its far roof and head north.
export const COURSE_NODES: readonly Vec3Data[] = [
  [35, 166], [67, 166], [99, 166], [131, 166], [131, 134],
  [131, 102], [131, 70], [131, 38], [131, 6], [131, -26],
  [131, -58], [99, -58], [67, -58], [67, -26], [67, 6],
].map(([x, z]) => ({ x: x!, y: 1, z: z! }));
export const COURSE_ROOFS: readonly Solid[] = COURSE_NODES.slice(1).map((p, i) => ({
  id: `course-roof-${i + 1}`, minX: p.x - 10, maxX: p.x + 10,
  minZ: p.z - 10, maxZ: p.z + 10, minY: -18, maxY: p.y,
}));
export const EXTRA_ANCHORS: readonly Anchor[] = COURSE_NODES.slice(1).map((p, i) => ({
  id: `ring-${i + 6}`, position: { x: COURSE_NODES[i]!.x + (p.x - COURSE_NODES[i]!.x) * 0.375,
    y: 24, z: COURSE_NODES[i]!.z + (p.z - COURSE_NODES[i]!.z) * 0.375 }, eligible: true, visible: true,
}));
export const COURSE_ANCHORS = [TRAINING_ANCHOR, ...ANCHORS, ...EXTRA_ANCHORS] as const;
export const COURSE_START = { x: 0, y: 0, z: -42 };
export const COURSE_FINISH = COURSE_NODES.at(-1)!;
export const STREET: Solid = {
  id: "recovery-street", minX: -48, maxX: 158, minZ: -90, maxZ: 198,
  minY: -20, maxY: -18,
};
export const RECOVERY_WALLS: readonly Surface[] = [
  ...ROOFS, TRAINING_SOLIDS[1]!, ...COURSE_ROOFS,
].map((roof) => ({ ...roof, role: "CLIMBABLE_WALL", normal: { x: 0, y: 0, z: 1 }, topOut: true }));

export interface CourseSave { version: 1; next: number; completed: boolean }
export interface CourseState extends CourseSave {
  active: boolean; valid: boolean; released: boolean; completions: number;
}
export const newCourse = (save?: CourseSave): CourseState => ({
  version: 1, next: save?.completed ? 20 : Math.min(save?.next ?? 0, 19),
  completed: save?.completed ?? false, active: !!save, valid: true,
  released: true, completions: 0,
});
export function validCourseSave(value: unknown): value is CourseSave {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<CourseSave>;
  return s.version === 1 && Number.isInteger(s.next) && s.next! >= 0 && s.next! <= 20 &&
    typeof s.completed === "boolean" && (!s.completed || s.next === 20);
}
export function advanceCourse(
  route: CourseState, before: MotionState, m: MotionState, oldWeb: SwingState, web: SwingState,
): CourseState {
  const s = { ...route };
  if (distance(before.position, m.position) > 1.1) return { ...s, valid: false };
  if (!s.valid || s.completed) return s;
  if (!s.active && m.grounded && Math.abs(m.position.y) < 0.02 &&
    Math.abs(m.position.x) < 4 && m.position.z > -46 && m.position.z < -37) s.active = true;
  if (!s.active) return s;
  if (oldWeb.web && !web.web && web.releases > oldWeb.releases && !m.grounded) s.released = true;
  if (web.web && web.web.anchorId !== oldWeb.web?.anchorId && !m.grounded && s.released &&
    web.web.anchorId === COURSE_ANCHORS[s.next]?.id) {
    s.next++; s.released = false;
  }
  if (s.next === 20 && s.released && m.grounded && Math.abs(m.position.y - 1) < 0.02 &&
    Math.hypot(m.position.x - COURSE_FINISH.x, m.position.z - COURSE_FINISH.z) < 5) {
    s.completed = true; s.completions++;
  }
  return s;
}
export function courseLabel(s: CourseState, street = false): string {
  if (street) return "Street recovery: follow the mint paths to a striped wall. Hold C / RB / R1 and climb up onto its roof.";
  if (s.completed) return "20-ring course complete! Save, explore the street, or replay from Pause.";
  if (!s.active) return "20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.";
  if (s.next === 20) return "Release and land on the pink finish pad to complete the 20-ring course.";
  return `20-ring course · ${s.next}/20 · Next: ${s.next + 1}. Jump, hold your web, then release onto the next roof.`;
}

export function bodyClear(p: Vec3Data, solids: readonly Solid[]): boolean {
  return !solids.some(b => p.x + HERO_RADIUS > b.minX + 0.001 && p.x - HERO_RADIUS < b.maxX - 0.001 &&
    p.z + HERO_RADIUS > b.minZ + 0.001 && p.z - HERO_RADIUS < b.maxZ - 0.001 &&
    p.y + HERO_HEIGHT > b.minY + 0.001 && p.y < b.maxY - 0.001);
}
export function safeStaticPosition(p: Vec3Data, supports: readonly Solid[], blockers = supports): boolean {
  return [p.x, p.y, p.z].every(Number.isFinite) && bodyClear(p, blockers) && supports.some(b =>
    Math.abs(p.y - b.maxY) < 0.02 && p.x >= b.minX + HERO_RADIUS + 0.02 &&
    p.x <= b.maxX - HERO_RADIUS - 0.02 && p.z >= b.minZ + HERO_RADIUS + 0.02 && p.z <= b.maxZ - HERO_RADIUS - 0.02);
}
/** Read-only restoration: the record is never rewritten/deleted. Stable nearest safe support. */
export function restoreSafePosition(p: Vec3Data, supports: readonly Solid[], fallback: Vec3Data, blockers = supports): Vec3Data {
  if (safeStaticPosition(p, supports, blockers)) return { ...p };
  const point = [p.x, p.y, p.z].every(Number.isFinite) ? p : fallback;
  const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
  const candidates: Vec3Data[] = [{ ...fallback }];
  for (const b of supports) {
    const x = clamp(point.x, b.minX + 0.52, b.maxX - 0.52), z = clamp(point.z, b.minZ + 0.52, b.maxZ - 0.52);
    candidates.push({ x, y: b.maxY, z });
    // A newly extended building may enclose an old street position. Test nearby
    // edges on this support instead of always sending the player to a distant roof.
    for (const o of blockers) for (const [xx, zz] of [
      [o.minX - 0.52, z], [o.maxX + 0.52, z], [x, o.minZ - 0.52], [x, o.maxZ + 0.52],
    ]) candidates.push({ x: xx!, y: b.maxY, z: zz! });
  }
  return candidates.filter(c => safeStaticPosition(c, supports, blockers)).sort((a,b) =>
    distance(a, point) - distance(b, point) || a.x - b.x || a.z - b.z || a.y - b.y)[0] ?? { ...fallback };
}

/** Camera line against inflated static boxes; shortens inward immediately, never crosses a facade. */
export function cameraClearFraction(from: Vec3Data, to: Vec3Data, solids: readonly Solid[]): number {
  let nearest = 1;
  for (const b of solids) {
    let low = 0, high = 1;
    for (const axis of ["x", "y", "z"] as const) {
      const d = to[axis] - from[axis], cap = axis.toUpperCase();
      const min = (b[`min${cap}` as keyof Solid] as number) - 0.2;
      const max = (b[`max${cap}` as keyof Solid] as number) + 0.2;
      if (Math.abs(d) < 1e-8) { if (from[axis] < min || from[axis] > max) { high = -1; break; } }
      else { const a = (min - from[axis]) / d, z = (max - from[axis]) / d;
        low = Math.max(low, Math.min(a,z)); high = Math.min(high, Math.max(a,z)); }
    }
    if (low <= high && high > 0 && low > 0.001) nearest = Math.min(nearest, low);
  }
  return nearest;
}
