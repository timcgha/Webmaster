import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { requirePreview } from "./catalog.mjs";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

/** Package a built preview payload with catalog-bound save namespace. */
export function packagePreview(id) {
  const preview = requirePreview(id);
  const root = path.resolve(preview.pagesDir);
  const out = path.resolve(preview.payloadDir);
  const { base, saveNamespace, change, evidenceDir, previewAssetsDir, priorRoot } =
    preview;

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, ".vite/manifest.json"), "utf8"),
  );
  const entry = Object.values(manifest).find((x) => x.isEntry);
  assert.ok(entry?.file);

  const reachable = new Set(["index.html"]);
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const x = manifest[key];
    assert.ok(x, key);
    reachable.add(x.file);
    for (const f of [...(x.css ?? []), ...(x.assets ?? [])]) reachable.add(f);
    for (const f of [...(x.imports ?? []), ...(x.dynamicImports ?? [])])
      visit(f);
  }
  for (const key of Object.keys(manifest).filter((k) => manifest[k].isEntry))
    visit(key);

  const files = [];
  function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== ".vite") scan(file);
      } else files.push(path.relative(root, file).replaceAll("\\", "/"));
    }
  }
  scan(root);
  assert.deepEqual(new Set(files), reachable);
  assert.ok(files.every((f) => !f.endsWith(".map")));

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const f of files) {
    const target = path.join(out, f);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, f), target);
  }

  let html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  assert.ok(
    html.includes(base + entry.file),
    `index.html must reference ${base}${entry.file} for ${id}`,
  );
  html = html
    .replace(`src="${base + entry.file}"`, 'src="./preview.mjs"')
    .replace("</head>", '<link rel="stylesheet" href="./preview.css">\n</head>');
  assert.ok(html.includes('src="./preview.mjs"'));
  fs.writeFileSync(path.join(out, "index.html"), html);

  // Shared factory must ship beside the thin per-preview storage binder.
  const sharedStorage = fs.readFileSync(
    "preview/shared/preview-storage.mjs",
    "utf8",
  );
  assert.ok(sharedStorage.includes("createPreviewStorage"));
  fs.writeFileSync(path.join(out, "preview-storage-shared.mjs"), sharedStorage);

  for (const f of ["preview.mjs", "preview-storage.mjs", "preview.css"]) {
    let source = fs.readFileSync(path.join(previewAssetsDir, f), "utf8");
    if (f === "preview-storage.mjs") {
      assert.equal(
        source.match(/webmaster\.wm\d{3}-preview\.v1:/g)?.length,
        1,
        `${id} storage must declare exactly one preview namespace`,
      );
      assert.ok(
        source.includes(`export const PREFIX = "${saveNamespace}"`),
        `${id} PREFIX must equal catalog saveNamespace`,
      );
      source = source.replace(
        /from\s+["']\.\.\/shared\/preview-storage\.mjs["']/,
        'from "./preview-storage-shared.mjs"',
      );
      assert.ok(
        source.includes('from "./preview-storage-shared.mjs"'),
        `${id} packaged storage must import the payload-local shared factory`,
      );
    }
    fs.writeFileSync(
      path.join(out, f),
      source
        .replaceAll("__GAME_ENTRY__", entry.file)
        .replaceAll("__PREVIEW_LABEL__", preview.label)
        .replaceAll("__SAVE_NAMESPACE__", saveNamespace),
    );
  }
  fs.writeFileSync(path.join(out, ".nojekyll"), "");

  const runtime = [
    ...files,
    "preview.mjs",
    "preview-storage.mjs",
    "preview-storage-shared.mjs",
    "preview.css",
    ".nojekyll",
  ].sort();
  const rows = runtime.map((f) => {
    const b = fs.readFileSync(path.join(out, f));
    return {
      path: f,
      bytes: b.length,
      sha256: sha(b),
      gzip9: zlib.gzipSync(b, { level: 9 }).length,
    };
  });
  const digest = sha(
    Buffer.from(
      rows.map((x) => `${x.path}\0${x.sha256}\0${x.bytes}\n`).join(""),
    ),
  );
  const provenance = {
    change,
    kind: "isolated sponsor playtest preview",
    source: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    base,
    saveNamespace,
    build: "clean Vite8.3.0 / exact pnpm lock / Node24.19.0",
    payloadSha256: digest,
    hashMethod:
      "SHA256(sorted UTF8 path NUL SHA256 NUL byteLength LF), excluding provenance and manifest",
    runtimeFiles: rows.length,
    rawBytes: rows.reduce((s, x) => s + x.bytes, 0),
    gzip9Bytes: rows.reduce((s, x) => s + x.gzip9, 0),
    priorRoot,
    mergeOrRootRelease: false,
  };
  fs.writeFileSync(
    path.join(out, "wm-provenance.json"),
    JSON.stringify(provenance, null, 2) + "\n",
  );
  const pbytes = fs.readFileSync(path.join(out, "wm-provenance.json"));
  rows.push({
    path: "wm-provenance.json",
    bytes: pbytes.length,
    sha256: sha(pbytes),
    gzip9: zlib.gzipSync(pbytes, { level: 9 }).length,
  });
  fs.writeFileSync(
    path.join(out, "wm-manifest.tsv"),
    "path\tbytes\tsha256\n" +
      rows.map((x) => `${x.path}\t${x.bytes}\t${x.sha256}`).join("\n") +
      "\n",
  );
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, "packaging.json"),
    JSON.stringify(
      {
        provenance,
        files: rows,
        largest: [...rows].sort((a, b) => b.bytes - a.bytes).slice(0, 5),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(provenance));
  return provenance;
}

const id = process.argv[2];
if (id) packagePreview(id);
