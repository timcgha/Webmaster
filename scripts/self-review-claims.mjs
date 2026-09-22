/**
 * Machine-readable claim boundary for SELF_REVIEW / CI performance PASS.
 * CI green never implies physical Edge/ROG (or other sponsor-device) play-feel.
 */
export const CI_PERFORMANCE_CLAIMS = Object.freeze({
  claimScope: "synthetic-ci",
  statusMeaning:
    "PASS means paired synthetic FPS gates held on the CI browser/runtime only.",
  claims: Object.freeze([
    "Paired candidate vs accepted baseline mean FPS on the same CI machine/browser/runtime",
    "Mean loss within the published regression threshold (≤10%)",
    "≥30 FPS mean floor, or the narrow software-renderer exception when the exact baseline also misses that floor",
  ]),
  nonClaims: Object.freeze([
    "Physical Microsoft Edge on sponsor ROG (or any other sponsor laptop) play-feel",
    "Hardware GPU frame timing, display refresh, or native-resolution comfort",
    "Physical Xbox/PlayStation controller feel over USB/Bluetooth",
    "iPadOS Safari, touchscreen-only play, or perceived audio comfort",
    "Independent QA or sponsor acceptance of appearance/play-feel",
  ]),
  sponsorDevicesRequired: Object.freeze([
    "Sponsor ROG laptop + Edge (play-feel, blur, comfort)",
    "Physical standard-mapping controllers when claiming controller play-feel",
  ]),
  softwareRendererNote:
    "SwiftShader / software / llvmpipe CI greens exercise the software-renderer exception path and are not hardware performance proof.",
});

/** Embed into performance.json (and similar) so PASS artifacts are self-describing. */
export function performanceClaimBoundary(extra = {}) {
  return {
    ...CI_PERFORMANCE_CLAIMS,
    ...extra,
    criteriaDoc: "docs/self-review-pass-criteria.md",
  };
}

/** Fail closed if a retained performance report omits the device boundary. */
export function assertPerformanceClaimBoundary(report) {
  if (!report || typeof report !== "object") {
    throw new Error("performance report missing");
  }
  if (report.claimScope !== CI_PERFORMANCE_CLAIMS.claimScope) {
    throw new Error(
      `performance claimScope must be "${CI_PERFORMANCE_CLAIMS.claimScope}" (got ${report.claimScope})`,
    );
  }
  for (const key of ["claims", "nonClaims", "sponsorDevicesRequired"]) {
    const expected = CI_PERFORMANCE_CLAIMS[key];
    const actual = report[key];
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      throw new Error(`performance.${key} must match CI_PERFORMANCE_CLAIMS`);
    }
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        throw new Error(`performance.${key}[${i}] drifted from criteria`);
      }
    }
  }
  if (
    !Array.isArray(report.nonClaims) ||
    !report.nonClaims.some((x) => /Edge/i.test(x) && /ROG/i.test(x))
  ) {
    throw new Error("performance.nonClaims must exclude physical Edge/ROG play-feel");
  }
  return true;
}
