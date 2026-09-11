import type { Difficulty, RunSavePayload, SlotId } from "../src/core/types";
import type { StorageLike } from "../src/core/save";

export function payload(slot: SlotId = 1, difficulty: Difficulty = "Normal", updatedAt = 1): RunSavePayload {
  return {
    schemaVersion: 1,
    slot,
    difficulty,
    health: 75,
    maxHealth: 100,
    position: { x: 2, y: 0, z: 4 },
    checkpoint: { x: 0, y: 0, z: 1 },
    progress: 1,
    progressLabel: "Reach the golden sun pad",
    costumeId: "skyline-teal",
    completion: false,
    updatedAt,
  };
}

export class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failGet = false;
  failGetAt = Number.POSITIVE_INFINITY;
  failSetAt = Number.POSITIVE_INFINITY;
  failSetKeyOnce: string | null = null;
  failRemoveKeyOnce: string | null = null;
  armGetFailureAfterSetFor: string | null = null;
  private failNextGetFor: string | null = null;
  getCalls = 0;
  failRemoveAt = Number.POSITIVE_INFINITY;
  setCalls = 0;
  removeCalls = 0;

  getItem(key: string): string | null {
    this.getCalls += 1;
    if (this.failGet) throw new Error("get unavailable");
    if (this.getCalls === this.failGetAt || this.failNextGetFor === key) {
      this.failNextGetFor = null;
      throw new Error("injected get failure");
    }
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.setCalls === this.failSetAt || this.failSetKeyOnce === key) {
      if (this.failSetKeyOnce === key) this.failSetKeyOnce = null;
      throw new Error("injected set failure");
    }
    this.values.set(key, value);
    if (this.armGetFailureAfterSetFor === key) {
      this.armGetFailureAfterSetFor = null;
      this.failNextGetFor = key;
    }
  }

  removeItem(key: string): void {
    this.removeCalls += 1;
    if (this.removeCalls === this.failRemoveAt || this.failRemoveKeyOnce === key) {
      if (this.failRemoveKeyOnce === key) this.failRemoveKeyOnce = null;
      throw new Error("injected remove failure");
    }
    this.values.delete(key);
  }
}
