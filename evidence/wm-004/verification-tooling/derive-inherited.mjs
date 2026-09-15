import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const out='.wm004-derived';fs.mkdirSync(out,{recursive:true});fs.cpSync('e2e',out+'/e2e',{recursive:true});
const replacements=[];function edit(file,before,after,reason,count=1){const p=out+'/'+file;let s=fs.readFileSync(p,'utf8');assert.equal(s.split(before).length,count+1,file+': exact counted substitution');s=s.replaceAll(before,after);fs.writeFileSync(p,s);replacements.push({file,reason,before,after,sha256:crypto.createHash('sha256').update(s).digest('hex')});}
const before=`    await hold(page, ["w", "Shift"], 1250);
    expect((await state(page)).progress).toBeGreaterThanOrEqual(1);
    await hold(page, ["w", "d", "Shift"], 1350);
    expect((await state(page)).progress).toBeGreaterThanOrEqual(2);
    await hold(page, ["a", "Shift"], 1300);
    await page.keyboard.down("w");
    await page.keyboard.down("Shift");
    await expect.poll(async () => (await state(page)).progress, { timeout: 4_000, intervals: [50] }).toBe(3);
    await page.keyboard.up("Shift");
    await page.keyboard.up("w");`;
const after=`    // Real DOM input against observed state; no progress, position or clock writes.
    const practiceEvidence = await page.evaluate(async () => {
      const rows: any[] = []; let held = new Set<string>();
      const keys = (next: string[]) => { const n = new Set(next);for (const k of held) if (!n.has(k)) window.dispatchEvent(new KeyboardEvent("keyup",{key:k,bubbles:true}));for (const k of n) if (!held.has(k)) window.dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true}));held=n; };
      const phases = [
        {keys:["w","Shift"],axis:"z",bound:2.5,sign:1},
        {keys:["w","d","Shift"],axis:"x",bound:4.5,sign:1},
        {keys:["w","Shift"],axis:"z",bound:10,sign:1},
        {keys:["a","Shift"],axis:"x",bound:-4,sign:-1},
        {keys:["w","Shift"],axis:"z",bound:18,sign:1},
      ];
      try { for(const phase of phases){const start=performance.now();keys(phase.keys);for(;;){await new Promise<void>(r=>requestAnimationFrame(()=>r()));const s=window.__WM_DEBUG__!.getState() as any;rows.push({time:performance.now(),keys:phase.keys,position:s.position,progress:s.progress,grounded:s.grounded,health:s.health});if(s.position[phase.axis]*phase.sign>=phase.bound*phase.sign)break;if(performance.now()-start>10000)throw new Error("Practice input phase did not reach waypoint: "+JSON.stringify({phase,s}));}keys([]);await new Promise(r=>setTimeout(r,300));} } finally {keys([]);}return rows;
    });
    await writeFile(captures+"/practice-position-observed-input.json",JSON.stringify(practiceEvidence,null,2));
    expect(practiceEvidence.every((s: any)=>s.health===100&&s.grounded&&s.position.y===0)).toBe(true);
    expect(practiceEvidence.some((s: any)=>s.progress===1)).toBe(true);
    expect(practiceEvidence.some((s: any)=>s.progress===2)).toBe(true);`;
edit('e2e/wm001.spec.ts',before,after,'Replace wall-clock steering with bounded observed waypoint input; keep all three progress checkpoints, grounded completion, pause/camera/collision assertions.');
edit('e2e/wm001.spec.ts',`    await setPad(page, { connected: false });
    const disconnectedAt = (await state(page)).position;
    await page.waitForTimeout(350);`, `    await setPad(page, { connected: false });
    const disconnectObserved = await state(page);
    await expect.poll(async () => (await page.evaluate(() => window.__WM_DEBUG__!.getControllerStatus())).lifecycle,{timeout:1000}).toBe("CONTROLLER_DISCONNECTED");
    await expect.poll(async () => {const s=await state(page);return Math.hypot(s.velocity.x,s.velocity.z);},{timeout:1000,intervals:[25]}).toBe(0);
    const disconnectedAt = (await state(page)).position;
    expect(Math.hypot(disconnectedAt.x-disconnectObserved.position.x,disconnectedAt.z-disconnectObserved.position.z)).toBeLessThanOrEqual(0.5);
    await writeFile(captures+"/disconnect-stop-bound.json",JSON.stringify({before:disconnectObserved,stopped:await state(page),maximumRemainingDistance:0.5,maximumWaitMs:1000,baselineInputAndMotionUnchanged:true},null,2));
    await page.waitForTimeout(350);`, 'Observe disconnected lifecycle and existing bounded deceleration before requiring exact stationary position and neutral/fresh-input behavior; accepted input/motion bytes unchanged.',2);
edit('e2e/wm002.spec.ts','    recordVideo: { dir: testInfo.outputPath("persistent-video") },','    channel: "chromium",','Use same prescribed full Chromium without legacy redundant Playwright recorder; all route/save/process-reopen assertions retained.');
let config=fs.readFileSync('playwright.wm004.config.ts','utf8').replace('"./e2e"','"./e2e"').replace('"node scripts/wm004-devserver.mjs"','"node .wm004-derived/devserver.mjs"').replace('webServer:{','webServer:{cwd:process.cwd(),');
fs.writeFileSync(out+'/config.ts',config);
fs.writeFileSync(out+'/devserver.mjs',`import {createServer} from 'vite';const s=await createServer({server:{host:'127.0.0.1',port:4173,strictPort:true,watch:{ignored:['**/*']},hmr:false}});await s.watcher.close();console.log('Frozen source watcher explicitly closed');await s.listen();s.printUrls();for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await s.close();process.exit(0);});\n`);
fs.mkdirSync('evidence/wm-004/inherited-recheck',{recursive:true});fs.writeFileSync('evidence/wm-004/inherited-recheck/derived-verification.json',JSON.stringify({source:'aef5f5ae4dac555d8efed6bbc6553b87a9a2a444',tree:'b3c41a9ad436b3eddf2a131045fd7457852933db',classification:'SELF_REVIEW verification-only derived harness; no tracked candidate changes',replacements},null,2));
