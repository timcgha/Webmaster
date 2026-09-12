# WM-002 — Swing Across the Skyline

Implementer: `/root/webmaster_implementer_wm002_recovery` (WEBMASTER_IMPLEMENTER), assignment WM-002-IMPLEMENTATION-I1. This is implementation evidence. Independent QA, Pages publication and sponsor play-feel acceptance are owned by later parent-controlled stages.

The adopted brief is `timcgha/product-operating-model`, commit `4cd6021aade27a910e80454bf9f9746ff33d6d45`, `changes/WM-002.md`, blob `673512952aef6e309e526c3619da02932a7525d4`, r1. Source begins at merged WM-001 `209466106a7f7d9d4bd13ad7ac3f86f278edd905` / `e45ef30ebac813a2180fa2202c55a1a339eb099b`.

## Tested source and evidence binding

- Implementation source commit: `5251d66fa680675e56b23010b5adf79d06b36957`.
- Implementation tree: `5e42310c9c095487a9fc263a54c1b1d5caebfb9e`.
- Direct parent: `209466106a7f7d9d4bd13ad7ac3f86f278edd905`.
- Checkout: `/workspace/scratch/bb63ed1d5d6d/wm002-worktree`.
- `source-content-manifest.json` binds every product/configuration/dependency/test/verification-script file to its Git blob and SHA-256. The final evidence-only commit preserves these files. A file does not purport to contain its own future commit hash; the parent independently reads back the final branch head/tree and verifies the evidence-only relationship.
- The GitHub connector created the source commit because direct Git push had no credentials. The earlier local commit `18dd4dcb4ad60eaab777fb8a2d3511b471d6ad9a` has the identical tree and is preserved as a precursor; final gates use the real connector-created source commit fetched from GitHub.

## Delivered behavior

Five authored rings have explicit eligibility and visibility tags. Selection requires a 31-unit wrist range, camera-centered 58-degree half-cone and an unobstructed hand-to-ring segment. The most centered candidate wins, then shortest range, then stable ID order. The attached ring position is copied and remains stable. Arbitrary mesh geometry and UI never become anchors. Available rings are turquoise, targeted rings yellow and the attached ring white.

One visible procedural web extends from the original hero's raised right wrist. A short wrist flash and line extension show firing; release removes the web. The existing hero costume, pattern, eyes and proportions are preserved. New geometry is limited to functional route roofs, anchors, arrows, start/finish markers and the web.

Motion uses a fixed 60 Hz step, gravity of 22 units/s², a maximum rope-length constraint and removal of outward radial velocity. Steering is bounded at 9 units/s² in the air and total speed at 26 units/s. The rope does not reel the hero toward the ring. Releasing retains the current velocity before gravity and steering in the next interval. Swept substeps of at most 0.16 units block thin solids. Collision takes precedence over the rope; an obstructed or conflicting rope releases safely. Explicit states cover grounded/free, target available, firing, attached, releasing, airborne, landing and fall recovery.

The continuous route has four gaps: 14, 19, 52 and 18 units. Anchor heights are 16, 21, 23, 20 and 18 units. The third gap requires a release and a different-ring mid-air reattachment; the final gap turns right. The first gap has a catch platform. Earned progression requires ordinary movement through the start, actual anchor/release history and a safe landing on the next roof. Teleport fixtures invalidate progression; falling through a finish, recovery, loading and repeated finish contact cannot award a traversal. Replay starts a new traversal while retaining earned completion. Misses return to the last earned safe roof and retain WM-001 health/zero-health retry behavior.

Keyboard E and standard-gamepad LT/L2 are semantic hold/release actions. Movement, mouse/right-stick camera, jump, run, recenter and pause retain their prior routes. The mapped neutral/activity set includes LT/L2, and the WM-001 controller lifecycle, device selection, unsupported-mapping behavior, persistent status and local diagnostics remain intact. Pause clears the web and freezes motion, with fresh-input gating on resume. Blur/disconnect releases actions; reconnect still requires neutral and fresh input.

Saves keep the existing version-1 keys, checksummed generations and separate manual/checkpoint records. An optional independently versioned skyline field stores earned roof and completion. New Game, load, retry and recovery clear rope, anchor, velocity and held-input transients. A manual position is restored only on its earned roof, otherwise the canonical safe checkpoint is used. Save and Save & Quit remain disabled during a web, flight, unsettled landing or recovery, including entry to Pause from those states. The explanation names those conditions. Manual saves are not replaced by automatic checkpoints.

## Reproducible gates

