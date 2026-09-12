# WM-001 Implementer evidence report

## Identity and scope

| Field | Observed value |
| --- | --- |
| Assignment | `WM-001-IMPLEMENTATION-I1-R1`; role `WEBMASTER_IMPLEMENTER` |
| Approved brief | `timcgha/product-operating-model` commit `0ed270635549d2b554ad55648208e1d500edcaea`, `changes/WM-001.md`, blob `1af58f43f7b84e24a233fd9f6dfc3c3040c4f693`, r2 |
| Authorized product base | `timcgha/Webmaster` main `b36c8e040b4ffe9c4e9775b34ea33e7c43c22b5d`, tree `10b56a037bd841da1446ef258bd06f7b62dceb48`, README blob `1c8da4b67abe226976ffcf70782c22d6dc85c0e5` |
| Candidate publication | Single `release/webmaster-v1` branch and one draft PR targeting `main`; the exact self-referential head/tree is recorded in the draft PR body and connector readback after publication |
| Candidate writer | One writer line: this Implementer on `release/webmaster-v1`. Remediation cycle 1 reused and refroze that line for independent QA re-review. |
| Merge / production | Not authorized and not performed |

Implemented scope is the complete WM-001 practice journey: original procedural 3D hero and arena, third-person movement/camera/collision, health/recovery, semantic keyboard/mouse and standard Gamepad inputs, controller-complete menus/settings, three slots, safe manual saving, rolling checkpoints, two-generation commits, Continue/Load, and responsive HUD.

## Environment and commands

Observation environment: Ubuntu 24.04.3 LTS x86_64 container, Linux 6.18.35, Node 24.19.0, pnpm 11.19.0, Git 2.51.1, Playwright 1.63.0. Rendered Chromium used Google Chrome for Testing headless shell 153.0.8010.36 with WebGL. Tests use only synthetic save records and simulated Gamepad data; no customer data or secrets.

| Gate | Command | Implementer result | Observation |
| --- | --- | --- | --- |
| Reproducible install | `pnpm install --frozen-lockfile` | PASS; exact lockfile, no lifecycle scripts | 2026-09-11T04:00:21Z |
| Typecheck and production build | `pnpm build` | PASS; Vite production output with scoped Babylon ESM imports; clean-output rerun after evidence config | 2026-09-11T04:03:36Z–04:03:38Z |
| Deterministic tests | `pnpm test` | PASS: 4 files, 19 tests | 2026-09-11T04:00:31Z–04:00:32Z; save generations/failures/schema, settings, semantic mappings, and fixed-step motion |
| Rendered Chromium | `WM_CHROMIUM_PATH=<Chrome-for-Testing-153-headless-shell> pnpm test:e2e:chromium` | PASS: 14 tests | 2026-09-11T04:00:39Z–04:02:07Z; actual Babylon WebGL canvas with keyboard/mouse browser input, simulated standard Gamepad, persistence, responsive layout, and two timing profiles |
| Built-output smoke | `pnpm preview` plus HTTP fetch and Chromium launch of `dist` | PASS: HTTP 200, heading `WEBMASTER`, zero console/page errors | 2026-09-11T04:05Z; local exact built output |
| WebKit attempt | `pnpm exec playwright test --project=webkit-ipad-landscape -g "keeps the rendered HUD"` | NOT_VERIFIED: browser launch blocked before app by missing Ubuntu runtime libraries | Missing GStreamer/GTK4/Graphene/Event/AVIF/Harfbuzz/Wayland/Manette/Hyphen/Secret/GLES libraries; this is a browser-host gap, not an application verdict |
| Physical Windows/iPad/controllers | Run sheet route | NOT_VERIFIED | No physical device or controller was present |

The exact UTC final-gate start/end, bundle metrics, capture hashes, candidate commit/tree, and PR are recorded in the draft PR body after all commands and publication readback complete.

## Independent-QA remediation cycle 1

QA found that pointer-write/readback failures could leave newly staged bytes loadable even though `write()` returned failure, that a failed first-save pointer write could later recover uncommitted bytes, and that invalid-pointer recovery selected generation `a` rather than the unique newest valid generation. The repair adds a checksummed pending-intent fence recording target, target generation, prior generation, and prior generation number. The fence is written and read back before staging. It remains present through inactive-generation and pointer verification and is removed only as the final commit point. Readers seeing a valid fence ignore the target and recover only the recorded prior committed generation; a failed first save remains empty. Without a fence, missing or invalid pointers recover the unique highest valid generation, while ambiguous or damaged transaction metadata is refused.

The three focused regressions failed against the returned logic exactly as QA described at 2026-09-11T04:55:32Z, then passed after repair. Final remediation verification passed 24/24 deterministic tests, 15/15 rendered Chromium tests, production build, and built-output smoke. The rendered suite includes pointer write success followed by readback failure, page reload, prior-record Load, clean Save Game retry, success-only Save & Quit, and Continue. Full details are in `remediation-r1-report.md`.

