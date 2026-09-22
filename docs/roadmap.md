# Webmaster roadmap

Working backlog kept in-repo. Historical briefs lived in `timcgha/product-operating-model` (not reachable from this agent environment). Update this file when sprint scope changes.

## Current release

- **Accepted root:** WM-006 follow-ups #1–#7 on `main` (gated combat through shared packaging; CI vs Edge/ROG claim boundary)
- **This change:** WM-007 Live AI slice 1 — ski-masked bank robber in Combat Playground ([brief](./wm007-brief.md))
- **Previews:** `/wm003-preview/` … `/wm007-preview/` (wm007 ships with this change); saves stay namespaced via `scripts/preview/catalog.mjs`

## Deferred product themes (post–WM-006 / remaining WM-007)

Authorized WM-007 lead is **Live AI**. Still deferred within or beyond this brief:

1. ~~Live AI (autonomous opposing characters)~~ — **In progress (slice 1: bank robber)**
2. Enemy manipulation
3. Upgrades
4. Elaborate mixed-button combos
5. Open-city live AI spawns (beyond Combat Playground)

Do not expand scope without updating [wm007-brief.md](./wm007-brief.md).

## Follow-ups (engineering / process)

Highest signal first. These are authorized as backlog tracking; each still needs a bounded assignment before implementation unless noted.

1. **Gate combat input to the playground** — ~~ungated presses caused street/course kick hops.~~ **Done (PR #11):** presses and `stepCombat` require an active playground.
2. **Combat save vs resume** — ~~snapshots only kept `{version, completed}` and load always started inactive.~~ **Done (PR #12):** quiet mid-playground saves store `active`/`stage`/`finalPart` and Continue resumes that station; badge-only saves stay unchanged.
3. **Adaptive recovery vs degrade** — ~~recovery was only −0.1 after five ≥55 FPS seconds while degrade could jump +0.45.~~ **Done (PR #13):** heavily scaled sessions recover −0.3–0.45 after three solid ≥55 FPS seconds; near-native still waits five seconds at −0.2. Middling 45 FPS still cannot recover; degrade path unchanged for SwiftShader floor reach.
4. **Inherited e2e overlays are brittle** — ~~`scripts/wm006-prepare-inherited.mjs` string-patches historical specs.~~ **Done:** marker/regex transforms fail closed; combat invite/button copy tracks product; generated `e2e/wm006-refresh-*.spec.ts` stay untracked.
5. **Preview packaging duplication** — ~~near-copy wm004/5/6 package/storage/integrity scripts.~~ **Done:** `scripts/preview/catalog.mjs` is the namespace source of truth; shared build/package/integrity/storage plus thin wrappers; shared `preview/shared/preview-storage.mjs` factory.
6. **README / status docs lag** — keep root README and this roadmap aligned with the accepted release. *(Addressed: README leads on WM-006 / WM-007.)*
7. **Physical Edge/ROG out of CI PASS claims** — ~~paired FPS can green under SwiftShader exceptions; play-feel still needs sponsor devices.~~ **Done:** [self-review-pass-criteria.md](./self-review-pass-criteria.md) + `scripts/self-review-claims.mjs`.

## Next gate

Finish WM-007 slice 1 (bank robber) acceptance, then either open-city live AI or the next deferred theme under an updated brief.
