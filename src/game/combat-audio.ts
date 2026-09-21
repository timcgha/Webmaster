// Original procedural synthesis. No samples, network, licensed asset or telemetry.
import type { CombatEvent } from "../core/combat";
export class CombatAudio {
  private context: AudioContext | null = null;
  private enabled = true;
  private last = 0;
  reset() {
    this.last = 0;
  }
  constructor() {
    window.addEventListener("keydown", this.unlock);
    window.addEventListener("pointerdown", this.unlock);
  }
  unlock = () => {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
    } catch {
      /* Audio remains optional on unsupported browsers. */
    }
  };
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) void this.context?.suspend();
  }
  play(e: CombatEvent) {
    if (e.id <= this.last) return;
    this.last = e.id;
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const c = this.context,
      t = c.currentTime,
      osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = e.kind === "hit" || e.kind === "break" ? "triangle" : "sine";
    const hz =
      e.kind === "success"
        ? 660
        : e.kind === "wrap"
          ? 420
          : e.kind === "release"
            ? 520
            : e.kind === "dodge"
              ? 280
              : e.kind === "bump"
                ? 150
                : e.kind === "swing"
                  ? 180
                  : 110;
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(
      e.kind === "success" ? 990 : Math.max(55, hz * 0.45),
      t + 0.13,
    );
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(
      e.kind === "swing" ? 0.035 : 0.065 + e.power * 0.008,
      t + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    window.removeEventListener("keydown", this.unlock);
    window.removeEventListener("pointerdown", this.unlock);
    void this.context?.close();
  }
}
