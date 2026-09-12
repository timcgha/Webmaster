# WM-003 implementation evidence

Author: WEBMASTER_IMPLEMENTER, assignment WM-003-IMPLEMENTATION-I1, runtime /root/webmaster_implementer_wm003. This package is Implementer evidence. Independent QA, Pages publication and sponsor acceptance are separate Product Owner transitions.

Authority: product-operating-model commit 9c4ac718bcee8528af687b5a7200259fc5249aba, changes/WM-003.md, blob fb1071343f2cb856e9613aeeebb2b7e9daf7cb33, revision r1. Base: merged WM-002 6ae9d2ea23f212be31709e76ff5a3302c96cc3b4 / 37053c069a9e839f8f9a42a85a8bc3554795c089.

## Exact result

Product behavior is38065d798dafe7db0b88421d4243e84f93cd1f04. Final product/test/build/harness byte manifest is05384ae258f7e77ba550df17b503b577ef6cb43a / e50c8623bb1e7fe638aa6fbee2163f778d80c3f5. Later evidence-only commit preserves all listed bytes. Deterministic148/148 PASS. The complete rendered command returned41/42 with one presentation camera-harness timing failure; its corrected case passed3/3 repetitions. This is not a single full-suite PASS. Independent QA must run its required complete suite. Fresh temporary82-file graph and full compiled route PASS. See verification-summary.json for source-phase distinctions and every limitation.

## Reading this package

- `design.md` explains authored geometry, finite thresholds, state rules, controls, checkpoints and original procedural presentation.
- `gates/` records command arguments, actual exit status and complete output for locked install, deterministic tests, TypeScript, production/Pages builds and dependency audits.
- `attempts/` retains development failures and the first successful keyboard route. A failed attempt remains failed; later evidence does not relabel it.
- `captures/` contains ordinary keyboard, semantic-controller and timing-profile journeys. Filenames with keyboard/controller/cross-sprint/near-30/uneven prefixes correspond to complete real gameplay routes, without fixture movement.
- Explicitly labeled negative lifecycle and invalid-finish probes use the existing test-only fixture interface. They are falsification evidence, never route-completion evidence.
- `legacy-saves/` contains synthetic records serialized by the exact historical WM-001/WM-002 SaveStore bytes, with source/hash attribution. These are not sponsor save data. The browser loads them without rewriting their generations, and the cross-sprint test continues through actual four-gap skyline and S3 routes before saving and reopening the real browser profile.
- `baseline/` preserves the Product Owner's isolated exact merged-WM-002 measurement and videos, including launch recovery history and explicit parent attribution. It is neither candidate evidence nor independent QA.
- The final source and artifact manifests bind product, test, build and configuration bytes separately from later evidence-only additions. Earlier in-progress measurements show baseline HEAD plus a dirty working tree; the accompanying worktree manifest is their actual tested source identity.

## Acceptance evidence map

| Brief criteria | Implementer verification |
| --- | --- |
| AC-01 | Complete unchanged WM-001/WM-002 keyboard/controller/save/lifecycle suites; old-writer records; genuine cross-sprint journey |
| AC-02–04 | Authored type, distance/facing/obstruction/hold, local wall movement, ceiling junction/movement/edge/detach deterministic probes; actual wall/ceiling route views |
| AC-05 | Upright blended route camera; ordinary/swing camera regression; wall/ceiling/drop/pull views and complete route videos; human comfort remains pending |
| AC-06–08 | Eligible deterministic target selection, stable hand web, range/cone/weight/obstruction/collision/separation/speed and repeated release tests; actual moved crate and heavy/blocked rendered feedback |
| AC-09 | Real entry swing, vertical/lateral climb, ceiling distance, safe drop, designated crate displacement and standing/jump-to-finish; required-stage/invalid placement/replay/checkpoint negatives |
| AC-10–12 | Explicit mutually exclusive states, held-input/focus/disconnect/pause cleanup, every unsafe-save phase, old writer byte preservation, safe checkpoint/object reset, actual save/close/reopen |
| AC-13–14 | Original config and body lattice tests, actual front/three-quarter views, actual backward/forward leg phases and landing blend, unchanged physics capsule |
| AC-15 | Fixed-step genuine route at 30/60/120 and uneven frame schedules; rendered near-30/uneven journeys; candidate/baseline FPS; 12-cycle post-GC heap/DOM/listener observations |
| AC-16 | Exact locked install, complete deterministic/browser suites, TypeScript, production/Pages build commands, verified fresh temporary Pages graph and compiled route smoke, build/capture/video integrity, both production-only and all-dependency audits |
| AC-17–18 | Pending independent QA and subsequent Product Owner-controlled Pages publication; not claimed by Implementer |

## Reproduction

Use the committed lockfile with `pnpm install --frozen-lockfile`, then `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, and `pnpm exec vite build --base=/Webmaster/`. The workspace output directory accumulated stale chunks despite build success. Use the fresh temporary output wrapper below; the89-file contaminated inventory remains classified separately. No source maps are enabled.

Run the full Chromium suite with `pnpm exec playwright test e2e --project=chromium --workers=1 --reporter=list`. `WM_CHROMIUM_PATH` may identify an available browser executable. The supplied local wrapper `python scripts/run-wm003-browser.py e2e` recovers the exact CFT 153.0.8010.12 executable into a temporary directory and verifies its SHA-256 before launch; it uses the available system FFmpeg 6.1.1 through a clearly identified recorder lookup shim. It does not claim vendor FFmpeg 1011 bytes. Server and browser run in one process tree. The archived browser is a local toolchain prerequisite, not committed application content.

`python scripts/run-wm003-browser.py --built` first builds into a newly created temporary output path, verifies its exact reachable graph, then serves those compiled bytes in the same process tree under `/Webmaster/` and traverses the complete route using real controls. Build inventory records all generated assets and their SHA-256/raw/gzip sizes; public packaging must exclude the build-system `.vite` manifest and add deployment provenance, normalized payload manifest and `.nojekyll` only after independent acceptance.

## Limits

Synthetic standard-mapping controller journeys are not physical compatibility evidence. Actual Windows/controller combinations, Bluetooth, iPadOS/Safari and physical performance remain unverified for WM-003. The old WM-001 software-renderer floor limitation remains historical evidence and is not overwritten by newer samples. Requested timing schedules and functional route success are distinct from measured absolute FPS; any measured floor below 30 remains NOT_MET. Short bounded resource observations do not establish indefinite leak freedom. Original eye shape, palette, body-line readability, leg motion, camera comfort and child enjoyment require sponsor judgment.

No application dependencies or paid/external assets were added. Geometry, lattice, palette and procedural leg motion are original source. Existing Babylon/Havok/Vite/Playwright dependencies and their prior provenance are retained. No merge, main/gh-pages mutation, WM-004 allocation or Sprint 4 work is part of this implementation package.
