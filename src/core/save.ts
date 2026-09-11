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

type GenerationKey = "a" | "b";

interface PendingEnvelope {
  format: "webmaster-save-pending";
  schemaVersion: 1;
  target: GenerationKey;
  targetGeneration: number;
  previous: GenerationKey | null;
  previousGeneration: number | null;
  checksum: string;
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

function pendingChecksum(
  target: GenerationKey,
  targetGeneration: number,
  previous: GenerationKey | null,
  previousGeneration: number | null,
): string {
  return fnv1a(`${target}:${targetGeneration}:${previous ?? "none"}:${previousGeneration ?? "none"}`);
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

function decodePending(
  raw: string | null,
): { envelope?: PendingEnvelope; status: "valid" | "empty" | "corrupt" | "incompatible" } {
  if (raw === null) return { status: "empty" };
  try {
    const parsed = JSON.parse(raw) as Partial<PendingEnvelope>;
    if (parsed.format !== "webmaster-save-pending" || parsed.schemaVersion !== SAVE_VERSION) {
      return { status: "incompatible" };
    }
    if (
      (parsed.target !== "a" && parsed.target !== "b") ||
      !Number.isInteger(parsed.targetGeneration) ||
      (parsed.targetGeneration as number) < 1 ||
      (parsed.previous !== null && parsed.previous !== "a" && parsed.previous !== "b") ||
      (parsed.previous === null
        ? parsed.previousGeneration !== null
        : !Number.isInteger(parsed.previousGeneration) || (parsed.previousGeneration as number) < 1) ||
      parsed.target === parsed.previous
    ) {
      return { status: "corrupt" };
    }
    const expected = pendingChecksum(
      parsed.target,
      parsed.targetGeneration as number,
      parsed.previous,
      parsed.previousGeneration as number | null,
    );
    if (parsed.checksum !== expected) return { status: "corrupt" };
    return { status: "valid", envelope: parsed as PendingEnvelope };
  } catch {
    return { status: "corrupt" };
  }
}

type DecodedGenerations = Record<GenerationKey, ReturnType<typeof decode>>;

function unreadableResult(decoded: DecodedGenerations, message?: string): ReadResult {
  const statuses = [decoded.a.status, decoded.b.status];
  if (statuses.every((status) => status === "empty")) return { status: "empty", message: message ?? "Empty" };
  if (statuses.includes("incompatible")) {
    return { status: "incompatible", message: "This save was created by an incompatible version." };
  }
  return { status: "corrupt", message: message ?? "This save is damaged. The other slots are unchanged." };
}

function newestValidGeneration(decoded: DecodedGenerations): GenerationKey | null {
  const valid = (["a", "b"] as const).filter((generation) => decoded[generation].status === "valid");
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0]!;
  const generationA = decoded.a.envelope!.generation;
  const generationB = decoded.b.envelope!.generation;
  if (generationA === generationB) return null;
  return generationA > generationB ? "a" : "b";
}

function resolveRead(
  kind: SaveKind,
  pointer: string | null,
  decoded: DecodedGenerations,
  pending: ReturnType<typeof decodePending>,
): ReadResult {
  if (pending.status === "incompatible") {
    return { status: "incompatible", message: "This save transaction was created by an incompatible version." };
  }
  if (pending.status === "corrupt") {
    return { status: "corrupt", message: "This save has a damaged transaction marker and was not loaded." };
  }
  if (pending.envelope) {
    const previous = pending.envelope.previous;
    if (previous === null) {
      const other: GenerationKey = pending.envelope.target === "a" ? "b" : "a";
      if (decoded[other].status === "empty") {
        return { status: "empty", message: "An incomplete first save was ignored." };
      }
      return unreadableResult(decoded, "An incomplete save could not be recovered safely.");
    }
    const previousRecord = decoded[previous];
    if (
      previousRecord.status === "valid" &&
      previousRecord.envelope!.generation === pending.envelope.previousGeneration
    ) {
      return {
        status: "recovered",
        payload: structuredClone(previousRecord.envelope!.payload),
        generation: previous,
        message: "Recovered the previous committed save; an incomplete save was ignored.",
      };
    }
    return unreadableResult(decoded, "The previous committed save could not be recovered safely.");
  }

  const active: GenerationKey | null = pointer === "a" || pointer === "b" ? pointer : null;
  if (active && decoded[active].status === "valid") {
    return {
      status: "loaded",
      payload: structuredClone(decoded[active].envelope!.payload),
      generation: active,
      message: `${kind === "manual" ? "Manual save" : "Checkpoint"} ready.`,
    };
  }
  const fallback = active ? (active === "a" ? "b" : "a") : newestValidGeneration(decoded);
  if (fallback && decoded[fallback].status === "valid") {
    return {
      status: "recovered",
      payload: structuredClone(decoded[fallback].envelope!.payload),
      generation: fallback,
      message: active
        ? "Recovered the previous valid save generation."
        : "Recovered the newest valid committed save generation.",
    };
  }
  return unreadableResult(decoded);
}

export class SaveStore {
  constructor(private readonly storage: StorageLike) {}

