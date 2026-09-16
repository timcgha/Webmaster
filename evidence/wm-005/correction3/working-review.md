WM-005 C3 actual working correction — WEBMASTER_PRODUCT_OWNER SELF_REVIEW; not independentQA.
Parent a5ef60b893b746f1b1792cbec270872783ffa128 / c6df58481ac7a21546a510f25aad2a0720d2c534.
C2verifyjob104694649379 FAILED inherited37/40;398unit,TS,6storage,build/audits,7freshvisual,6compiled andfinal462-source hashesPASS. Overallrun35065467172 still awaits performance at this checkpoint.
F-WM005-SR-11 reopened route driver: retained screenshot shows x≈-5,y0,z9, blocked at cyan obstacle centred(-6.5,11). Remote key-release after x<-3.5 overshot into collision approach. Real collision is correct; C3same-frame DOM waypoint release and braking in clear finish lane, no source-state/progress writes.
F-WM005-SR-08 additional inherited disconnect check: sampled z-6.0466667 before groundbraking ended; laterz-6.0216667. Current core/actions/motion unchanged from earlier passing baseline. C3observe disconnect, require exact0XZvelocity within500ms and<.5m residual, then exactno-motion and deliberate replacement checks. Same limits as previously corrected disconnect case.
F-WM005-SR-12 resource observation:12samples nodes[265,265,265,254,254,265,265,265,254,265,254,265],listeners77throughout,heap28.3→28.9MB. Source renderHud replaces11text nodes during play between separate GC/count RPCs. C3samples same ordinary paused UI beforeGC/counters, resumes eachcycle;4MiB/10node/2listener bounds unchanged. No runtime leak established by this alternating series.
Actual2-file test working diff retained; no gameplay/runtime mutation. Test-list syntax validation selected precisely3cases. No C3execution orPASS yet. This is final authorizedcycle3/3; no historical work counted and no new permission sought. Runtime evidence reuse is eligible only after exact diff proof and C2performance result; if performancefails, bounded real repair must be included beforeC3freeze.
CloudBrowser publicrootWM004 cannotinitializeWebGL ('WebGL not supported'); this is a known verifierenvironment limitation, not WM005regression. ExistingWindowsChromium remains publicverificationroute. Native priorPagesrun35049632934 includes allthree.nojekyll files in its tar usingupload-pages-artifactv3; preserve andHTTP-verify them withtheotherfiles, no speculative hidden-file exclusion.

Actual diff follows:

--- a/e2e/wm001.spec.ts
+++ b/e2e/wm001.spec.ts
@@ -236,18 +236,32 @@
     expect(blocked.position.z).toBeLessThan(-2.05);
 
     await page.evaluate(() => window.__WM_DEBUG__!.setFixturePosition({ x: 0, y: 0, z: -8 }, "route start only"));
-    // Observe actual route coordinates rather than relying on wall-clock travel
-    // distances, which vary on software rendering and can miss the finish lane.
-    await page.keyboard.down("Shift");await page.keyboard.down("w");
-    await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().position.z>3,null,{timeout:15000});
-    expect((await state(page)).progress).toBeGreaterThanOrEqual(1);
-    await page.keyboard.down("d");
-    await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().progress===2,null,{timeout:15000});
-    await page.keyboard.up("w");await page.keyboard.up("d");await page.keyboard.down("a");
-    await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().position.x < -3.5,null,{timeout:15000});
-    await page.keyboard.up("a");await page.keyboard.down("w");
-    await page.waitForFunction(()=>window.__WM_DEBUG__!.getState().progress===3,null,{timeout:15000});
-    await page.keyboard.up("Shift");await page.keyboard.up("w");await page.waitForTimeout(100);
+    // Release keys in the same browser frame as the waypoint. A remote RPC
+    // after observing X can arrive late enough to walk into the cyan obstacle.
+    const routeSamples=await page.evaluate(async()=>{
+      const held=new Set<string>(),samples:any[]=[];
+      const keys=(...wanted:string[])=>{const next=new Set(wanted);
+        for(const k of new Set([...held,...next]))if(held.has(k)!==next.has(k))
+          window.dispatchEvent(new KeyboardEvent(next.has(k)?'keydown':'keyup',{key:k,code:k==='Shift'?'ShiftLeft':`Key${k.toUpperCase()}`,bubbles:true}));
+        held.clear();for(const k of next)held.add(k);
+      };
+      const until=async(check:(s:any)=>boolean,label:string)=>{const begun=performance.now();
+        while(!check(window.__WM_DEBUG__!.getState())){if(performance.now()-begun>15000)throw new Error(`${label}: ${JSON.stringify(window.__WM_DEBUG__!.getState())}`);await new Promise(requestAnimationFrame);}
+        samples.push({label,state:window.__WM_DEBUG__!.getState()});
+      };
+      try{
+        keys('Shift','w');await until(s=>s.position.z>3,'first gate');
+        keys('Shift','w','d');await until(s=>s.progress===2,'sun pad');
+        keys('Shift','a');await until(s=>s.position.x < -2.6,'finish lane');
+        keys();await until(s=>s.velocity.x===0&&s.velocity.z===0,'braked before obstacle');
+        keys('Shift','w');await until(s=>s.progress===3,'finish earned');
+        keys();await until(s=>s.velocity.x===0&&s.velocity.z===0,'finish stopped');
+      }finally{keys();}
+      return samples;
+    });
+    await writeFile(`${captures}/${browserName}-practice-route-frame-inputs.json`,JSON.stringify({method:'Same-frame ordinary DOM keyboard waypoint input; position/progress/time read-only, route-start fixture remains labelled',routeSamples},null,2));
+    const lane=routeSamples.find(x=>x.label==='braked before obstacle')!.state.position;
+    expect(lane.x).toBeGreaterThan(-4.8);expect(lane.x).toBeLessThan(-2.2);
     expect((await state(page)).progress).toBe(3);
     expect((await state(page)).grounded).toBe(true);
     await page.screenshot({ path: `${captures}/${browserName}-route-complete.png` });
