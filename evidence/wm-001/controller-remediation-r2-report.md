# WM-001 F-CTRL-01 controller remediation cycle 2

## Identity and disposition

| Field | Observed value |
| --- | --- |
| Assignment | `WM-001-IMPLEMENTER-REMEDIATION-R2-FCTRL01`; role `WEBMASTER_IMPLEMENTER` |
| Approved brief | `timcgha/product-operating-model` commit `0ed270635549d2b554ad55648208e1d500edcaea`, `changes/WM-001.md`, blob `1af58f43f7b84e24a233fd9f6dfc3c3040c4f693`, r2 |
| Failed controller baseline | `release/webmaster-v1` head `bc93105d5fdd96f278d1a5722ddfc55c5b725cde`, tree `a7b0f2315ee6b6ae03f9db40486591de8fa0313c` |
| Authorized base | `main` `b36c8e040b4ffe9c4e9775b34ea33e7c43c22b5d`; PR #1 remained open, draft, and unmerged during implementation |
| Implementation commit | GitHub commit `fc2f0ab1ee635cc6cceacaf2c082786cc0ff116a`, tree `d7ee937757d084c7615e11dc3a5d40d6ffcf8dd7`, parent `bc93105d5fdd96f278d1a5722ddfc55c5b725cde` |
| Final candidate | The implementation commit plus its immediate evidence-only child containing this report and the comparison artifact; exact remote head/tree is returned by publication readback |
| Remediation allowance | Cycle 2 used; cycle 3 remains unused and available only for a directly related independent-QA finding |
| Implementer disposition | **READY_FOR_INDEPENDENT_QA_WITH_ONE_RUNTIME_LIMITATION**; physical controller compatibility remains `NOT_VERIFIED` |

No merge, main mutation, Pages update, deployment, WM-002 allocation, Sprint 2 work, telemetry, save-format change, visual redesign, or unrelated game-system change was performed.

## Repair design

The application now has one explicit, persistent controller lifecycle:

- `GAMEPAD_API_UNAVAILABLE`
- `WAITING_FOR_CONTROLLER_INPUT`
- `CONTROLLER_DETECTED_RELEASE_CONTROLS`
- `CONTROLLER_READY`
- `CONTROLLER_UNSUPPORTED`
- `CONTROLLER_DISCONNECTED`

The current state and child-friendly guidance remain visible in the main menu, Settings/pause panels, and gameplay HUD. The first exposing gesture binds but cannot activate a menu action. The device becomes ready only after relevant mapped controls remain neutral for a deterministic 120 ms window; the next fresh input operates the game. The same fresh-input gate is restored after pause/resume, window blur/focus, held-input cleanup, disconnect/reconnect, and active-device switching.

All enumerated devices are polled. An idle index 0 no longer hides a supported index 1 producing deliberate mapped input. The selected controller remains stable while connected; drift cannot steal selection. Disconnect immediately removes gamepad actions and requires a deliberate replacement gesture. Keyboard/mouse is sampled independently and remains available in every controller state.

Only browser-reported `mapping="standard"` devices receive the standard semantic layout. Xbox- and PlayStation-family IDs select prompt wording, not mapping eligibility. Empty or non-standard mappings are detected and reported as unsupported; standard indices are not applied speculatively. Readiness and activity use axes 0–3 plus buttons 0, 1, 7, 9, 10, and 12–15, with deadzones. Additional axes and unused buttons cannot keep the controller blocked.

Controller Details is available from the main menu, Settings, and pause screen. It displays API availability; device count; each index, ID, mapping, axis/button count; selected device; lifecycle; rounded relevant axes; and pressed relevant buttons. Copy Diagnostics creates local JSON via the Clipboard API or a local textarea fallback. The implementation has no fetch, beacon, WebSocket, XHR, telemetry, automatic persistence, or save-data access in this path. Forget active controller safely returns to detection. Persistent status cards update only on lifecycle/device-identity changes; the open diagnostics view refreshes at a bounded 250 ms cadence rather than in the gameplay HUD render path.

During rendered testing, keyboard Enter exposed a real pre-existing double-advance path: the focused button's native click and the semantic Enter action both fired. Preventing the native default for Enter preserves one semantic action per press and keeps keyboard fallback reliable.

## Changed application and test paths

| Path | Purpose |
| --- | --- |
| `src/core/actions.ts` | Lifecycle, active-device selection, relevant-control neutral gate, standard-mapping enforcement, transient diagnostics, disconnect/focus cleanup |
| `src/main.ts` | Persistent status cards/HUD, Controller Details, copy/forget actions, bounded UI refresh, Enter safety |
| `src/styles.css` | Compact state cards and diagnostic presentation |
| `tests/actions.test.ts` | Deterministic lifecycle, drift/noise, multi-device, mapping, disconnect/replacement, and diagnostic coverage |
| `e2e/wm001.spec.ts` | Multi-device Gamepad fixture; first-gesture, keyboard fallback, unsupported mapping, reconnect/focus, diagnostic, full semantic route, and representative iPad-layout coverage |
| `evidence/wm-001/*` | Attributed report, regenerated exact-candidate screenshots, hashes, preserved sponsor failure, and explicit limitations |

