# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm005.spec.ts >> WM005 held web survives rooftop contact semantic-controller
- Location: e2e\wm005.spec.ts:93:30

# Error details

```
Error: page.evaluate: Error: attached roof contact: {"active":true,"paused":false,"safe":false,"health":100,"maxHealth":100,"progress":1,"progressLabel":"First gap: jump and hold the close ring, then let go.","position":{"x":-5.125947245414645,"y":13.301827194439085,"z":13.582849669157536},"grounded":false,"fps":30,"cameraAlpha":-1.5707963267948966,"cameraBeta":1.6362369742359733,"cameraRadius":15.85,"cameraPosition":{"x":-7.046975377954873,"y":15.352487971975602,"z":-1.2608267340774333},"inputSource":"gamepad","velocity":{"x":28.544128106820946,"y":2.9786371836878383,"z":-8.997067718032563},"swing":{"phase":"SWING_ATTACHED","web":{"anchorId":"ring-1","anchor":{"x":0,"y":16,"z":29},"length":15.414103931140477,"origin":"right-wrist","age":20.083333333333474},"targetId":"ring-1","held":true,"freshRequired":false,"phaseTime":0,"message":"Web held. Press forward to build momentum for a loop; let go to release.","attachments":1,"releases":0,"collisions":2},"hand":{"x":-4.565947245414645,"y":15.331827194439084,"z":14.292849669157537},"skyline":{"active":true,"stage":0,"completed":false,"completions":0,"anchors":["ring-1"],"released":false,"reattached":false,"leftRoof":true,"lastAnchor":"ring-1","valid":true},"traversal":{"phase":"SWING_ATTACHED","surfaceId":null,"targetId":null,"pullId":null,"webOrigin":null,"phaseTime":0,"freshClimb":false,"freshPull":false,"heldClimb":false,"heldPull":false,"message":"South of practice: follow the Climb & Pull arrows.","cameraMode":"ground"},"training":{"active":false,"stage":0,"checkpoint":0,"completed":false,"completions":0,"valid":true,"swingAttached":false,"swingReleased":false,"wallStart":null,"vertical":0,"lateral":0,"ceilingStart":null,"ceilingDistance":0,"pulledDistance":0,"stepped":false},"pullObjects":[{"id":"route-step","role":"PULLABLE_LIGHT","position":{"x":0,"y":0.65,"z":-51},"initial":{"x":0,"y":0.65,"z":-51},"half":{"x":1.5,"y":0.65,"z":1.5},"speed":0},{"id":"limited-crate","role":"PULLABLE_LIMITED","position":{"x":4,"y":0.55,"z":-57},"initial":{"x":4,"y":0.55,"z":-57},"half":{"x":0.75,"y":0.55,"z":0.75},"speed":0},{"id":"heavy-crate","role":"TOO_HEAVY","position":{"x":4,"y":1,"z":-49},"initial":{"x":4,"y":1,"z":-49},"half":{"x":1,"y":1,"z":1},"speed":0},{"id":"ordinary-crate","role":"ORDINARY_SOLID","position":{"x":7,"y":0.9,"z":-55},"initial":{"x":7,"y":0.9,"z":-55},"half":{"x":0.9,"y":0.9,"z":0.9},"speed":0}],"legPose":{"blend":0.9999999999999999,"phase":-1,"angle":-0.5720682343075003},"gait":{"phase":0.5506217855919768,"weight":2.1892698216759503e-62,"hips":[0.4871473619988581,0.4871473619988581],"knees":[6.1327992857174575e-77,1.716643310224415e-80],"arms":[-0.3166457852992578,-0.3166457852992578],"lift":-3.2466007427162364e-79},"course":{"version":1,"next":0,"completed":false,"active":false,"valid":true,"released":true,"completions":0},"legWorld":[{"hip":{"x":-5.345947265625,"y":14.76182746887207,"z":13.582849502563477},"tip":{"x":-5.345947265625,"y":13.34024457335472,"z":12.990648415088653},"forwardDisplacement":-0.5922010874748231},{"hip":{"x":-4.905947685241699,"y":14.76182746887207,"z":13.582849502563477},"tip":{"x":-4.905947685241699,"y":13.34024457335472,"z":12.990648415088653},"forwardDisplacement":-0.5922010874748231}],"surfaceCameraBlend":0,"heroPitch":0}
    at Object.until (eval at evaluate (:311:30), <anonymous>:49:58)
    at async eval (eval at evaluate (:311:30), <anonymous>:12:5)
    at async <anonymous>:337:30
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
      - generic: 10, 12, 17 • 28 FPS
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
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
      - strong: Attached to ring 1
      - generic: Web held. Press forward to build momentum for a loop; let go to release.
  - status: "Checkpoint: First gap: jump and hold the close ring, then let go."
```