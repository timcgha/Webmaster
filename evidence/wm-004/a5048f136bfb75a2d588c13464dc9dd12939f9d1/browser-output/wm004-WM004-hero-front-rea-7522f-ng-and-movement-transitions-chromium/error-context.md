# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm004.spec.ts >> WM004 hero front rear side idle walking and movement transitions
- Location: e2e\wm004.spec.ts:85:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Tearing down "context" exceeded the test timeout of 120000ms.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - region "Current objective":
      - text: SKYLINE 1 / 4
      - strong: "First gap: jump and hold the close ring, then let go."
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 36, -18, 38 • 13 FPS
      - generic: "Street recovery: follow the mint paths to a striped wall. Hold C / RB / R1 and climb up onto its roof."
    - status:
      - generic: CONTROLLER
      - strong: "Controller: press any button or move a stick to connect"
    - generic:
      - strong: Move
      - text: WASD / Left Stick
      - strong: Look
      - text: Drag / Right Stick
      - strong: Jump
      - text: Space / A / ✕
      - strong: Run
      - text: Shift / RT / R2
      - strong: Swing
      - text: Hold E / LT / L2, release to let go
      - strong: Climb
      - text: Hold C / RB / R1
      - strong: Pull
      - text: Hold Q / LB / L1
      - strong: Recenter
      - text: R / RS
      - strong: Pause
      - text: Esc / Menu / Options
    - region "Swing status":
      - text: "SWING: Hold E / LT • release to let go"
      - strong: Find a glowing ring
      - generic: Aim at a glowing ring. Walk toward the skyline arrows.
  - status: "Checkpoint: First gap: jump and hold the close ring, then let go."
```