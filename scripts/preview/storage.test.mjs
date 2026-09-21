import test from "node:test";
import assert from "node:assert/strict";
import { requirePreview } from "./catalog.mjs";

const id = process.argv[2];
const preview = requirePreview(id);
const { PREFIX, isolatedStorage, installIsolatedStorage } = await import(
  `../../${preview.previewAssetsDir}/preview-storage.mjs`
);

assert.equal(PREFIX, preview.saveNamespace);

function native(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {
    getItem: (k) => data.get(String(k)) ?? null,
    setItem: (k, v) => data.set(String(k), String(v)),
    removeItem: (k) => data.delete(String(k)),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
    data,
  };
}

test(`root and earlier preview saves cannot be read or overwritten by ${preview.label}`, () => {
  const n = native({
    "webmaster.save.v1": "root",
    "webmaster.wm003-preview.v1:webmaster.save.v1": "s3",
  });
  const s = isolatedStorage(n);
  assert.equal(s.getItem("webmaster.save.v1"), null);
  s.setItem("webmaster.save.v1", "s4");
  assert.equal(n.getItem("webmaster.save.v1"), "root");
  assert.equal(
    n.getItem("webmaster.wm003-preview.v1:webmaster.save.v1"),
    "s3",
  );
  assert.equal(n.getItem(PREFIX + "webmaster.save.v1"), "s4");
});
test("clear and remove only touch current preview", () => {
  const n = native({
      root: "keep",
      [PREFIX + "one"]: "1",
      [PREFIX + "two"]: "2",
    }),
    s = isolatedStorage(n);
  s.removeItem("one");
  assert.equal(s.length, 1);
  s.clear();
  assert.equal(n.length, 1);
  assert.equal(n.getItem("root"), "keep");
});
test("enumeration does not expose other keys", () => {
  const n = native({ root: "keep", [PREFIX + "one"]: "1" }),
    s = isolatedStorage(n);
  assert.equal(s.length, 1);
  assert.equal(s.key(0), "one");
  assert.equal(s.key(1), null);
});
test("reopen retains exact isolated generations", () => {
  const n = native(),
    s = isolatedStorage(n);
  s.setItem("slot.a", "byte-exact");
  assert.equal(isolatedStorage(n).getItem("slot.a"), "byte-exact");
});
test("installation is non-replaceable and failure never falls through", () => {
  const n = native({ root: "keep" }),
    target = { localStorage: n };
  const s = installIsolatedStorage(target);
  assert.equal(target.localStorage, s);
  assert.equal(
    Object.getOwnPropertyDescriptor(target, "localStorage").configurable,
    false,
  );
  assert.throws(() =>
    Object.defineProperty(target, "localStorage", { value: n }),
  );
  const fixed = {};
  Object.defineProperty(fixed, "localStorage", { value: n });
  assert.throws(() => installIsolatedStorage(fixed));
  assert.equal(n.getItem("root"), "keep");
});
test("failed writes and special names remain isolated", () => {
  const n = native({ root: "keep" }),
    s = isolatedStorage(n);
  for (const k of ["__proto__", "length", "key", "../root", PREFIX + "root"])
    s.setItem(k, "ok");
  assert.equal(n.getItem("root"), "keep");
  const broken = {
    ...n,
    setItem() {
      throw Error("quota");
    },
  };
  assert.throws(() => isolatedStorage(broken).setItem("root", "bad"));
  assert.equal(n.getItem("root"), "keep");
});
