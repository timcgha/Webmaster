# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm004.spec.ts >> WM004 complete twenty-ring course and ground recovery semantic-controller
- Location: e2e\wm004.spec.ts:52:32

# Error details

```
Error: page.evaluate: Error: attach training-ring: {"active":true,"paused":false,"safe":true,"health":100,"maxHealth":100,"progress":1,"progressLabel":"Street recovery: follow the mint paths to a striped wall. Hold C / RB / R1 and climb up onto its roof.","position":{"x":-1.0497840267368958e-14,"y":-18,"z":37.51939174888589},"grounded":true,"fps":38,"cameraAlpha":-1.5707963267948966,"cameraBeta":1.6419625002916567,"cameraRadius":10.35,"cameraPosition":{"x":-9.828419641291876e-15,"y":-17.03594831149092,"z":27.195590119504693},"inputSource":"gamepad","velocity":{"x":-4.898587196589413e-16,"y":0,"z":0},"swing":{"phase":"GROUNDED_OR_FREE","web":null,"targetId":null,"held":true,"freshRequired":true,"phaseTime":0,"message":"Nice landing! Release controls before your next swing.","attachments":0,"releases":0,"collisions":7},"hand":{"x":0.5599999999999895,"y":-15.97,"z":38.22939174888589},"skyline":{"active":true,"stage":0,"completed":false,"completions":0,"anchors":[],"released":false,"reattached":false,"leftRoof":true,"lastAnchor":null,"valid":true},"traversal":{"phase":"FREE_OR_GROUNDED","surfaceId":null,"targetId":null,"pullId":null,"webOrigin":null,"phaseTime":0,"freshClimb":false,"freshPull":false,"heldClimb":false,"heldPull":false,"message":"Released safely. Let go of controls, then press again.","cameraMode":"ground"},"training":{"active":false,"stage":0,"checkpoint":0,"completed":false,"completions":0,"valid":true,"swingAttached":false,"swingReleased":false,"wallStart":null,"vertical":0,"lateral":0,"ceilingStart":null,"ceilingDistance":0,"pulledDistance":0,"stepped":false},"pullObjects":[{"id":"route-step","role":"PULLABLE_LIGHT","position":{"x":0,"y":0.65,"z":-51},"initial":{"x":0,"y":0.65,"z":-51},"half":{"x":1.5,"y":0.65,"z":1.5},"speed":0},{"id":"limited-crate","role":"PULLABLE_LIMITED","position":{"x":4,"y":0.55,"z":-57},"initial":{"x":4,"y":0.55,"z":-57},"half":{"x":0.75,"y":0.55,"z":0.75},"speed":0},{"id":"heavy-crate","role":"TOO_HEAVY","position":{"x":4,"y":1,"z":-49},"initial":{"x":4,"y":1,"z":-49},"half":{"x":1,"y":1,"z":1},"speed":0},{"id":"ordinary-crate","role":"ORDINARY_SOLID","position":{"x":7,"y":0.9,"z":-55},"initial":{"x":7,"y":0.9,"z":-55},"half":{"x":0.9,"y":0.9,"z":0.9},"speed":0}],"legPose":{"blend":0,"phase":0,"angle":0},"gait":{"phase":0.42919293861740015,"weight":4.171028793728382e-83,"hips":[1.937510305364769e-81,-3.2054629562722083e-81],"knees":[1.2470664068256565e-84,2.0639418507908088e-81],"arms":[-1.2593816984871e-81,2.0835509215769355e-81],"lift":-1.4666042751375646e-84},"course":{"version":1,"next":0,"completed":false,"active":false,"valid":true,"released":true,"completions":0},"legWorld":[{"hip":{"x":-0.2199999988079071,"y":-16.540000915527344,"z":37.51939010620117},"tip":{"x":-0.2199999988079071,"y":-18.080000915527343,"z":37.51939010620117},"forwardDisplacement":0},{"hip":{"x":0.2199999988079071,"y":-16.540000915527344,"z":37.51939010620117},"tip":{"x":0.2199999988079071,"y":-18.080000915527343,"z":37.51939010620117},"forwardDisplacement":0}],"surfaceCameraBlend":0,"heroPitch":0}
    at until (eval at evaluate (:311:30), <anonymous>:49:58)
    at async fly (eval at evaluate (:311:30), <anonymous>:106:7)
    at async Object.legacy (eval at evaluate (:311:30), <anonymous>:137:7)
    at async eval (eval at evaluate (:311:30), <anonymous>:3:7)
    at async <anonymous>:337:30
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - region "Current objective":
      - text: SKYLINE 1 / 4
      - strong: "Street recovery: follow the mint paths to a striped wall. Hold C / RB / R1 and climb up onto its roof."
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 0, -18, 38 • 38 FPS
      - generic: "Street recovery: follow the mint paths to a striped wall. Hold C / RB / R1 and climb up onto its roof."
    - status:
      - generic: CONTROLLER
      - strong: "Controller ready: PlayStation controller"
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
      - text: "SWING: Hold E / L2 • release to let go"
      - strong: Find a glowing ring
      - generic: Aim at a glowing ring. Walk toward the skyline arrows.
  - status: "Checkpoint: First gap: jump and hold the close ring, then let go."
```