Set `PLAYWRIGHT_BROWSERS_PATH` to the recovered browser directory and `WM_CHROMIUM_PATH` to CFT 153.0.8010.12. `browser-recovery.json` records the parent's official-origin recovery and verified executable hash. No dependency or paid service was introduced.

| Gate | Command | Result record |
| --- | --- | --- |
| Locked installation | `pnpm install --frozen-lockfile --offline` | `command-results.json`, `locked-install.log` |
| Deterministic regressions and swing route | `pnpm test` | `deterministic.log`, `timing-profiles.json` |
| TypeScript and ordinary production build | `pnpm build` | `production-build.log` |
| Existing Pages base | `pnpm exec vite build --base=/Webmaster/` | `pages-base-build.log`, `build-manifest.json` |
| Full Chromium suite, no parallel rendering | `pnpm exec playwright test --project=chromium --workers=1 --reporter=list,json` | `browser-results.json`, `browser-run.json`, `browser-console.log` |
| Exact compiled runtime | `node scripts/wm002-built-smoke.mjs` | `built-runtime-smoke.json` |

Final result: locked install PASS; 52/52 deterministic tests across 5 files PASS; TypeScript and both builds PASS; 31/31 Chromium scenarios PASS (22 existing WM-001, 7 new WM-002, 2 performance; zero skipped, unexpected or flaky); compiled runtime smoke PASS with zero errors; capture integrity 38/38. Build inventory: 89 files, 5,025,903 raw bytes and 1,373,832 sum-gzip bytes, zero source maps. Final result summary is in `verification-summary.json`. Structured Playwright JSON contains every result, duration, assertion error if any and attachment reference. Console capture may be incomplete in this execution environment; it is not substituted for the complete JSON report and exit/last-run readback.

The old WM-001 suite retains all product assertions. Its only text edit updates the disabled-save explanation to include swinging and landing. `workers: 1` prevents different test files from competing for the software renderer. The new keyboard camera helper sends the same DOM mouse events used by the existing WM-001 test and asserts actual camera rotation; it does not set gameplay state.

## Acceptance mapping

| AC | Implementation evidence and falsification |
| --- | --- |
| AC-01 | Existing slot/difficulty flows, complete E and simulated L2 routes, actions tests for button 6 and neutral gating, family prompt capture; all legacy controller/keyboard journeys. |
| AC-02 | Eligibility/visibility, empty set, out-of-range, behind-camera, obstruction and deterministic multiple-anchor tests; targeted ring capture and actual aimed attach. |
| AC-03 | Right-wrist metadata/position, stable copied anchor and one-web tests; hand-origin, mid-air handoff and release captures plus complete route videos. |
| AC-04 | Gravity and no direct pull; 5,000 bounded swing steps; maximum rope error; exact release velocity at the transition; actual reattachment; timing-profile comparisons. |
| AC-05 | Explicit states, maximum-speed thin-wall collision, roof landing and blocked-rope detach; browser fall/recovery and existing practice collision/zero-health journeys. |
| AC-06 | Four actual gaps with differing heights, release on every crossing, physically necessary mid-air handoff on the 52-unit gap, right turn and safe catch; continuous keyboard and controller routes from ordinary New Game without fixture placement. |
| AC-07 | Legitimate completion once, duplicate finish/invalid placement/falling negatives; complete-route safe save/load, controller Continue, keyboard whole-browser close/reopen, replay and fall checkpoint cleanup. |
| AC-08 | Existing full controller lifecycle/diagnostics suite; swing pause/blur/disconnect/reconnect fresh-input tests and separate keyboard fallback after controller save/load. |
| AC-09 | Old WM-001 save compatibility, malformed optional skyline rejection and prior-record preservation, unsafe-save negatives; legacy atomic-save regressions; transient-free manual load and exact same-origin/profile persistence. |
| AC-10 | Full deterministic routes sampled at 30/60/120/uneven frame rates; rendered near-30 and uneven continuous routes; 12 ordinary pause/replay/save/Continue cycles with GC heap/DOM/listener measurements. Difficulty is outside the shared swing-physics inputs, preserving identical movement mechanics. Same-runtime baseline/candidate FPS measured separately. |
| AC-11 | Locked install, 52 deterministic tests, full legacy/new Chromium suite, TypeScript/build, built Pages-base smoke, representative layouts, asset/dependency provenance and raw/gzip manifest. |
| AC-12 | Implementer stops at one exact reviewable draft candidate. Independent QA and deployment are PENDING_PARENT; no implementation test is represented as independent QA. |

## Timing, performance and resources

