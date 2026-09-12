# WM-001 evidence index

All captures in this directory are generated from the candidate application through Playwright. Screenshots show the actual canvas plus semantic HTML UI, not mockups. Videos record rendered journeys; they do not prove physical hardware compatibility or human play feel.

| Evidence | What it shows | Fixture / limitation |
| --- | --- | --- |
| `captures/chromium-main-1280x720.png` | Normal launch and controller-focusable main menu | Headless Linux Chromium |
| `captures/chromium-hero-front-ordinary-camera.png` | Full-head mask, oval white eyes, front web lines, and original chest emblem | Ordinary orbit after real movement through the first marker; no position fixture |
| `captures/chromium-route-complete.png` | Actual progress 3 after keyboard traversal | Labelled fixture places the hero only at the route start; subsequent traversal is real input |
| `captures/wm001-keyboard-route.webm` | Movement, jump, mouse-event orbit, recenter, collision, traversal, pause freeze, and fresh-input resume | DOM-dispatched mouse drag was used because native mouse injection was not delivered by the recovered headless shell; keyboard events are Playwright device input |
| `captures/chromium-simulated-xbox-route.png` and `captures/wm001-simulated-gamepad-route.webm` | Controller-only menu/play/save/return journey | Standard Gamepad API simulation, not a physical pad |
| `captures/chromium-controller-diagnostics.png` | Persistent Xbox-family READY state, local diagnostic details, and deliberate Copy Diagnostics result | Standard Gamepad API simulation in headless Linux Chromium; no physical pad |
| `captures/chromium-controller-ready-hud.png` | Persistent controller-ready state in the gameplay HUD | Standard Gamepad API simulation in headless Linux Chromium; no physical pad |
| `captures/chromium-controller-diagnostics-1194x834-representative-ipad-layout-not-safari.png` | PlayStation-family READY state and diagnostic view at the target landscape dimensions | Chromium viewport simulation only; not iPadOS/Safari or physical-controller proof |
| `captures/chromium-controller-r2-performance-comparison.json` | Frozen baseline versus controller-remediation FPS in the identical recovered browser/runtime | Absolute floor remains unmet in that software renderer; this is comparison evidence, not a performance PASS |
| `captures/chromium-airborne-safe-save-disabled.png` | Save and Save & Quit disabled with an explanation while airborne | Real jump; no fixture |
| `captures/chromium-recovery-fixture-labelled.png` | Full-health retry after four non-scary fall recoveries | Each out-of-bounds position is explicitly labelled as fixture setup |
| `captures/chromium-persistent-reopen.png` | Hard manual save restored after persistent profile close/reopen at the exact same origin | Browser automation, same persistent Chromium user-data directory |
| `captures/chromium-invalid-save-fixtures.png` | Corrupt and incompatible records remain explicit | Injected localStorage fixtures are labelled setup |
| `captures/chromium-storage-unavailable-explicit.png` | Storage unavailable state and refused destructive replacement | Injected Storage API failure |
| `captures/chromium-failed-save-stays-paused.png` | Failed Save & Quit remains paused and preserves prior bytes | Injected write failure |
| `captures/chromium-overwrite-cancel-preserves-slot.png` | Overwrite cancellation leaves occupied-slot bytes unchanged | Existing slot created by normal journey |
| `captures/chromium-1920x1080.png` | Full-HD layout and rendered 3D scene | Headless Linux software rendering |
| `captures/chromium-1194x834-representative-ipad-layout-not-safari.png` | Representative iPad landscape responsive layout | Chromium viewport only; explicitly not iPad/Safari proof |
| `captures/chromium-second-timing-profile.png` | Rendered play under a second CPU/frame profile | Chromium CDP 2× CPU throttling |
| `captures/chromium-performance-samples.json` | Historical accepted-candidate 1920×1080 one-second frame samples | Preserved unchanged from the pre-controller-remediation candidate. See `controller-remediation-r2-report.md` for the corrected candidate's same-runtime comparison and current host limitation. |

See `implementation-report.md` for original command provenance, `remediation-r1-report.md` for the AC-05 atomic-save repair, `controller-remediation-r2-report.md` for F-CTRL-01 implementation and revalidation, and `physical-controller-run-sheet.md` for hardware observations and remaining gaps.
Capture byte integrity is recorded in `capture-sha256.txt`. The selected keyboard video is 19.88 seconds / 426,812 bytes; the simulated-gamepad video is 12.52 seconds / 251,723 bytes. Both are VP9, 640×360 evidence transcodes of the original Playwright recordings.
