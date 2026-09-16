# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm005.spec.ts >> WM005 held web survives rooftop contact keyboard-mouse
- Location: e2e\wm005.spec.ts:93:30

# Error details

```
Error: page.evaluate: Error: attached roof contact: {"active":true,"paused":false,"safe":false,"health":100,"maxHealth":100,"progress":1,"progressLabel":"First gap: jump and hold the close ring, then let go.","position":{"x":-15.426295108194507,"y":15.951962772559442,"z":24.26605445256706},"grounded":false,"fps":28,"cameraAlpha":-1.5707963267948966,"cameraBeta":1.6470000000000007,"cameraRadius":15.85,"cameraPosition":{"x":-15.494949209285318,"y":18.019410399692344,"z":11.420969385590109},"inputSource":"keyboard-mouse","velocity":{"x":12.095382281821905,"y":-1.005162235673911,"z":-45.180958448968596},"swing":{"phase":"SWING_ATTACHED","web":{"anchorId":"ring-1","anchor":{"x":0,"y":16,"z":29},"length":15.528265983181923,"origin":"right-wrist","age":20.083333333333474},"targetId":"ring-1","held":true,"freshRequired":false,"phaseTime":0,"message":"Web held. Press forward to build momentum for a loop; let go to release.","attachments":1,"releases":0,"collisions":2},"hand":{"x":-14.866295108194507,"y":17.98196277255944,"z":24.976054452567062},"skyline":{"active":true,"stage":0,"completed":false,"completions":0,"anchors":["ring-1"],"released":false,"reattached":false,"leftRoof":true,"lastAnchor":"ring-1","valid":true},"traversal":{"phase":"SWING_ATTACHED","surfaceId":null,"targetId":null,"pullId":null,"webOrigin":null,"phaseTime":0,"freshClimb":false,"freshPull":false,"heldClimb":false,"heldPull":false,"message":"South of practice: follow the Climb & Pull arrows.","cameraMode":"ground"},"training":{"active":false,"stage":0,"checkpoint":0,"completed":false,"completions":0,"valid":true,"swingAttached":false,"swingReleased":false,"wallStart":null,"vertical":0,"lateral":0,"ceilingStart":null,"ceilingDistance":0,"pulledDistance":0,"stepped":false},"pullObjects":[{"id":"route-step","role":"PULLABLE_LIGHT","position":{"x":0,"y":0.65,"z":-51},"initial":{"x":0,"y":0.65,"z":-51},"half":{"x":1.5,"y":0.65,"z":1.5},"speed":0},{"id":"limited-crate","role":"PULLABLE_LIMITED","position":{"x":4,"y":0.55,"z":-57},"initial":{"x":4,"y":0.55,"z":-57},"half":{"x":0.75,"y":0.55,"z":0.75},"speed":0},{"id":"heavy-crate","role":"TOO_HEAVY","position":{"x":4,"y":1,"z":-49},"initial":{"x":4,"y":1,"z":-49},"half":{"x":1,"y":1,"z":1},"speed":0},{"id":"ordinary-crate","role":"ORDINARY_SOLID","position":{"x":7,"y":0.9,"z":-55},"initial":{"x":7,"y":0.9,"z":-55},"half":{"x":0.9,"y":0.9,"z":0.9},"speed":0}],"legPose":{"blend":0.9999999999999999,"phase":-0.3048598956612473,"angle":0.6104877742181661},"gait":{"phase":0.8428787231008057,"weight":6.612494909026509e-62,"hips":[-0.6345712143633978,-0.6345712143633978],"knees":[4.9277598549034065e-76,6.879544363160997e-79],"arms":[0.4124712893362086,0.4124712893362086],"lift":-1.1617700375971137e-78},"course":{"version":1,"next":0,"completed":false,"active":false,"valid":true,"released":true,"completions":0},"legWorld":[{"hip":{"x":-15.646295547485352,"y":17.411962509155273,"z":24.266054153442383},"tip":{"x":-15.646295547485352,"y":16.17692200064659,"z":25.18598609805107},"forwardDisplacement":0.9199319446086882},{"hip":{"x":-15.206295013427734,"y":17.411962509155273,"z":24.266054153442383},"tip":{"x":-15.206295013427734,"y":16.17692200064659,"z":25.18598609805107},"forwardDisplacement":0.9199319446086882}],"surfaceCameraBlend":0,"heroPitch":0}
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
      - generic: 0, 12, 13 • 30 FPS
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
    - region "Swing status":
      - text: "SWING: Hold E / LT • release to let go"
      - strong: Attached to ring 1
      - generic: Web held. Press forward to build momentum for a loop; let go to release.
  - status: "Checkpoint: First gap: jump and hold the close ring, then let go."
```