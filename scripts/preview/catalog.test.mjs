import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PREVIEWS, requirePreview } from "./catalog.mjs";

test("preview catalog namespaces are unique and well-formed", () => {
  const bases = new Set();
  const namespaces = new Set();
  for (const id of Object.keys(PREVIEWS)) {
    const p = requirePreview(id);
    assert.equal(p.id, id);
    assert.match(p.saveNamespace, /^webmaster\.wm\d{3}-preview\.v1:$/);
    assert.match(p.base, /^\/Webmaster\/wm\d{3}-preview\/$/);
    assert.ok(!bases.has(p.base), `duplicate base ${p.base}`);
    assert.ok(
      !namespaces.has(p.saveNamespace),
      `duplicate namespace ${p.saveNamespace}`,
    );
    bases.add(p.base);
    namespaces.add(p.saveNamespace);
    const storage = fs.readFileSync(
      `${p.previewAssetsDir}/preview-storage.mjs`,
      "utf8",
    );
    assert.ok(
      storage.includes(`export const PREFIX = "${p.saveNamespace}"`),
      `${id} storage PREFIX must match catalog`,
    );
    assert.equal(
      storage.match(/webmaster\.wm\d{3}-preview\.v1:/g)?.length,
      1,
      `${id} must declare exactly one namespace literal`,
    );
  }
});

test("requirePreview fails closed for unknown ids", () => {
  assert.throws(() => requirePreview("wm999"), /Unknown preview id/);
});
