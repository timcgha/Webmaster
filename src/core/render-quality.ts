/** One sample per active, visible gameplay second. Scale 1 is full resolution. */
export interface RenderQuality { scale: number; slow: number; fast: number }
export const newRenderQuality = (): RenderQuality => ({ scale: 1, slow: 0, fast: 0 });
export function sampleRenderQuality(state: RenderQuality, fps: number): RenderQuality {
  if (!Number.isFinite(fps) || fps <= 0) return { ...state, slow: 0, fast: 0 };
  const slow = fps < 30 ? state.slow + 1 : 0;
  const fast = fps >= 55 ? state.fast + 1 : 0;
  if (slow >= 2) return { scale: Math.min(2.25, Math.round((state.scale + .2) * 100) / 100), slow: 0, fast: 0 };
  if (fast >= 5) return { scale: Math.max(1, Math.round((state.scale - .1) * 100) / 100), slow: 0, fast: 0 };
  return { ...state, slow, fast };
}
