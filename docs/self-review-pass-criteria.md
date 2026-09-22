# SELF_REVIEW_PASS criteria

Durable acceptance boundary for Webmaster self-review. Historical sprint ledgers (`docs/wm006-self-review-ledger.md`, earlier `evidence/wm-00N/`) remain the narrative record; this file is the claim contract.

## What CI PASS is allowed to mean

A green WM verification / paired-performance job may claim only:

1. Exact-source integrity of the candidate commit/tree under test.
2. Deterministic unit and TypeScript gates for that source.
3. Rendered Chromium journeys and Gamepad **API simulation** on the CI runner.
4. Paired mean FPS on the **same** CI browser/runtime/machine versus the published baseline, with:
   - mean loss ≤ 10%, and
   - mean FPS ≥ 30, **or** the narrow software-renderer exception (SwiftShader / software / llvmpipe) when the **exact accepted baseline** also misses that floor on the same runner.

Machine-readable copy of this contract lives in `scripts/self-review-claims.mjs` and is embedded in `evidence/**/performance.json` as `claimScope`, `claims`, `nonClaims`, and `sponsorDevicesRequired`.

## What CI PASS must not mean

A CI `PASS` / `SELF_REVIEW` green **never** asserts:

- Physical **Microsoft Edge on sponsor ROG** (or any other sponsor laptop) play-feel, comfort, blur, or “feels good at native resolution”
- Hardware GPU frame timing or display-refresh behavior
- Physical Xbox / PlayStation controller feel over USB/Bluetooth
- iPadOS Safari, touchscreen-only play, or perceived audio comfort
- Independent QA, or sponsor appearance / play-feel **acceptance**

Synthetic Gamepad API tests are labeled simulation; they are not physical-controller proof.

## SELF_REVIEW_PASS vs CI green

| Label | Allowed claim |
| --- | --- |
| CI job green / `performance.json` `status: "PASS"` | Synthetic gates above held for that commit |
| `SELF_REVIEW` evidence archive | Author/reviewer retained CI + inspection evidence; **not** independent QA |
| `SELF_REVIEW_PASS` (attributable) | Exact-source self-review complete **and** any sponsor-device checks required by the change brief are separately recorded; CI greens alone do not invent Edge/ROG acceptance |

Publication / root release still requires the sprint’s authorized gates (byte verification, preview isolation, sponsor acceptance where the brief demands it). Soft feel on Edge/ROG stays a **sponsor device** check outside CI PASS claims.

## Reviewer checklist (performance)

- [ ] `performance.json` includes `claimScope: "synthetic-ci"` and the Edge/ROG exclusion in `nonClaims`
- [ ] Software-renderer exception used only when baseline also missed the floor on the same runner
- [ ] No release note, PR title, or ledger line upgrades a SwiftShader green into “Edge/ROG OK”
- [ ] If the brief requires play-feel acceptance, a sponsor ROG+Edge (and physical pad, if claimed) record exists **beside** CI evidence
