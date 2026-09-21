// Preview packaging only. Install before importing the frozen game entry.
import { createPreviewStorage } from "../shared/preview-storage.mjs";

export const PREFIX = "webmaster.wm004-preview.v1:";
const api = createPreviewStorage(PREFIX);
export const isolatedStorage = api.isolatedStorage;
export const installIsolatedStorage = api.installIsolatedStorage;
