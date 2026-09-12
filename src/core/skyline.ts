import { distance, type Anchor, type Solid, type SwingState } from "./swing";
import type { MotionState, Vec3Data } from "./types";
export interface SkylineSave {
  version: 1;
  checkpoint: 0 | 1 | 2 | 3 | 4;
  completed: boolean;
}
export const SKY_START: Vec3Data = { x: 0, y: 0, z: 21 };
export const ROOFS: readonly Solid[] = [
  {
    id: "practice",
    minX: -14,
    maxX: 14,
    minZ: -12,
    maxZ: 24,
    minY: -18,
    maxY: 0,
  },
  { id: "roof-1", minX: -7, maxX: 7, minZ: 38, maxZ: 58, minY: -18, maxY: 0 },
  { id: "roof-2", minX: -7, maxX: 7, minZ: 77, maxZ: 101, minY: -18, maxY: 2 },
  { id: "roof-3", minX: -7, maxX: 7, minZ: 153, maxZ: 179, minY: -18, maxY: 0 },
  {
    id: "roof-4",
    minX: 25,
    maxX: 45,
    minZ: 153,
    maxZ: 179,
    minY: -18,
    maxY: 1,
  },
];
export const FALLBACK: Solid = {
  id: "learning-catch",
  minX: -10,
  maxX: 10,
  minZ: 24,
  maxZ: 38,
  minY: -9,
  maxY: -8,
};
export const ANCHORS: readonly Anchor[] = [
  {
    id: "ring-1",
    position: { x: 0, y: 16, z: 29 },
    eligible: true,
    visible: true,
  },
  {
    id: "ring-2",
    position: { x: 0, y: 21, z: 64 },
    eligible: true,
    visible: true,
  },
  {
    id: "ring-3",
    position: { x: 0, y: 23, z: 109 },
    eligible: true,
    visible: true,
  },
  {
    id: "ring-4",
    position: { x: 0, y: 20, z: 139 },
    eligible: true,
    visible: true,
  },
  {
    id: "ring-5",
    position: { x: 10, y: 18, z: 166 },
    eligible: true,
    visible: true,
  },
];
export const CHECKPOINTS: readonly Vec3Data[] = [
  SKY_START,
  { x: 0, y: 0, z: 48 },
  { x: 0, y: 2, z: 88 },
  { x: 0, y: 0, z: 166 },
  { x: 33, y: 1, z: 166 },
];
export const ROUTE_LABELS = [
  "First gap: jump and hold the close ring, then let go.",
  "Gap 2: swing forward, then release to reach the higher roof.",
  "Long gap: release ring 3 and catch ring 4 before landing.",
  "Turn right: aim at the final ring and swing to the finish.",
  "Skyline route complete! Save here or replay from Pause.",
];
export interface SkylineState {
  active: boolean;
  stage: 0 | 1 | 2 | 3 | 4;
  completed: boolean;
  completions: number;
  anchors: string[];
  released: boolean;
  reattached: boolean;
  leftRoof: boolean;
  lastAnchor: string | null;
  valid: boolean;
}
export const newSkyline = (): SkylineState => ({
  active: false,
  stage: 0,
  completed: false,
  completions: 0,
  anchors: [],
  released: false,
  reattached: false,
  leftRoof: false,
  lastAnchor: null,
  valid: true,
});
export function resetSegment(route: SkylineState): SkylineState {
  return {
    ...route,
    anchors: [],
    released: false,
    reattached: false,
    leftRoof: false,
    lastAnchor: null,
  };
}
export function onRoof(m: MotionState, index: number): boolean {
  const r = ROOFS[index]!;
  return (
    m.grounded &&
    Math.abs(m.position.y - r.maxY) < 0.03 &&
    m.position.x > r.minX + 0.6 &&
    m.position.x < r.maxX - 0.6 &&
    m.position.z > r.minZ + 0.6 &&
    m.position.z < r.maxZ - 0.6
  );
}
export function advanceSkyline(
  route: SkylineState,
  previous: MotionState,
  m: MotionState,
  before: SwingState,
  after: SwingState,
): { route: SkylineState; changed: boolean } {
  let r = { ...route, anchors: [...route.anchors] };
  // No fixture teleport, drop through a finish, load or recovery can award a stage.
  if (distance(previous.position, m.position) > 1.1)
    return { route: { ...resetSegment(r), valid: false }, changed: false };
  if (!r.valid) return { route: r, changed: false };
  if (!r.active) {
    if (
      m.grounded &&
      m.position.z >= 20 &&
      m.position.z <= 23 &&
      Math.abs(m.position.x) < 4
    ) {
      r.active = true;
      return { route: r, changed: true };
    }
    return { route: r, changed: false };
  }
  if (r.stage === 4) return { route: r, changed: false };
  if (!m.grounded) r.leftRoof = true;
  if (after.web && after.web.anchorId !== before.web?.anchorId) {
    if (
      r.lastAnchor &&
      r.lastAnchor !== after.web.anchorId &&
      !m.grounded &&
      r.released
    )
      r.reattached = true;
    r.lastAnchor = after.web.anchorId;
    if (!r.anchors.includes(after.web.anchorId))
      r.anchors.push(after.web.anchorId);
  }
  if (
    before.web &&
    !after.web &&
    after.releases > before.releases &&
    !m.grounded
  )
    r.released = true;
  const required = [["ring-1"], ["ring-2"], ["ring-3", "ring-4"], ["ring-5"]][
    r.stage
  ]!;
  if (
    r.leftRoof &&
    r.released &&
    required.every((a) => r.anchors.includes(a)) &&
    (r.stage !== 2 || r.reattached) &&
    onRoof(m, r.stage + 1)
  ) {
    r = resetSegment({ ...r, stage: (r.stage + 1) as SkylineState["stage"] });
    if (r.stage === 4) {
      r.completed = true;
      r.completions++;
    }
    return { route: r, changed: true };
  }
  return { route: r, changed: false };
}
export function validSkylineSave(value: unknown): value is SkylineSave {
  if (!value || typeof value !== "object") return false;
  const x = value as Partial<SkylineSave>;
  return (
    x.version === 1 &&
    Number.isInteger(x.checkpoint) &&
    x.checkpoint! >= 0 &&
    x.checkpoint! <= 4 &&
    typeof x.completed === "boolean" &&
    (x.checkpoint !== 4 || x.completed)
  );
}

/** Restore a manual position only on its earned safe roof, otherwise use its checkpoint. */
export function restoreSkylinePosition(
  position: Vec3Data,
  stage: SkylineSave["checkpoint"],
): Vec3Data {
  const roof = ROOFS[stage]!;
  if (
    [position.x, position.y, position.z].every(Number.isFinite) &&
    Math.abs(position.y - roof.maxY) < 0.01 &&
    position.x > roof.minX + 0.6 &&
    position.x < roof.maxX - 0.6 &&
    position.z > roof.minZ + 0.6 &&
    position.z < roof.maxZ - 0.6
  )
    return { ...position };
  return { ...CHECKPOINTS[stage]! };
}