## Verification

Environment: Ubuntu 24.04-class Linux x86_64 container, Linux 6.18.35, Node 24.19.0, pnpm 11.19.0, Git 2.51.1, Playwright 1.63.0. Functional Chromium runs used the Playwright-compatible Google Chrome for Testing headless shell 153.0.8010.12 at SHA-256 `ded93a9c9a53a1ae040f08124badcca95c938e9d5015ff340c3b5538c41bf39e`.

| Gate | Command / method | Result |
| --- | --- | --- |
| Locked install | `pnpm install --frozen-lockfile` | PASS; already locked and up to date |
| Deterministic suite | `pnpm test` | PASS; 4 files, 34 tests |
| TypeScript + production build | `pnpm build` | PASS; 524 modules transformed; no source maps |
| Functional rendered Chromium | `WM_CHROMIUM_PATH=<CFT-153-headless-shell> pnpm exec playwright test --project=chromium --grep-invert "keeps the rendered HUD and menus usable"` | PASS; 21/21 in one stable run, including 7 F-CTRL-01 lifecycle/diagnostic/viewport scenarios and all prior functional journeys |
| Affected remediation subset | same browser, `--grep "controller remediation lifecycle"` before final expansion | PASS; 6/6; the final expanded set is included in the 21/21 run |
| Keyboard route timing recheck | same browser, `--grep "moves, jumps, orbits"` | PASS; the one earlier loaded-run timeout was a harness/runtime timing event, not a repeatable application failure |
| Pages-base build | `pnpm exec vite build --base=/Webmaster/` | PASS; HTML uses `/Webmaster/` JS/CSS paths; 88 files, 4,991,347 bytes, zero `.map` files |
| Built-output HTTP/runtime smoke | exact `dist` mounted at `/Webmaster/`, HTTP fetches plus CFT launch | PASS; index 2,605 bytes, JS 1,013,527 bytes, CSS 6,790 bytes, WASM 2,094,563 bytes; HTTP 200; title/heading/status present; zero console/page errors |
| Capture integrity | `sha256sum -c evidence/wm-001/capture-sha256.txt` | PASS; all listed captures |
| WebKit iPad-layout attempt | `pnpm exec playwright test --project=webkit-ipad-landscape --grep "representative iPad landscape viewport"` | `NOT_VERIFIED`; launch stopped before application code because `/root/.cache/ms-playwright/webkit-2359/pw_run.sh` is unavailable |
| Physical Windows/iPad controller | hardware run sheet | `NOT_VERIFIED`; no physical controller/device was available to this Implementer |

The initial four browser-suite failures were pre-application infrastructure failures because Playwright's expected browser executable was missing. CDN installation attempts timed out or returned truncated archives. A compatible official Chrome-for-Testing binary was recovered without changing product dependencies or criteria.

The 1920×1080 absolute performance assertion remains unchanged at `minimum >= 30`. It did not pass in this recovered software-rendered runtime: corrected implementation minimums were 25 and 27 FPS. The exact frozen failure baseline measured 24 FPS in the identical browser and test on the same host. Thus no controller-remediation regression was observed, but the absolute gate is explicitly **NOT_MET_IN_RECOVERED_RUNTIME** and is not represented as a pass. The historical `chromium-performance-samples.json` remains preserved and labelled as prior-candidate evidence; the exact comparison is in `captures/chromium-controller-r2-performance-comparison.json`. Windows/iPad performance remains unverified.

## Evidence and remaining work

- `captures/chromium-controller-diagnostics.png`: simulated Xbox-family READY state, local details, and copy result.
- `captures/chromium-controller-ready-hud.png`: simulated Xbox-family READY state in gameplay.
- `captures/chromium-controller-diagnostics-1194x834-representative-ipad-layout-not-safari.png`: simulated PlayStation-family READY state at representative iPad landscape dimensions; explicitly not Safari/device proof.
- `physical-controller-run-sheet.md`: preserves the sponsor's failed baseline observation and the still-unverified exact hardware matrix.

Independent QA must inspect the frozen exact candidate, diff, state transitions, mapping rejection, diagnostics privacy, keyboard fallback, save/load/pause regressions, and the performance comparison. The Product Owner—not this Implementer—decides whether the environmental absolute-FPS gap blocks republication. A real sponsor hardware retest is still required before physical Xbox/PlayStation compatibility or final WM-001 acceptance can be claimed.
