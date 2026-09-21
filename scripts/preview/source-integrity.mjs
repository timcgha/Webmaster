import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { requirePreview } from "./catalog.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

/** Compare tracked HEAD blobs to working tree; write evidence report. */
export function checkSourceIntegrity(id) {
  const preview = requirePreview(id);
  const files = [],
    discrepancies = [];
  for (const row of execFileSync("git", ["ls-tree", "-r", "-z", "HEAD"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)) {
    const tab = row.indexOf("\t"),
      sha = row.slice(0, tab).split(" ")[2],
      filePath = row.slice(tab + 1);
    if (!fs.existsSync(filePath)) {
      discrepancies.push({ path: filePath, expected: sha, actual: "MISSING" });
      continue;
    }
    const bytes = fs.readFileSync(filePath),
      blob = crypto
        .createHash("sha1")
        .update(Buffer.from(`blob ${bytes.length}\0`))
        .update(bytes)
        .digest("hex");
    if (blob !== sha)
      discrepancies.push({ path: filePath, expected: sha, actual: blob });
    files.push({
      path: filePath,
      blob,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    });
  }
  fs.mkdirSync(preview.evidenceDir, { recursive: true });
  const report = {
    source: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    baseline: preview.integrityBaseline,
    checked: files.length,
    status: discrepancies.length ? "FAIL" : "PASS",
    discrepancies,
    files,
  };
  fs.writeFileSync(
    path.join(preview.evidenceDir, "source-integrity.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ ...report, files: undefined }));
  assert.equal(
    discrepancies.length,
    0,
    "Tracked bytes changed; the complete discrepancy report has been retained",
  );
  return report;
}

const id = process.argv[2];
if (id) checkSourceIntegrity(id);
