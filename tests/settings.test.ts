import { describe, expect, it } from "vitest";
import { SettingsStore } from "../src/core/settings";
import { DEFAULT_SETTINGS } from "../src/core/types";
import { MemoryStorage } from "./helpers";

describe("local settings", () => {
  it("uses safe defaults for missing or invalid data", () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
    storage.setItem("webmaster.settings.v1", JSON.stringify({ cameraSensitivity: 99, invertY: "no" }));
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
  });

  it("persists functional camera and adaptive-quality choices independently", () => {
    const store = new SettingsStore(new MemoryStorage());
    expect(store.write({ cameraSensitivity: 1.4, invertY: true, adaptiveQuality: false })).toBe(true);
    expect(store.read()).toEqual({ cameraSensitivity: 1.4, invertY: true, adaptiveQuality: false });
  });

  it("falls back without throwing when storage is unavailable", () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    expect(new SettingsStore(storage).read()).toEqual(DEFAULT_SETTINGS);
  });
});
