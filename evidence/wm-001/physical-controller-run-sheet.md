# WM-001 physical controller run sheet

No physical device or controller was available to the Implementer. Every row below is **NOT_VERIFIED** and must remain so until a named tester records the exact hardware, OS/browser version, connection method, and observed full route.

## Preserved sponsor failure observation

The sponsor reported that the initial GitHub Pages candidate at `https://timcgha.github.io/Webmaster/` loaded and worked with keyboard input, but neither an Xbox-family nor a PlayStation-family controller responded over USB on a Windows laptop. The observation applies to failed source baseline `bc93105d5fdd96f278d1a5722ddfc55c5b725cde` and Pages baseline `c8bb364886c0067dec74bc1ce166320c526e41bf`. Exact controller models, Windows/browser versions, browser-reported mappings, and lifecycle diagnostics were not available in that build, so this is preserved as **FAILED_REPORTED**, not silently converted into a completed compatibility row.

The route is: normal launch → controller-only New Game/slot/difficulty → settings change → move/run/jump → camera orbit/recenter → pause while moving and verify release → Save Game → Save & Quit → Continue → Load manual and checkpoint → disconnect while moving → keyboard/mouse continuation where applicable → reconnect neutral → fresh controller input.

| Host target | Browser | Controller family | Connection | Status | Exact model / versions / tester / date / notes |
| --- | --- | --- | --- | --- | --- |
| Windows laptop | Chrome | Xbox | USB | NOT_VERIFIED | TBD |
| Windows laptop | Chrome | Xbox | Bluetooth | NOT_VERIFIED | TBD |
| Windows laptop | Edge | Xbox | USB | NOT_VERIFIED | TBD |
| Windows laptop | Edge | Xbox | Bluetooth | NOT_VERIFIED | TBD |
| Windows laptop | Chrome | PlayStation | USB | NOT_VERIFIED | TBD |
| Windows laptop | Chrome | PlayStation | Bluetooth | NOT_VERIFIED | TBD |
| Windows laptop | Edge | PlayStation | USB | NOT_VERIFIED | TBD |
| Windows laptop | Edge | PlayStation | Bluetooth | NOT_VERIFIED | TBD |
| iPad | Safari | Xbox | Bluetooth | NOT_VERIFIED | TBD; only where iPadOS/controller support the combination |
| iPad | Safari | Xbox | USB | NOT_VERIFIED | TBD; only where iPad/controller/adapter support the combination |
| iPad | Safari | PlayStation | Bluetooth | NOT_VERIFIED | TBD; only where iPadOS/controller support the combination |
| iPad | Safari | PlayStation | USB | NOT_VERIFIED | TBD; only where iPad/controller/adapter support the combination |

Touchscreen-only gameplay is outside v1 and is not an alternate pass route.
