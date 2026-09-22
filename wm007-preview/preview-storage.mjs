// Preview packaging only. Install before importing the frozen game entry.
import { createPreviewStorage } from "./preview-storage-shared.mjs";

export const PREFIX = "webmaster.wm007-preview.v1:";
const api = createPreviewStorage(PREFIX);
export const isolatedStorage = api.isolatedStorage;
export const installIsolatedStorage = api.installIsolatedStorage;