  read(slot: SlotId, kind: SaveKind): ReadResult {
    const base = baseKey(slot, kind);
    let pointer: string | null;
    let rawA: string | null;
    let rawB: string | null;
    let rawPending: string | null;
    try {
      pointer = this.storage.getItem(`${base}.pointer`);
      rawA = this.storage.getItem(`${base}.a`);
      rawB = this.storage.getItem(`${base}.b`);
      rawPending = this.storage.getItem(`${base}.pending`);
    } catch {
      return { status: "unavailable", message: "Local storage is unavailable in this browser context." };
    }
    const decoded = { a: decode(rawA), b: decode(rawB) };
    return resolveRead(kind, pointer, decoded, decodePending(rawPending));
  }

  write(slot: SlotId, kind: SaveKind, payload: RunSavePayload): WriteResult {
    const base = baseKey(slot, kind);
    try {
      const pointer = this.storage.getItem(`${base}.pointer`);
      const decoded = {
        a: decode(this.storage.getItem(`${base}.a`)),
        b: decode(this.storage.getItem(`${base}.b`)),
      };
      const pending = decodePending(this.storage.getItem(`${base}.pending`));
      const current = resolveRead(kind, pointer, decoded, pending);
      if (!current.payload && current.status !== "empty") {
        return { ok: false, message: "Saving stopped because the existing transaction could not be recovered safely." };
      }
      const active = current.generation ?? null;
      const currentGeneration = active ? decoded[active].envelope?.generation : undefined;
      if (active && !currentGeneration) {
        return { ok: false, message: "Saving stopped because the existing generation could not be verified." };
      }
      const nextGeneration = (currentGeneration ?? 0) + 1;
      const inactive: GenerationKey = active === "a" ? "b" : "a";
      const intent: PendingEnvelope = {
        format: "webmaster-save-pending",
        schemaVersion: SAVE_VERSION,
        target: inactive,
        targetGeneration: nextGeneration,
        previous: active,
        previousGeneration: currentGeneration ?? null,
        checksum: pendingChecksum(inactive, nextGeneration, active, currentGeneration ?? null),
      };
      const serializedIntent = JSON.stringify(intent);
      this.storage.setItem(`${base}.pending`, serializedIntent);
      const intentReadback = this.storage.getItem(`${base}.pending`);
      const verifiedIntent = decodePending(intentReadback);
      if (verifiedIntent.status !== "valid" || JSON.stringify(verifiedIntent.envelope) !== serializedIntent) {
        return { ok: false, message: "Save preparation failed. Your previous save is still active." };
      }
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
      this.storage.removeItem(`${base}.pending`);
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
        for (const suffix of ["a", "b", "pointer", "pending"]) this.storage.removeItem(`${base}.${suffix}`);
      }
      return { ok: true, message: `Slot ${slot} cleared.` };
    } catch {
      return { ok: false, message: "Could not replace this slot. Existing data was preserved." };
    }
  }

  replaceWithNewCheckpoint(slot: SlotId, payload: RunSavePayload): WriteResult {
    const keys = [
      "manual.a",
      "manual.b",
      "manual.pointer",
      "manual.pending",
      "checkpoint.a",
      "checkpoint.b",
      "checkpoint.pointer",
      "checkpoint.pending",
    ].map((suffix) => `${PREFIX}.slot${slot}.${suffix}`);
    const previous = new Map<string, string | null>();
    try {
      for (const key of keys) previous.set(key, this.storage.getItem(key));
      const checkpoint = this.write(slot, "checkpoint", payload);
      if (!checkpoint.ok) throw new Error(checkpoint.message);
      for (const suffix of ["a", "b", "pointer", "pending"]) {
        this.storage.removeItem(`${baseKey(slot, "manual")}.${suffix}`);
      }
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

export const saveStorageKeyForTests = (
  slot: SlotId,
  kind: SaveKind,
  suffix: "a" | "b" | "pointer" | "pending",
): string =>
  `${baseKey(slot, kind)}.${suffix}`;
