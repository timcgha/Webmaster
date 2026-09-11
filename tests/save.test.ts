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
  });

  it("preserves the active generation when inactive generation writing fails", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "manual", payload(1, "Easy", 10));
    storage.failSetAt = storage.setCalls + 1;
    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(store.read(1, "manual").payload).toMatchObject({ difficulty: "Easy", updatedAt: 10 });
  });

  it("preserves the active pointer when pointer advance fails after verified readback", () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.write(1, "manual", payload(1, "Easy", 10));
    storage.failSetAt = storage.setCalls + 2;
    expect(store.write(1, "manual", payload(1, "Hard", 20))).toMatchObject({ ok: false });
    expect(storage.getItem(saveStorageKeyForTests(1, "manual", "pointer"))).toBe("a");
    expect(store.read(1, "manual").payload).toMatchObject({ difficulty: "Easy" });
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
    storage.failRemoveAt = storage.removeCalls + 1;
    expect(store.replaceWithNewCheckpoint(1, payload(1, "Easy", 200)).ok).toBe(false);
    expect(store.read(1, "manual").payload).toMatchObject({ difficulty: "Hard", updatedAt: 100 });
    expect(store.read(1, "checkpoint").payload).toMatchObject({ difficulty: "Hard", updatedAt: 100 });
  });
});
