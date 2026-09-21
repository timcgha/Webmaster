/** Single source of truth for isolated preview packaging.
 *  Adding WM-007 should only require a new entry here (+ thin preview/ wrappers).
 */
export const PREVIEWS = Object.freeze({
  wm004: Object.freeze({
    id: "wm004",
    change: "WM-004",
    label: "WM-004",
    base: "/Webmaster/wm004-preview/",
    saveNamespace: "webmaster.wm004-preview.v1:",
    pagesDir: ".wm004-pages",
    payloadDir: ".wm004-payload",
    evidenceDir: "evidence/wm-004",
    previewAssetsDir: "preview/wm004",
    priorRoot: "5a3a31585e4f22b313bc361d48626322bbebb389",
    integrityBaseline: "3962446ca00c6e1db6bd8b250335b24619a0aeab",
  }),
  wm005: Object.freeze({
    id: "wm005",
    change: "WM-005",
    label: "WM-005",
    base: "/Webmaster/wm005-preview/",
    saveNamespace: "webmaster.wm005-preview.v1:",
    pagesDir: ".wm005-pages",
    payloadDir: ".wm005-payload",
    evidenceDir: "evidence/wm-005",
    previewAssetsDir: "preview/wm005",
    priorRoot: "b4a583116fc0823434f11788e5ab0bec36358f4d",
    integrityBaseline: "a63ad0e05ce12d2b42ff22e97d39de4af51d4b08",
  }),
  wm006: Object.freeze({
    id: "wm006",
    change: "WM-006",
    label: "WM-006",
    base: "/Webmaster/wm006-preview/",
    saveNamespace: "webmaster.wm006-preview.v1:",
    pagesDir: ".wm006-pages",
    payloadDir: ".wm006-payload",
    evidenceDir: "evidence/wm-006",
    previewAssetsDir: "preview/wm006",
    priorRoot: "2b1a4bd0c94e7d226d6fc8388cafcb0ff0aff8f8",
    integrityBaseline: "6aff5802736b5c12380102a70a38794838397d7d",
  }),
});

export function requirePreview(id) {
  const preview = PREVIEWS[id];
  if (!preview) {
    throw new Error(
      `Unknown preview id "${id}". Known: ${Object.keys(PREVIEWS).join(", ")}`,
    );
  }
  return preview;
}
