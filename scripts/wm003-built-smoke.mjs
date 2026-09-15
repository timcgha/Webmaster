import { createServer } from "node:http";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { route } from "../e2e/routes/wm003-route.ts";

const root = resolve(process.env.WM_DIST_ROOT || "dist");
const output = "evidence/wm-003";
await mkdir(output, { recursive: true });
const identity = {
  author: "WEBMASTER_IMPLEMENTER",
  observedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  sourceTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    encoding: "utf8",
  }).trim(),
};
async function inventory(directory, prefix = "") {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + item.name;
    if (item.isDirectory())
      result.push(...(await inventory(join(directory, item.name), name + "/")));
    else {
      const bytes = await readFile(join(directory, item.name));
      result.push({
        path: name,
        bytes: bytes.length,
        gzipBytes: gzipSync(bytes, { level: 9 }).length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
const files = await inventory(root);
assert(
  files.every((f) => !f.path.endsWith(".map")),
  "Source maps must be absent",
);
const html = await readFile(join(root, "index.html"), "utf8");
assert(
  html.includes("/Webmaster/assets/"),
  "Build must use the existing Pages base",
);
assert(
  !html.includes("/src/"),
  "Compiled HTML cannot contain development source entry",
);
const viteGraph = JSON.parse(await readFile(join(root, ".vite/manifest.json"), "utf8"));
const visited = new Set(), reachable = new Set(["index.html", ".vite/manifest.json"]);
function visit(key) {
  if (visited.has(key)) return;
  const item = viteGraph[key];
  assert(item, `Missing manifest entry ${key}`);
  visited.add(key); reachable.add(item.file);
  for (const file of [...(item.css || []), ...(item.assets || [])]) reachable.add(file);
  for (const dependency of [...(item.imports || []), ...(item.dynamicImports || [])]) visit(dependency);
}
visit("index.html");
assert.deepEqual(files.map(f => f.path).sort(), [...reachable].sort(), "Build must contain exactly the reachable entry graph plus Vite manifest; no stale chunks");
assert(files.every(f => f.path === "index.html" || f.path === ".vite/manifest.json" || /^assets\/[^/]+\.(js|css|wasm)$/.test(f.path)), "Deployment input excludes repository/source/test/environment files");
const manifest = {
  ...identity,
  base: "/Webmaster/",
  outputDirectory: root,
  reachableGraph: { root: "index.html", entryFile: viteGraph["index.html"].file, entries: visited.size, reachableFiles: reachable.size, unusedFiles: [], result: "PASS" },
  files,
  rawBytes: files.reduce((sum, f) => sum + f.bytes, 0),
  gzipBytes: files.reduce((sum, f) => sum + f.gzipBytes, 0),
  largest: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 8),
  sourceMaps: 0,
  compressedDirectionBytes: 60 * 1024 * 1024,
};
assert(manifest.gzipBytes < manifest.compressedDirectionBytes);
await writeFile(
  `${output}/build-manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;
  if (!pathname.startsWith("/Webmaster/")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const relative = pathname.slice("/Webmaster/".length) || "index.html";
  const path = resolve(root, relative);
  if (!path.startsWith(root + "/")) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const bytes = await readFile(path);
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] ?? "application/octet-stream",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.WM_CHROMIUM_PATH
    ? { executablePath: process.env.WM_CHROMIUM_PATH }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (response) =>
    requests.push({
      url: new URL(response.url()).pathname,
      status: response.status(),
    }),
  );
  const response = await page.goto(origin + "/Webmaster/?test=1");
  assert.equal(response.status(), 200);
  await page.waitForFunction(() =>
    document.getElementById("loading").classList.contains("hidden"),
  );
  assert.equal(
    await page.getByRole("heading", { name: "WEBMASTER" }).count(),
    1,
  );
  await page.getByRole("button", { name: /New Game/ }).click();
  await page.getByRole("button", { name: /Slot 1/ }).click();
  await page.getByRole("button", { name: /Normal/ }).click();
  await route(page, undefined, "built");
  const state = await page.evaluate(() => window.__WM_DEBUG__.getState());
  assert.equal(state.training.stage, 6);
  assert.equal(state.training.completions, 1);
  assert.equal(state.traversal.pullId, null);
  assert.equal(state.traversal.surfaceId, null);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert(requests.some((r) => r.url.endsWith(".wasm") && r.status === 200));
  assert(requests.every((r) => r.status === 200));
  await writeFile(
    `${output}/built-runtime-smoke.json`,
    JSON.stringify(
      {
        ...identity,
        base: "/Webmaster/",
        result: "PASS",
        method:
          "Serve exact compiled dist under Pages base; real New Game and complete swing/wall/ceiling/pull/crate-use/finish route; no fixture movement",
        requests,
        errors,
        state,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      result: "PASS",
      rawBytes: manifest.rawBytes,
      gzipBytes: manifest.gzipBytes,
      assets: files.length,
      errors,
    }),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
