# Webmaster

Webmaster is an original, child-friendly third-person 3D web game. WM-002 adds Swing Across the Skyline to the merged WM-001 foundation: cross four rooftop gaps, release with momentum, catch a second ring in mid-air, turn toward the finish, and save safely for a later visit. The original practice route remains available.

WM-002 is a draft review candidate. Independent QA and publication are controlled by the Product Owner; sponsor physical testing and play-feel acceptance remain pending. Climbing, pulling, combat, enemies, the boss, costumes, and the remaining full level belong to later approved sprints.

## Play

Use a current desktop browser with WebGL enabled. iPad landscape plus an external controller is a v1 target, but touchscreen-only gameplay is intentionally outside scope.

| Action | Keyboard and mouse | Xbox-style standard pad | PlayStation-style standard pad |
| --- | --- | --- | --- |
| Move / menu | WASD or arrows | Left stick or D-pad | Left stick or D-pad |
| Look | Mouse drag | Right stick | Right stick |
| Jump / select | Space or Enter | A | Cross |
| Run | Shift | Right trigger | R2 |
| Hold web / release web | Hold / release E | Hold / release LT | Hold / release L2 |
| Recenter camera | R | Right-stick click | Right-stick click |
| Pause / back | Escape | Menu / B | Options / Circle |

Controller menus do not require a mouse or typing. A disconnected controller releases all actions so keyboard/mouse can continue. A reconnected controller must first return to neutral, then receive fresh input.

## Swing route

Follow the yellow arrow near the far end of the practice roof. Look up toward a glowing ring with mouse drag or the right stick. A yellow ring is in reach; hold the web control and jump while moving forward, then release to sail onto the next roof. The first gap has a catch platform below it. The long third gap requires releasing ring 3 and catching ring 4 before landing. Turn right on the next roof to find the final ring. Pause offers Replay skyline route after the route starts.

The white web leaves the hero’s right wrist. Only authored rings within range, aim and a clear line of sight can attach. Gravity stays active; gentle movement steers the arc, and release keeps current momentum. Grounded checkpoint progress requires a genuine crossing, including the required release and reattachment.

## Saving

- Three local slots each keep a manual save and a separate rolling checkpoint.
- Manual Save and Save & Quit are available from pause only when the run was safely grounded, settled after landing, and outside any web or recovery state when pause began.
- Save & Quit leaves play only after a pending intent, inactive-generation bytes, and commit pointer are verified and the pending intent is successfully removed.
- Every record has two alternating generations plus a checksummed pending-intent fence. A returned failure leaves the target fenced off so only the prior committed generation can load.
- With no pending intent, a missing or invalid pointer deterministically recovers the unique highest valid generation.
- Continue chooses the newest valid manual save or checkpoint across all slots. Load exposes both kinds explicitly.
- Existing WM-001 saves retain their version and keys. An optional versioned skyline checkpoint records earned route progress; rope, anchor, velocity and held-input state are never saved. Loads restore a safe position on the earned roof.
- Saves are promised only for the same device, browser profile, and exact site origin. There are no accounts, cloud saves, or cross-browser guarantees.

## Develop and verify

Requirements: Node 24 and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm exec playwright install chromium webkit
pnpm test:e2e
pnpm exec vite build --base=/Webmaster/
node scripts/wm002-built-smoke.mjs
```

In a constrained runtime, set `WM_CHROMIUM_PATH` to a compatible Chromium executable before `pnpm test:e2e:chromium`. The rendered suite labels Gamepad API input as simulation; it is not physical-controller proof.

WM-002 implementation, acceptance mapping, timing, performance, size and capture evidence are in [evidence/wm-002/implementation-report.md](evidence/wm-002/implementation-report.md). The browser suite uses one worker so performance samples do not overlap other rendered journeys. Simulated PlayStation/Xbox input is separate from physical compatibility, which remains a sponsor test.

Historical WM-001 implementation and evidence details are in [evidence/wm-001/implementation-report.md](evidence/wm-001/implementation-report.md). The first independent-QA repair is recorded in [evidence/wm-001/remediation-r1-report.md](evidence/wm-001/remediation-r1-report.md).

## Architecture and assets

- TypeScript, Vite, Babylon.js scoped ESM imports, and Babylon Havok.
- Semantic input actions isolate game logic from keyboard/mouse and standard Gamepad mappings.
- A capped accumulator drives fixed-step motion while rendering remains independent.
- All visible art is original procedural geometry, color, text, and CSS authored in this repository. There are no copied character models, logos, textures, music, or sound.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency provenance.



## WM-005 / Sprint 5 candidate

Rounded Blocks and Free Traversal is an isolated candidate under the adopted single-agent SELF_REVIEW arrangement. The normal GitHub Pages game remains accepted WM-004 until separate sponsor release authority.

- Restrained rounded hero blocks retain original, surface-painted white eyes and sun-spider emblem; mask/body web lines share a gray palette.
- Every clear exterior building face can be climbed with C / RB / R1; arrows teach a route. At a ceiling lip, keep holding climb to reach the fascia, then press forward/up to climb onto the platform.
- E / LT / L2 keeps a valid web through roof contact. Release deliberately. Sustained forward input on the same web builds momentum; after a few seconds it can power a real vertical loop where there is room.
- The twenty-ring course returns to its first ring. Catch it again to finish a lap and continue immediately. Completed older course saves stay completed; repeated-lap progress is separate.
- The planned /wm005-preview/ uses separate save/settings keys. Existing normal-game records and prior previews are preserved.

Exact criteria and limits: timcgha/product-operating-model, changes/WM-005.md r1; roadmap r3. Technical checks and rendered evidence must pass before preview publication. Synthetic controller/renderer results do not establish physical device compatibility. No combat, paid assets/services, merge or normal-root replacement in this assignment.