@@ -538,12 +552,17 @@
     await setPad(page, { axes: [0, -1, 0, 0] });
     await page.waitForTimeout(250);
     await setPad(page, { connected: false });
+    await page.waitForFunction(()=>window.__WM_DEBUG__!.getControllerStatus().lifecycle==='CONTROLLER_DISCONNECTED');
+    const brakingAt=(await state(page)).position;
+    await page.waitForFunction(()=>{const v=window.__WM_DEBUG__!.getState().velocity;return v.x===0&&v.z===0;},undefined,{timeout:500});
     const disconnectedAt = (await state(page)).position;
+    expect(Math.hypot(disconnectedAt.x-brakingAt.x,disconnectedAt.z-brakingAt.z)).toBeLessThan(.5);
     await page.waitForTimeout(350);
     expect((await state(page)).position).toEqual(disconnectedAt);
     await expect(page.locator(".controller-hud-card")).toContainText("Controller disconnected");
 
     await hold(page, ["w"], 250);
+    await page.waitForFunction(()=>{const v=window.__WM_DEBUG__!.getState().velocity;return v.x===0&&v.z===0;},undefined,{timeout:500});
     const keyboardAt = (await state(page)).position;
     expect(keyboardAt.z).toBeGreaterThan(disconnectedAt.z);
 
--- a/e2e/wm003.spec.ts
+++ b/e2e/wm003.spec.ts
@@ -641,6 +641,11 @@
     expect(s.surfaceCameraBlend).toBe(0);
     expect(s.pullObjects.every((o) => o.speed === 0)).toBe(true);
     await page.waitForTimeout(350);
+    // Compare identical quiescent pause screens. During play the HUD replaces
+    // eleven text nodes between GC and the separate DOM-counter RPC, producing
+    // 254/265-node oscillation without retained growth. Preserve the same limits.
+    await page.keyboard.press("Escape");
+    await expect(page.getByRole("heading",{name:"Paused",exact:true})).toBeVisible();
     await cdp.send("HeapProfiler.collectGarbage");
     const heap = await cdp.send("Runtime.getHeapUsage"),
       dom = await cdp.send("Memory.getDOMCounters");
@@ -649,14 +654,17 @@
       heap: heap.usedSize,
       nodes: dom.nodes,
       listeners: dom.jsEventListeners,
+      screen: "paused",
+      connectedElements: await page.locator("*").count(),
     });
+    await page.getByRole("button",{name:/Resume/}).click();
   }
   await writeFile(
     info.outputPath("resources.json"),
     JSON.stringify(
       {
         method:
-          "12 ordinary S3 replay/pause/save/Continue cycles; 350ms settled UI then post-GC heap and DOM/listeners; finite warmup bounds",
+          "12 ordinary S3 replay/pause/save/Continue cycles; same ordinary paused UI then post-GC heap and DOM/listeners; unchanged finite warmup bounds",
         measurements,
       },
       null,
@@ -673,7 +681,7 @@
     JSON.stringify(
       {
         method:
-          "12 ordinary S3 replay/pause/save/Continue cycles; post-GC heap and DOM/listeners; finite warmup bounds",
+          "12 ordinary S3 replay/pause/save/Continue cycles; same ordinary paused UI, post-GC heap and DOM/listeners; unchanged finite warmup bounds",
         measurements,
       },
       null,

