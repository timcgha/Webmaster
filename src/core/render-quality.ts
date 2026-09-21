/** One sample per active, visible gameplay second. Scale 1 is full resolution. */
export interface RenderQuality { scale: number; slow: number; fast: number }
export const newRenderQuality = (): RenderQuality => ({ scale: 1, slow: 0, fast: 0 });
export function sampleRenderQuality(state: RenderQuality, fps: number): RenderQuality {
  if (!Number.isFinite(fps) || fps <= 0) return { ...state, slow: 0, fast: 0 };
  // Native full-res only treats true sub-30 as stress. Near the software floor,
  // finish the climb while under 40 FPS so samples cannot stick at ~1.9 / 35.
  // Do not stress light mid-scales (1–1.8 at 30–42): that resized the canvas
  // repeatedly and starved orbit/route simulation on SwiftShader.
  const nearFloor = state.scale >= 1.8 && state.scale < 2.25;
  const stressed = fps < 30 || (nearFloor && fps < 40);
  const slow = stressed ? state.slow + 1 : 0;
  const fast = fps >= 55 ? state.fast + 1 : 0;
  if (slow >= 2) {
    // Critically slow warmup jumps toward the floor quickly; finishing steps
    // and mild dips stay smaller.
    const bump =
      fps < 22 ? 0.55 : fps < 30 ? (state.scale < 1.8 ? 0.4 : 0.25) : 0.2;
    return {
      scale: Math.min(2.25, Math.round((state.scale + bump) * 100) / 100),
      slow: 0,
      fast: 0,
    };
  }
  // Recovery used to need five ≥55s bites of only −0.1 (~minute from floor).
  // Sponsor ROG/Edge stayed soft after load spikes; climb back faster when
  // heavily scaled, still hysteresis-gated so middling 45 FPS cannot recover.
  if (fast > 0) {
    const need = state.scale >= 1.5 ? 3 : 5;
    if (fast >= need) {
      const step =
        state.scale >= 2 ? 0.45 : state.scale >= 1.5 ? 0.3 : 0.2;
      return {
        scale: Math.max(1, Math.round((state.scale - step) * 100) / 100),
        slow: 0,
        fast: 0,
      };
    }
  }
  return { ...state, slow, fast };
}
