import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CI_PERFORMANCE_CLAIMS,
  assertPerformanceClaimBoundary,
  performanceClaimBoundary,
} from "./self-review-claims.mjs";

test("CI claims exclude physical Edge/ROG play-feel", () => {
  assert.equal(CI_PERFORMANCE_CLAIMS.claimScope, "synthetic-ci");
  assert.ok(
    CI_PERFORMANCE_CLAIMS.nonClaims.some(
      (x) => /Edge/i.test(x) && /ROG/i.test(x),
    ),
  );
  assert.ok(
    CI_PERFORMANCE_CLAIMS.sponsorDevicesRequired.some((x) => /ROG/i.test(x)),
  );
  assert.ok(/SwiftShader/i.test(CI_PERFORMANCE_CLAIMS.softwareRendererNote));
});

test("performanceClaimBoundary is embeddable and assertable", () => {
  const boundary = performanceClaimBoundary({ status: "PASS" });
  assert.equal(boundary.criteriaDoc, "docs/self-review-pass-criteria.md");
  assert.equal(boundary.status, "PASS");
  assertPerformanceClaimBoundary(boundary);
});

test("assertPerformanceClaimBoundary fails closed on drift", () => {
  assert.throws(
    () => assertPerformanceClaimBoundary({ claimScope: "hardware" }),
    /claimScope/,
  );
  assert.throws(
    () =>
      assertPerformanceClaimBoundary({
        ...CI_PERFORMANCE_CLAIMS,
        nonClaims: ["something else"],
      }),
    /nonClaims/,
  );
});

test("wm006 performance script embeds the shared claim boundary", () => {
  const source = fs.readFileSync("scripts/wm006-performance.mjs", "utf8");
  assert.match(source, /self-review-claims\.mjs/);
  assert.match(source, /performanceClaimBoundary/);
  assert.match(source, /assertPerformanceClaimBoundary/);
});

test("criteria doc states the Edge/ROG exclusion", () => {
  const doc = fs.readFileSync("docs/self-review-pass-criteria.md", "utf8");
  assert.match(doc, /Edge/);
  assert.match(doc, /ROG/);
  assert.match(doc, /SELF_REVIEW_PASS/);
  assert.match(doc, /SwiftShader/);
  assert.doesNotMatch(doc, /CI PASS means Edge/);
});
