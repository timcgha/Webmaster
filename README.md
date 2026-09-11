# Webmaster

Webmaster is an original, child-friendly third-person 3D web game. This branch contains the WM-001 playable foundation: start a run, move through a vivid practice route, pause safely, save locally, close the browser, and return through Continue or Load.

WM-001 is a review candidate, not a merged or released product. Swinging, climbing, pulling, combat, enemies, the boss, costumes, and the authored full level belong to later approved sprints.

## Play

Use a current desktop browser with WebGL enabled. iPad landscape plus an external controller is a v1 target, but touchscreen-only gameplay is intentionally outside scope.

| Action | Keyboard and mouse | Xbox-style standard pad | PlayStation-style standard pad |
| --- | --- | --- | --- |
| Move / menu | WASD or arrows | Left stick or D-pad | Left stick or D-pad |
| Look | Mouse drag | Right stick | Right stick |
| Jump / select | Space or Enter | A | Cross |
| Run | Shift | Right trigger | R2 |
| Recenter camera | R | Right-stick click | Right-stick click |
| Pause / back | Escape | Menu / B | Options / Circle |

Controller menus do not require a mouse or typing. A disconnected controller releases all actions so keyboard/mouse can continue. A reconnected controller must first return to neutral, then receive fresh input.

## Saving

- Three local slots each keep a manual save and a separate rolling checkpoint.
- Manual Save and Save & Quit are available from pause only when the run was grounded and outside recovery when pause began.
- Save & Quit leaves play only after a write, read-back validation, and commit-pointer advance all succeed.
- Every record has two alternating generations. A failed write keeps the prior valid generation active.
- Continue chooses the newest valid manual save or checkpoint across all slots. Load exposes both kinds explicitly.
- Saves are promised only for the same device, browser profile, and exact site origin. There are no accounts, cloud saves, or cross-browser guarantees.

## Develop and verify

Requirements: Node 24 and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

In a constrained runtime, set `WM_CHROMIUM_PATH` to a compatible Chromium executable before `pnpm test:e2e:chromium`. The rendered suite labels Gamepad API input as simulation; it is not physical-controller proof.

Implementation and evidence details are in [evidence/wm-001/implementation-report.md](evidence/wm-001/implementation-report.md).

## Architecture and assets

- TypeScript, Vite, Babylon.js scoped ESM imports, and Babylon Havok.
- Semantic input actions isolate game logic from keyboard/mouse and standard Gamepad mappings.
- A capped accumulator drives fixed-step motion while rendering remains independent.
- All visible WM-001 art is original procedural geometry, color, text, and CSS authored in this repository. There are no copied character models, logos, textures, music, or sound.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency provenance.
