# WM-007 change brief — Live AI (bank robber)

**Authorized by:** WEBMASTER_PRODUCT_OWNER (in-repo assignment)  
**Scope lead:** Live AI — autonomous opposing characters (not training props)  
**First slice:** one basic bank robber in a ski mask inside **Combat Playground**  
**Deferred (same brief, not this slice):** open-city spawns, enemy manipulation, upgrades, elaborate mixed-button combos

## Intent

Combat Playground today teaches with passive boxes, a moving web dummy, and a scripted dodge pad. WM-007 introduces a **live opponent** that faces the hero, telegraphs, and strikes on its own clock.

## Acceptance (slice 1)

1. After the existing five training stations, a sixth station **BANK ROBBER** spawns one ski-masked robber (procedural block figure; original art only).
2. Robber AI runs in the fixed combat step: idle → approach → telegraph → strike → recover; soft bump if the hero is hit without a successful dodge; defeat when HP reaches 0.
3. Hero punch / kick / web can damage the robber (any attack kind). Focus / pad interrupt still clears combat transients (`clearCombat`).
4. Quiet mid-playground save/resume keeps `stage` / `finalPart` only (no mid-strike opponent persistence in this slice).
5. Deterministic unit tests cover telegraph, dodge vs bump, defeat → playground complete, and inactive playground (no AI damage while combat inactive).
6. Preview packaging: `wm007` catalog entry + isolated `webmaster.wm007-preview.v1:` saves (publish when accepted).

## Non-goals (slice 1)

- City roaming AI, multiple robbers, guns, hostages, or bank interior set pieces  
- Grab / throw (enemy manipulation)  
- Upgrades or new combo graphs  
- Claiming Edge/ROG play-feel from CI FPS (`docs/self-review-pass-criteria.md`)

## Verification

`pnpm test` (combat + existing suites), TypeScript build, storage isolation for wm007 when packaged. Rendered Combat Playground journey optional for this slice if unit coverage holds the AI clock.
