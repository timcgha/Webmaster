# Webmaster roadmap

Working backlog kept in-repo. Historical briefs lived in `timcgha/product-operating-model` (not reachable from this agent environment). Update this file when sprint scope changes.

## Current release

- **Accepted root:** WM-006 follow-ups #1–#3 on `main` (gated combat input, mid-training save resume, faster adaptive recovery)
- **Previews:** `/wm003-preview/` … `/wm006-preview/` preserved; preview saves stay namespaced

## Deferred product themes (post–WM-006 brief)

Originally deferred under WM-006 brief r1 / roadmap r4; candidates for a future WM-007 brief:

1. Live AI (autonomous opposing characters, not training props)
2. Enemy manipulation
3. Upgrades
4. Elaborate mixed-button combos

Do not start these without an authorized change brief.

## Follow-ups (engineering / process)

Highest signal first. These are authorized as backlog tracking; each still needs a bounded assignment before implementation unless noted.

1. **Gate combat input to the playground** — ~~ungated presses caused street/course kick hops.~~ **Done (PR #11):** presses and `stepCombat` require an active playground.
2. **Combat save vs resume** — ~~snapshots only kept `{version, completed}` and load always started inactive.~~ **Done (PR #12):** quiet mid-playground saves store `active`/`stage`/`finalPart` and Continue resumes that station; badge-only saves stay unchanged.
3. **Adaptive recovery vs degrade** — ~~recovery was only −0.1 after five ≥55 FPS seconds while degrade could jump +0.45.~~ **Done (PR #13):** heavily scaled sessions recover −0.3–0.45 after three solid ≥55 FPS seconds; near-native still waits five seconds at −0.2. Middling 45 FPS still cannot recover; degrade path unchanged for SwiftShader floor reach.
4. **Inherited e2e overlays are brittle** — `scripts/wm006-prepare-inherited.mjs` string-patches historical specs. Any copy/structure change in wm001–005 can break exact-source gates without a product bug.
5. **Preview packaging duplication** — near-copy wm004/5/6 package/storage/integrity scripts. Next preview risks a wrong `webmaster.wm00N-preview.v1:` namespace (save isolation failure).
6. **README / status docs lag** — keep root README and this roadmap aligned with the accepted release. *(Addressed: README leads on WM-006.)*
7. **Physical Edge/ROG out of CI PASS claims** — paired FPS can green under SwiftShader exceptions; play-feel still needs sponsor devices. Keep this boundary explicit in SELF_REVIEW_PASS criteria.

## Next gate

Open an authorized WM-007 (or bounded follow-up) brief before coding deferred themes or picking follow-ups #4–#5 as a sprint.