The same fixed-step deterministic input route completes at 30, 60, 120 and uneven rendered-frame schedules with five attachments, five deliberate releases, one completion, bounded maximum rope extension and materially consistent first-release speed. The long-gap negative driver, which omits mid-air reattachment, fails physically before completing that gap. Rendered tests separately traverse the entire route under actual near-30 and uneven requestAnimationFrame scheduling and record actual sampled FPS; requested intervals are not represented as measured high-frame-rate hardware.

The parent's exact merged-WM-001 isolated baseline measured [44,45] at 1280×720 and [38,42] at 1920×1080. Its unchanged original representative gate measured [35,39]. See `baseline/`, attributed to WEBMASTER_PRODUCT_OWNER. The final candidate measured [35,36] at 1280×720 and [40,38] at 1920×1080, both passing the unchanged >=30 assertion. The deliberately near-30 scheduled complete route measured mostly 30 with one 28 FPS sample: route stability passed, but that scheduled profile is explicitly not a >=30 performance PASS. The uneven scheduled complete route minimum was 31. Candidate records use the same method, same CFT executable, default adaptive quality, a 2,200 ms sample and one worker. Candidate actual values and the >=30 result are preserved in the two `candidate-isolated-*.json` records. Any measured route cost is retained; historical WM-001 25 FPS is not used as a blanket exception. A renderer/hardware measurement is not universal device performance proof.

The 12-cycle resource test records GC heap, DOM node and listener counts after ordinary replay/save/load. From cycle 2 to 11 the heap grew 461,564 bytes; DOM nodes remained 290 and listeners remained 82. It detects retained scenes or accumulating UI listeners within that bounded sample; it is not proof of indefinite operation. The physics state and FPS sample history are bounded independently.

`build-manifest.json` records each built file's raw and gzip bytes and SHA-256, largest assets, absent source maps and the <=60 MiB compressed direction. `THIRD_PARTY_NOTICES.md`, package versions and the lockfile are unchanged. No third-party art, telemetry, cloud persistence or paid dependency was added.

## Preserved development attempts

The initial readiness-only worker and checkout approval denial preceded the sponsor's explicit superseding authorization and this replacement assignment. No denied implementation was continued without that authorization.

- The agent-browser daemon failed to start twice in the isolated runtime; native repository Playwright with the recovered official CFT/FFmpeg executables provided actual rendered evidence. These daemon attempts are not PASS.
- Early deterministic route tuning corrected release timing and route geometry; the high-frequency input driver was corrected to retain jump edges until a physics tick, matching the production accumulator.
- Early rendered route failures exposed necessary camera framing/aim improvements. A native synthetic mouse drag did not move the camera in this runtime; the established DOM-event route plus explicit camera assertions replaced that harness action.
- Controller route development assertions were corrected to the existing exact save toast and to test the axis actually moved after camera-resetting load. Those changes did not weaken traversal, controller-only or save assertions.
- One eight-test invocation accidentally used two Playwright workers across files. Its [31,28] and [25,25] candidate FPS records are preserved as OVERLAPPED_EXCLUDED under `attempts/`; they cannot be compared with an isolated baseline. Global one-worker configuration and an isolated run resolved that measurement error.
- The complete integration run recorded 30/31 PASS; its one failure was the legacy exact unsafe-save wording, now updated while retaining disabled-save checks. `attempts/initial-final-browser-results.json` and `integration-last-run.json` preserve it. Its successful routes/resource observations were development evidence until the final committed-source run.
- The local18dd committed-source install/unit/build gates are preserved as precursor results. The connector-created identical source was subsequently used for final gates.

No independent frozen-candidate rejection has occurred, so substantive QA-remediation cycles used: 0.

## Boundaries and remaining external evidence

Main and the prior WM-001 Pages deployment are unchanged. The new PR remains draft and unmerged. Historical WM-001 captures/reports are restored byte-for-byte; newly generated regressions are kept under `regression-captures/` with this source attribution. Test captures and local save fixtures do not belong in a Pages payload.

Physical WM-002 controller compatibility, target-device performance and child/sponsor route feel remain NOT_VERIFIED. The older sponsor-reported PlayStation-family USB test covered WM-001 on Windows 11 Home / Chrome 153.0.8010.36; exact model UNKNOWN. It is not WM-002 evidence. Xbox, Bluetooth, Edge, iPadOS/Safari and other combinations are not promoted from synthetic tests. Representative iPad-sized Chromium layout is not Safari verification.

The parent may independently freeze/review this candidate and, only after independent QA acceptance, build and publish it at the existing Pages origin. No merge, WM-003 allocation, Sprint 3, visual redesign, combat, climbing, pulling, Vercel or production-release claim is included.
