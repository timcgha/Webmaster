# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> WM-001 rendered keyboard and mouse journey >> moves, jumps, orbits, recenters, collides, pauses safely, and completes the real practice route
- Location: .wm004-derived\e2e\wm001.spec.ts:166:3

# Error details

```
Error: page.evaluate: Error: Practice input phase did not reach waypoint: {"phase":{"keys":["w","Shift"],"axis":"z","bound":2.5,"sign":1},"s":{"active":true,"paused":false,"safe":true,"health":100,"maxHealth":100,"progress":0,"progressLabel":"Reach the glowing sky gate","position":{"x":0,"y":0,"z":-8},"grounded":true,"fps":25,"cameraAlpha":-1.5707963267948966,"cameraBeta":1.08,"cameraRadius":10.35,"cameraPosition":{"x":5.58944921683067e-16,"y":6.4282485691982085,"z":-17.128263301259206},"inputSource":"keyboard-mouse","velocity":{"x":0,"y":0,"z":0},"swing":{"phase":"GROUNDED_OR_FREE","web":null,"targetId":null,"held":false,"freshRequired":false,"phaseTime":0,"message":"Aim at a glowing ring. Walk toward the skyline arrows.","attachments":0,"releases":0,"collisions":0},"hand":{"x":0.56,"y":2.03,"z":-7.29},"skyline":{"active":false,"stage":0,"completed":false,"completions":0,"anchors":[],"released":false,"reattached":false,"leftRoof":false,"lastAnchor":null,"valid":false},"traversal":{"phase":"FREE_OR_GROUNDED","surfaceId":null,"targetId":null,"pullId":null,"webOrigin":null,"phaseTime":0,"freshClimb":false,"freshPull":false,"heldClimb":false,"heldPull":false,"message":"Released safely. Let go of controls, then press again.","cameraMode":"ground"},"training":{"active":false,"stage":0,"checkpoint":0,"completed":false,"completions":0,"valid":false,"swingAttached":false,"swingReleased":false,"wallStart":null,"vertical":0,"lateral":0,"ceilingStart":null,"ceilingDistance":0,"pulledDistance":0,"stepped":false},"pullObjects":[{"id":"route-step","role":"PULLABLE_LIGHT","position":{"x":0,"y":0.65,"z":-51},"initial":{"x":0,"y":0.65,"z":-51},"half":{"x":1.5,"y":0.65,"z":1.5},"speed":0},{"id":"limited-crate","role":"PULLABLE_LIMITED","position":{"x":4,"y":0.55,"z":-57},"initial":{"x":4,"y":0.55,"z":-57},"half":{"x":0.75,"y":0.55,"z":0.75},"speed":0},{"id":"heavy-crate","role":"TOO_HEAVY","position":{"x":4,"y":1,"z":-49},"initial":{"x":4,"y":1,"z":-49},"half":{"x":1,"y":1,"z":1},"speed":0},{"id":"ordinary-crate","role":"ORDINARY_SOLID","position":{"x":7,"y":0.9,"z":-55},"initial":{"x":7,"y":0.9,"z":-55},"half":{"x":0.9,"y":0.9,"z":0.9},"speed":0}],"legPose":{"blend":0,"phase":0,"angle":0},"gait":{"phase":0.4285039310848321,"weight":1.1383808308030403e-57,"hips":[3.186218610472386e-56,-5.336905618926855e-56],"knees":[5.342619753772353e-84,3.6194311028169507e-56],"arms":[-2.071042096807051e-56,3.468988652302456e-56],"lift":-3.906589282950972e-59},"course":{"version":1,"next":0,"completed":false,"active":false,"valid":false,"released":true,"completions":0},"legWorld":[{"hip":{"x":-0.2199999988079071,"y":1.4600000381469727,"z":-8},"tip":{"x":-0.2199999988079071,"y":-0.07999996185302738,"z":-8},"forwardDisplacement":0},{"hip":{"x":0.2199999988079071,"y":1.4600000381469727,"z":-8},"tip":{"x":0.2199999988079071,"y":-0.07999996185302738,"z":-8},"forwardDisplacement":0}],"surfaceCameraBlend":0,"heroPitch":0}}
    at eval (eval at evaluate (:311:30), <anonymous>:58:58)
    at async <anonymous>:337:30
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - region "Current objective":
      - text: PRACTICE 1 / 3
      - strong: Reach the glowing sky gate
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 0, 0, -8 • 25 FPS
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
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
    - paragraph: "TEST FIXTURE: route start only"
  - status: Slot 1 started on Normal
```