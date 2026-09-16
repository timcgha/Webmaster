import { describe, expect, it } from "vitest";
import {
  HERO_PRESENTATION,
  ceilingPresentationOffset,
} from "../src/core/presentation";

const WALL_PLAYABLE_FACE_Z = -61;
const ATTACHED_ROOT_Z = -60.505;

describe("WM004 ceiling presentation wall clearance", () => {
  it("keeps the complete pitched rig on the playable side through transition", () => {
    for (const pitch of [0, 0.15, 0.3, 0.6, 0.9, 1.2, Math.PI / 2]) {
      const offset = ceilingPresentationOffset(pitch, Math.PI);
      const farthestBodyPointTowardWall =
        ATTACHED_ROOT_Z +
        offset.z -
        Math.sin(pitch) * HERO_PRESENTATION.capsuleHeight -
        Math.cos(pitch) * 0.33;
      expect(farthestBodyPointTowardWall).toBeGreaterThan(WALL_PLAYABLE_FACE_Z);
    }
  });

  it("does not offset the ordinary upright presentation", () => {
    expect(ceilingPresentationOffset(0, Math.PI)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("moves away from whichever direction the hero faces", () => {
    const north = ceilingPresentationOffset(Math.PI / 2, Math.PI);
    const south = ceilingPresentationOffset(Math.PI / 2, 0);
    expect(north.z).toBeCloseTo(HERO_PRESENTATION.capsuleHeight);
    expect(south.z).toBeCloseTo(-HERO_PRESENTATION.capsuleHeight);
    expect(north.y).toBeCloseTo(2.6);
  });
});
