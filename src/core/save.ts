import type { RunSavePayload, SaveKind, SlotId } from "./types";

export const SAVE_VERSION = 1 as const;
const PREFIX = "webmaster.save.v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveEnvelope {
  format: "webmaster-save";
  schemaVersion: 1;
  generation: number;
  checksum: string;
  payload: RunSavePayload;
}

export type ReadStatus = "loaded" | "recovered" | "empty" | "corrupt" | "incompatible" | "unavailable";

export interface ReadResult {
  status: ReadStatus;
  payload?: RunSavePayload;
  message: string;
  generation?: "a" | "b";
}

export interface WriteResult {
  ok: boolean;
  message: string;
  committedGeneration?: "a" | "b";
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function envelopeChecksum(generation: number, payload: RunSavePayload): string {
  return fnv1a(`${generation}:${JSON.stringify(payload)}`);
}

function baseKey(slot: SlotId, kind: SaveKind): string {
  return `${PREFIX}.slot${slot}.${kind}`;
}

function isPayload(value: unknown): value is RunSavePayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RunSavePayload>;
  return (
    item.schemaVersion === SAVE_VERSION &&
    (item.slot === 1 || item.slot === 2 || item.slot === 3) &&
    (item.difficulty === "Easy" || item.difficulty === "Normal" || item.difficulty === "Hard") &&
    typeof item.health === "number" &&
    typeof item.maxHealth === "number" &&
    typeof item.progress === "number" &&
    typeof item.progressLabel === "string" &&
    item.costumeId === "skyline-teal" &&
    typeof item.completion === "boolean" &&
    typeof item.updatedAt === "number" &&
    isVec(item.position) &&
    isVec(item.checkpoint)
  );
}

function isVec(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return [point.x, point.y, point.z].every((part) => typeof part === "number" && Number.isFinite(part));
}

function decode(raw: string | null): { envelope?: SaveEnvelope; status: "valid" | "empty" | "corrupt" | "incompatible" } {
  if (raw === null) return { status: "empty" };
  try {
    const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;
    if (parsed.format !== "webmaster-save" || parsed.schemaVersion !== SAVE_VERSION) return { status: "incompatible" };
    if (!Number.isInteger(parsed.generation) || !isPayload(parsed.payload)) return { status: "corrupt" };
    const expected = envelopeChecksum(parsed.generation as number, parsed.payload);
    if (parsed.checksum !== expected) return { status: "corrupt" };
    return { status: "valid", envelope: parsed as SaveEnvelope };
  } catch {
    return { status: "corrupt" };
  }
}

export class SaveStore {
  constructor(private readonly storage: StorageLike) {}

  read(slot: SlotId, kind: SaveKind): ReadResult {
    const base = baseKey(slot, kind);
    let pointer: string | null;
    let rawA: string | null;
    let rawB: string | null;
    try {
      pointer = this.storage.getItem(`${base}.pointer`);
      rawA = this.storage.getItem(`${base}.a`);
      rawB = this.storage.getItem(`${base}.b`);
    } catch {
      return { status: "unavailable", message: "Local storage is unavailable in this browser context." };
    }
    const decoded = { a: decode(rawA), b: decode(rawB) };
    const active = pointer === "a" || pointer === "b" ? pointer : null;
    if (active && decoded[active].status === "valid") {
      return {
        status: "loaded",
        payload: structuredClone(decoded[active].envelope!.payload),
        generation: active,
        message: `${kind === "manual" ? "Manual save" : "Checkpoint"} ready.`,
      };
    }
    const fallback = active === "a" ? "b" : active === "b" ? "a" : decoded.a.status === "valid" ? "a" : "b";
    if (decoded[fallback].status === "valid") {
      return {
        status: "recovered",
        payload: structuredClone(decoded[fallback].envelope!.payload),
        generation: fallback,
        message: "Recovered the previous valid save generation.",
      };
    }
    const statuses = [decoded.a.status, decoded.b.status];
    if (statuses.every((status) => status === "empty")) return { status: "empty", message: "Empty" };
    if (statuses.includes("incompatible")) {
      return { status: "incompatible", message: "This save was created by an incompatible version." };
    }
    return { status: "corrupt", message: "This save is damaged. The other slots are unchanged." };
  }