## Bundle and performance

- Clean remediation production output: 3,917,534 raw bytes and 1,107,905 bytes as the sum of individually gzip-compressed files during the measured build, comfortably below the 15 MiB compressed cap. No source maps remain in `dist`.
- Main application chunk: about 1,004 kB raw / 237.46 kB gzip. Havok WASM: about 2,095 kB raw / 668.98 kB gzip.
- The returned candidate's exact artifact recorded `[37, 39]`, minimum 37 FPS; its prior narrative incorrectly stated `[38, 40]`, minimum 38. The remediated candidate's regenerated headless-Linux 1920×1080 artifact records `[36, 38]`, minimum 36. Every regenerated capture hash and narrative was updated consistently. Both exact observations meet the automated floor and neither substitutes for Windows or iPad device performance.
- Fixed-step unit checks compare 60 Hz and 30 Hz sequences. Rendered Chromium also passes movement/jump at a second real-time 2× CPU-throttled profile.

## Acceptance disposition from the Implementer

| AC | Implementer disposition | Evidence and limits |
| --- | --- | --- |
| AC-01 | PASSED | New Game, three slots, all difficulties, overwrite confirmation/cancel byte preservation, and controller-only main/slot/difficulty/settings/pause/load flows pass rendered checks. |
| AC-02 | PASSED for implementation evidence | Original procedural source plus ordinary-camera front and route captures show the specified identity. Independent QA and sponsor/human tone/appearance judgment remain pending. |
| AC-03 | PASSED in rendered Linux Chromium | K/M and simulated Gamepad movement, run, jump, orbit, recenter, collision, landing, route completion, fixed-step invariants, and second timing profile pass. Physical platform feel remains NOT_VERIFIED. |
| AC-04 | PASSED | Pause freeze/fresh input, fall health, zero-health retry, simulated disconnect/reconnect-neutral behavior, and lifecycle cleanup pass. |
| AC-05 | PASSED after remediation; independent re-review pending | Same-profile/exact-origin close/reopen restores slot, Hard difficulty, health, costume ID, progress/label, safe position/checkpoint, and completion flag. A checksummed pending-intent fence now prevents every tested returned failure from activating staged bytes. Manual/checkpoint choice, newest Continue, corruption, incompatibility, unavailable storage, pointer failures, overwrite failure/cancel preservation, and Save & Quit success-only exit are covered. |
| AC-06 | PASSED for semantic simulation; physical NOT_VERIFIED | Unit and rendered Gamepad simulation cover Xbox- and PlayStation-style standard mappings/prompts and the complete S1 route. Every physical row remains explicitly NOT_VERIFIED. |
| AC-07 | PASSED for automated evidence; devices NOT_VERIFIED | 1280×720, 1920×1080, and 1194×834 responsive checks/captures pass; headless 1920 samples stay above 30 FPS; compressed build is about 1.11 MB. Windows/iPad/Safari/device FPS remains NOT_VERIFIED. |
| AC-08 | PASSED for Implementer handoff after remote readback | Exact branch/head/tree and draft PR are established externally in the PR body; install/build/unit/rendered gates and evidence are reproducible. Independent QA remains the next owner. Preview is omitted unless its environment can be proven before deployment. |

No independent QA or product acceptance is claimed here.

## Preview boundary

Vercel read-only preflight found team `Lean Cyber Advisory` (`team_TNuSJBXbtPOKEuUA8WttfckR`, Hobby) and only the protected Cyber project `cyber-assurance-demo` (`prj_MAZHxsTn7QiPcgBHBDisua0UQklI`). No Webmaster project exists. The available connector deployment action exposes no declared input capable of binding a local candidate, project name, source head/tree, or `target=preview` before mutation; no authenticated Vercel CLI/project link is present. Therefore Preview is **NOT_CREATED** under the approved stop condition. The existing Cyber project was not changed.

## Known limits and next owner

- NOT_VERIFIED: real Windows 11 Chrome/Edge, real iPadOS Safari, all physical Xbox/PlayStation USB/Bluetooth combinations, and human/child play-feel judgment.
- NOT_CREATED: Vercel Preview, because the available first-project action could not prove Preview-only semantics and exact source identity before execution.
- Browser harness limitation: the recovered Chrome headless shell did not deliver Playwright native mouse movement; the rendered K/M journey uses DOM-dispatched mouse drag events through the production `InputManager` and records that limitation. Keyboard input uses Playwright device events.
- WebKit launch is blocked by host libraries and yields no application verdict.

Next owner: `WEBMASTER_QA` independently re-reviews the frozen remediation candidate diff, focused regressions, rendered persistence journey, exact evidence correction, save semantics, Gamepad simulation, source/asset provenance, and stated gaps. The Product Owner alone decides WM-001 acceptance or further repair. No merge or production action follows implicitly.
