# WM-001 Implementer remediation R1

## Identity and authority

| Field | Value |
| --- | --- |
| Assignment | `WM-001-IMPLEMENTER-REMEDIATION-R1`; role `WEBMASTER_IMPLEMENTER` |
| QA input | `WM-001-QA-Q1-R1`; verdict `REMEDIATION_REQUIRED`; F-01 Major/AC-05 and F-02 Low/AC-07/AC-08 |
| Approved brief | `timcgha/product-operating-model` commit `0ed270635549d2b554ad55648208e1d500edcaea`, `changes/WM-001.md`, blob `1af58f43f7b84e24a233fd9f6dfc3c3040c4f693`, r2 |
| Returned candidate | `3bc667100399661ed733a8b0314a064ce530ad39`, tree `c5d197f831ece9339879b758d5d6f4472d51744c` |
| Authorized base | `main` `b36c8e040b4ffe9c4e9775b34ea33e7c43c22b5d`, tree `10b56a037bd841da1446ef258bd06f7b62dceb48` |
| Writer line | Existing `release/webmaster-v1` and draft PR #1 only; exact remediated head/tree are recorded in the PR after publication readback |

Before mutation, main, branch, PR, returned commit/tree, all 48 remote/local blobs, open branches/PRs, commit statuses, and workflow runs were read independently. Everything matched the returned position; no competing branch, PR, workflow, or writer was observed.

## F-01 diagnosis and protocol repair

The former protocol treated the pointer as authoritative but had no durable state distinguishing a verified inactive generation from a committed generation. This allowed three unsafe recoveries:

1. Pointer `b` could be written, pointer readback could fail, `write()` could return failure, and a later read could load staged Hard/`b` bytes.
2. A first generation `a` could be written before its pointer write failed, and missing-pointer fallback could later recover those uncommitted bytes.
3. With valid `a` generation 1 and `b` generation 2, an invalid pointer chose `a` by slot order instead of the unique newest permissible generation.

The repaired protocol is:

1. Resolve the last committed generation. Existing valid pending intent always fences its target and resolves only its recorded prior generation.
2. Write and read back a checksummed pending intent containing target slot, target generation, prior slot, and prior generation number.
3. Write, decode, checksum, and byte-compare the inactive generation.
4. Advance and read back the pointer.
5. Remove the pending intent as the final commit point. No fallible read follows this point.

Any tested failure before step 5 leaves the intent present. Readers then ignore the target even if the pointer already names it. A failed first save therefore reads as empty, while an existing save recovers only the recorded previous generation. If no intent exists, missing/invalid-pointer recovery selects the unique highest valid generation; equal-generation ambiguity and damaged intent metadata are refused. A clean retry can overwrite the fenced target and complete normally. Active-byte corruption still falls back to the other valid generation.

Slot replacement snapshots and restores the pending keys alongside `a`, `b`, and pointer keys. Successful overwrite cleanup and `clearSlot()` also remove pending keys.

## Regression evidence

At `2026-09-11T04:55:32Z`, before production repair, `pnpm exec vitest run tests/save.test.ts` produced exactly 3 failures and 8 passes. The failures independently demonstrated:

- returned failure followed by loading Hard generation `b` instead of prior Easy `a`;
- failed first-save pointer followed by recovering uncommitted `a` instead of remaining empty;
- invalid pointer selecting Easy generation `a` instead of newer Hard generation `b`.

After repair, the focused file passed. Final deterministic coverage contains 13 save tests and 24 tests total. Added coverage includes all three QA cases, missing-pointer recovery, pending-marker removal failure, clean retry, and refusal of a damaged transaction marker. Existing inactive-write, pointer-write, replacement-cleanup tests now inject failure by exact key so their named failure stage remains precise; their preservation assertions were not weakened.

Rendered Chromium adds a complete affected journey: commit a manual save, move to a distinct state, let the next generation and pointer write succeed, inject failure on immediate pointer readback, verify Save Game returns failure and remains paused, reload the exact origin, Load the prior committed position rather than staged position, perform a clean Save Game retry, verify pending cleanup, then Save & Quit successfully and Continue.

## Final remediation gates

Environment remains Ubuntu 24.04.3 LTS x86_64, Linux 6.18.35, Node 24.19.0, pnpm 11.19.0, Playwright 1.63.0, and Chrome-for-Testing headless shell 153.0.8010.36 with WebGL.

| Gate | Result | UTC observation |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS; already up to date | 2026-09-11T05:01:52Z–05:01:53Z |
| Old-logic focused proof | EXPECTED FAIL: 3 failed / 8 passed | 2026-09-11T04:55:32Z |
| Repaired focused save file | PASS: 13/13 | 2026-09-11T05:09:01Z–05:09:02Z |
| `pnpm test` | PASS: 4 files, 24/24 | 2026-09-11T05:04:54Z–05:04:55Z |
| `pnpm build` | PASS: TypeScript and Vite production build | 2026-09-11T05:04:55Z–05:04:57Z |
| Full rendered Chromium | PASS: 15/15 | 2026-09-11T05:02:09Z–05:03:44Z |
| Built-output smoke | PASS: HTTP 200, `WEBMASTER`, zero console/page errors | 2026-09-11T05:05:35Z–05:05:38Z |

One earlier smoke invocation reached HTTP 200 but its ad-hoc browser harness imported undeclared package name `playwright`; the project declares `@playwright/test`. Correcting only that harness import produced the recorded PASS. This was a harness error, not an application defect.

## F-02 evidence correction

The returned candidate's exact `captures/chromium-performance-samples.json` contained `[37, 39]`, minimum 37; its narrative incorrectly stated `[38, 40]`, minimum 38. The required remediation full-suite run regenerated the rendered captures and now records `[36, 38]`, minimum 36 in the new candidate artifact. The implementation report, PR narrative, and every affected entry in `capture-sha256.txt` were updated to the new exact bytes. The measurement was not rewritten for appearance: both the returned and remediated observations are identified and both exceed the automated 30 FPS floor.

Remediation build metrics are 3,917,534 raw bytes and 1,107,905 bytes as the sum of individually gzip-compressed files. The main application chunk is 1,003,800 raw bytes / approximately 237.46 kB gzip. Havok remains approximately 2,094.56 kB raw / 668.98 kB gzip.

## Limits and next owner

- NOT_VERIFIED remains: real Windows 11 Chrome/Edge, real iPadOS Safari, physical Xbox/PlayStation controllers over supported USB/Bluetooth combinations, native physical-mouse feel, and sponsor/human play-feel judgment.
- WebKit remains NOT_VERIFIED because the available host cannot launch it with its missing runtime libraries.
- Vercel Preview remains NOT_CREATED. No deployment was attempted during remediation and the existing Cyber project was untouched.
- The remediation is not QA acceptance, Product Owner acceptance, merge approval, or release approval.

Next owner: `WEBMASTER_QA` independently re-reviews the exact new head/tree, remediation diff, focused old-logic failure proof, 24/24 deterministic tests, 15/15 rendered tests, built smoke, and evidence correction.