  write(slot: SlotId, kind: SaveKind, payload: RunSavePayload): WriteResult {
    const base = baseKey(slot, kind);
    let active: "a" | "b" | null = null;
    let nextGeneration = 1;
    try {
      const pointer = this.storage.getItem(`${base}.pointer`);
      active = pointer === "a" || pointer === "b" ? pointer : null;
      if (active) {
        const current = decode(this.storage.getItem(`${base}.${active}`));
        if (current.envelope) nextGeneration = current.envelope.generation + 1;
      }
      const inactive: "a" | "b" = active === "a" ? "b" : "a";
      const normalized = structuredClone({ ...payload, slot, schemaVersion: SAVE_VERSION });
      const envelope: SaveEnvelope = {
        format: "webmaster-save",
        schemaVersion: SAVE_VERSION,
        generation: nextGeneration,
        checksum: envelopeChecksum(nextGeneration, normalized),
        payload: normalized,
      };
      const serialized = JSON.stringify(envelope);
      this.storage.setItem(`${base}.${inactive}`, serialized);
      const readback = this.storage.getItem(`${base}.${inactive}`);
      const verified = decode(readback);
      if (verified.status !== "valid" || JSON.stringify(verified.envelope) !== serialized) {
        return { ok: false, message: "Save verification failed. Your previous save is still active." };
      }
      this.storage.setItem(`${base}.pointer`, inactive);
      if (this.storage.getItem(`${base}.pointer`) !== inactive) {
        return { ok: false, message: "Save commit failed. Your previous save is still active." };
      }
      return { ok: true, committedGeneration: inactive, message: "Save confirmed." };
    } catch {
      return { ok: false, message: "Saving is unavailable. Your previous save was preserved." };
    }
  }

  newest(): { slot: SlotId; kind: SaveKind; payload: RunSavePayload } | null {
    const candidates: Array<{ slot: SlotId; kind: SaveKind; payload: RunSavePayload }> = [];
    for (const slot of [1, 2, 3] as const) {
      for (const kind of ["manual", "checkpoint"] as const) {
        const result = this.read(slot, kind);
        if (result.payload) candidates.push({ slot, kind, payload: result.payload });
      }
    }
    return candidates.sort((a, b) => b.payload.updatedAt - a.payload.updatedAt)[0] ?? null;
  }

  clearSlot(slot: SlotId): WriteResult {
    try {
      for (const kind of ["manual", "checkpoint"] as const) {
        const base = baseKey(slot, kind);
        for (const suffix of ["a", "b", "pointer"]) this.storage.removeItem(`${base}.${suffix}`);
      }
      return { ok: true, message: `Slot ${slot} cleared.` };
    } catch {
      return { ok: false, message: "Could not replace this slot. Existing data was preserved." };
    }
  }

  replaceWithNewCheckpoint(slot: SlotId, payload: RunSavePayload): WriteResult {
    const keys = ["manual.a", "manual.b", "manual.pointer", "checkpoint.a", "checkpoint.b", "checkpoint.pointer"].map(
      (suffix) => `${PREFIX}.slot${slot}.${suffix}`,
    );
    const previous = new Map<string, string | null>();
    try {
      for (const key of keys) previous.set(key, this.storage.getItem(key));
      const checkpoint = this.write(slot, "checkpoint", payload);
      if (!checkpoint.ok) throw new Error(checkpoint.message);
      for (const suffix of ["a", "b", "pointer"]) this.storage.removeItem(`${baseKey(slot, "manual")}.${suffix}`);
      return checkpoint.committedGeneration
        ? { ok: true, committedGeneration: checkpoint.committedGeneration, message: `New game committed to slot ${slot}.` }
        : { ok: true, message: `New game committed to slot ${slot}.` };
    } catch {
      try {
        for (const [key, value] of previous) {
          if (value === null) this.storage.removeItem(key);
          else this.storage.setItem(key, value);
        }
      } catch {
        return { ok: false, message: "Storage failed during replacement. Stop using this slot and reload before trying again." };
      }
      return { ok: false, message: "Could not replace this slot. Existing data was restored." };
    }
  }

  inspectSlot(slot: SlotId): { manual: ReadResult; checkpoint: ReadResult } {
    return { manual: this.read(slot, "manual"), checkpoint: this.read(slot, "checkpoint") };
  }
}

export const saveStorageKeyForTests = (slot: SlotId, kind: SaveKind, suffix: "a" | "b" | "pointer"): string =>
  `${baseKey(slot, kind)}.${suffix}`;
