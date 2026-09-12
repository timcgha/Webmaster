import { describe, expect, it } from "vitest";
import { SaveStore, saveStorageKeyForTests } from "../src/core/save";
import { MemoryStorage, payload } from "./helpers";

describe("SaveStore two-generation commits", () => {
  it("writes, validates, reads back, and advances alternating generations", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.write(1, "manual", payload(1, "Normal", 10))).toMatchObject({ ok: true, committedGeneration: "a" });
    expect(store.read(1, "manual")).toMatchObject({ status: "loaded", generation: "a", payload: { updatedAt: 10 } });
    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: true, committedGeneration: "b" });
    expect(store.read(1, "manual")).toMatchObject({ status: "loaded", generation: "b", payload: { difficulty: "Hard" } });
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "pending"))).toBeNull();
  });

  it("preserves the active generation when inactive generation writing fails", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "manual", payload(1, "Easy", 10));
    storage.failSetKeyOnce = saveStorageKeyForTests(1, "manual", "b");
    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(store.read(1, "manual").payload).toMatchObject({ difficulty: "Easy", updatedAt: 10 });
  });

  it("preserves the active pointer when pointer advance fails after verified readback", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "manual", payload(1, "Easy", 10));
    storage.failSetKeyOnce = saveStorageKeyForTests(1, "manual", "pointer");
    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "pointer"))).toBe("a");
    expect(store.read(1, "manual").payload).toMatchObject({ difficulty: "Easy" });
  });

  it("does not commit a new generation when pointer verification fails after the pointer write", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    const pointerKey = saveStorageKeyForTests(1, "manual", "pointer");
    expect(store.write(1, "manual", payload(1, "Easy", 10)).ok).toBe(true);
    storage.armGetFailureAfterSetFor = pointerKey;

    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(storage.getItem(pointerKey)).toBe("b");
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "pending"))).not.toBeNull();
    expect(store.read(1, "manual")).toMatchObject({
      status: "recovered",
      generation: "a",
      payload: { difficulty: "Easy", updatedAt: 10 },
    });
  });

  it("keeps the prior generation fenced if final transaction-marker cleanup fails", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    const pendingKey = saveStorageKeyForTests(1, "manual", "pending");
    expect(store.write(1, "manual", payload(1, "Easy", 10)).ok).toBe(true);
    storage.failRemoveKeyOnce = pendingKey;

    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(storage.getItem(pendingKey)).not.toBeNull();
    expect(store.read(1, "manual")).toMatchObject({
      status: "recovered",
      generation: "a",
      payload: { difficulty: "Easy", updatedAt: 10 },
    });

    expect(store.write(1, "manual", payload(1, "Hard", 30))).toMatchObject({ ok: true, committedGeneration: "b" });
    expect(storage.getItem(pendingKey)).toBeNull();
    expect(store.read(1, "manual")).toMatchObject({
      status: "loaded",
      generation: "b",
      payload: { difficulty: "Hard", updatedAt: 30 },
    });
  });

  it("does not recover first-save bytes whose pointer commit failed", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    const pointerKey = saveStorageKeyForTests(1, "manual", "pointer");
    storage.failSetKeyOnce = pointerKey;

    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "a"))).not.toBeNull();
    expect(storage.getItem(pointerKey)).toBeNull();
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "pending"))).not.toBeNull();
    const readback = store.read(1, "manual");
    expect(readback.status).toBe("empty");
    expect(readback.payload).toBeUndefined();
  });

  it("recovers the newest committed generation when the pointer is invalid", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.write(1, "manual", payload(1, "Easy", 10)).ok).toBe(true);
    expect(store.write(1, "manual", payload(1, "Hard", 20)).ok).toBe(true);
    storage.setItem(saveStorageKeyForTests(1, "manual", "pointer"), "invalid-generation");

    expect(store.read(1, "manual")).toMatchObject({
      status: "recovered",
      generation: "b",
      payload: { difficulty: "Hard", updatedAt: 20 },
    });
    storage.removeItem(saveStorageKeyForTests(1, "manual", "pointer"));
    expect(store.read(1, "manual")).toMatchObject({
      status: "recovered",
      generation: "b",
      payload: { difficulty: "Hard", updatedAt: 20 },
    });
  });

  it("refuses to load or overwrite a damaged transaction marker", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.write(1, "manual", payload(1, "Easy", 10)).ok).toBe(true);
    storage.setItem(saveStorageKeyForTests(1, "manual", "pending"), "{damaged");

    const readback = store.read(1, "manual");
    expect(readback.status).toBe("corrupt");
    expect(readback.payload).toBeUndefined();
    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "pointer"))).toBe("a");
  });

  it("recovers the prior valid generation when the active bytes are corrupt", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "checkpoint", payload(1, "Easy", 10));
    store.write(1, "checkpoint", payload(1, "Normal", 20));
    storage.setItem(saveStorageKeyForTests(1, "checkpoint", "b"), "{broken");
    expect(store.read(1, "checkpoint")).toMatchObject({
      status: "recovered",
      generation: "a",
      payload: { difficulty: "Easy" },
    });
  });

  it("labels empty, corrupt, incompatible, and unavailable records explicitly", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.read(2, "manual").status).toBe("empty");
    storage.setItem(saveStorageKeyForTests(2, "manual", "a"), "not-json");
    expect(store.read(2, "manual").status).toBe("corrupt");
    storage.setItem(saveStorageKeyForTests(3, "manual", "a"), JSON.stringify({ format: "webmaster-save", schemaVersion: 99 }));
    expect(store.read(3, "manual").status).toBe("incompatible");
    storage.failGet = true;
    expect(store.read(1, "manual").status).toBe("unavailable");
  });

  it("chooses the newest valid manual or checkpoint across all three slots", () => {
    const store = new SaveStore(new MemoryStorage());
    store.write(1, "manual", payload(1, "Easy", 100));
    store.write(2, "checkpoint", payload(2, "Hard", 300));
    store.write(3, "manual", payload(3, "Normal", 200));
    expect(store.newest()).toMatchObject({ slot: 2, kind: "checkpoint", payload: { difficulty: "Hard" } });
  });

  it("replaces an occupied slot only after a successful new checkpoint transaction", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "manual", payload(1, "Hard", 100));
    store.write(1, "checkpoint", payload(1, "Hard", 100));
    const result = store.replaceWithNewCheckpoint(1, payload(1, "Easy", 200));
    expect(result.ok).toBe(true);
    expect(store.read(1, "manual").status).toBe("empty");
    expect(store.read(1, "checkpoint").payload).toMatchObject({ difficulty: "Easy", updatedAt: 200 });
  });

  it("restores every occupied record if replacement cleanup fails", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "manual", payload(1, "Hard", 100));
    store.write(1, "checkpoint", payload(1, "Hard", 100));
    storage.failRemoveKeyOnce = saveStorageKeyForTests(1, "manual", "a");
    expect(store.replaceWithNewCheckpoint(1, payload(1, "Easy", 200)).ok).toBe(false);
    expect(store.read(1, "manual").payload).toMatchObject({ difficulty: "Hard", updatedAt: 100 });
    expect(store.read(1, "checkpoint").payload).toMatchObject({ difficulty: "Hard", updatedAt: 100 });
  });
});

describe("WM-002 additive progress compatibility",()=>{
  it("reads exact WM-001 schema records unchanged and keeps the manual record when skyline checkpoint advances",()=>{
    const storage=new MemoryStorage(),store=new SaveStore(storage);const old=payload(1,"Hard",10);
    expect(store.write(1,"manual",old).ok).toBe(true);expect(store.read(1,"manual").payload).toEqual(old);
    const upgraded={...old,updatedAt:20,skyline:{version:1 as const,checkpoint:2 as const,completed:false}};
    expect(store.write(1,"checkpoint",upgraded).ok).toBe(true);expect(store.read(1,"checkpoint").payload).toEqual(upgraded);expect(store.read(1,"manual").payload).toEqual(old);
  });
  it("rejects malformed or future skyline versions while preserving the committed record",()=>{
    const storage=new MemoryStorage(),store=new SaveStore(storage);const old=payload(1,"Easy",10);store.write(1,"manual",old);
    for(const skyline of [{version:2,checkpoint:0,completed:false},{version:1,checkpoint:9,completed:true},{version:1,checkpoint:4,completed:false}]){
      expect(store.write(1,"manual",{...old,skyline} as any).ok).toBe(false);expect(store.read(1,"manual").payload).toEqual(old);
    }
  });
});
