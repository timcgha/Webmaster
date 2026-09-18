import { DEFAULT_SETTINGS, type GameSettings } from "./types";
import type { StorageLike } from "./save";

const SETTINGS_KEY = "webmaster.settings.v1";

export class SettingsStore {
  constructor(private readonly storage: StorageLike) {}

  read(): GameSettings {
    try {
      const raw = this.storage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const value = JSON.parse(raw) as Partial<GameSettings>;
      if (
        typeof value.cameraSensitivity !== "number" ||
        value.cameraSensitivity < 0.5 ||
        value.cameraSensitivity > 2 ||
        typeof value.invertY !== "boolean" ||
        typeof value.adaptiveQuality !== "boolean" ||
        (value.combatSound !== undefined && typeof value.combatSound !== "boolean")
      ) return { ...DEFAULT_SETTINGS };
      return { ...value } as GameSettings;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  write(settings: GameSettings): boolean {
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return this.storage.getItem(SETTINGS_KEY) === JSON.stringify(settings);
    } catch {
      return false;
    }
  }
}
