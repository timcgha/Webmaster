import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const dir='.wm004-derived',changes=[];function edit(file,before,after,reason){const p=dir+'/'+file,s=fs.readFileSync(p,'utf8');assert.equal(s.split(before).length,2,file+' unique substitution');const n=s.replace(before,after);fs.writeFileSync(p,n);changes.push({file,reason,before,after,sha256:crypto.createHash('sha256').update(n).digest('hex')});}
edit('e2e/wm002.spec.ts','import { writeFile } from "node:fs/promises";','import { mkdir, writeFile } from "node:fs/promises";\nimport {installCourseControls} from "./routes/wm004-route";','Reuse exact candidate test input helper, with real DOM key codes and actual browser frames.');
const s=fs.readFileSync(dir+'/e2e/wm002.spec.ts','utf8'),begin=s.indexOf('  await look(page, 0, 170); // Raise aim'),end=s.indexOf('  expect((await state(page)).skyline)',begin);assert.ok(begin>=0&&end>begin);
edit('e2e/wm002.spec.ts',s.slice(begin,end),`  await installCourseControls(page,false);
  const observed = await page.evaluate(async()=>{
    const c=(window as any).__wm004Controls,rows:any[]=[];
    const note=(label:string)=>rows.push({label,time:performance.now(),state:c.state()});
    const jump=async()=>{c.keys('Shift','w','e','Space');await c.frame();c.keys('Shift','w','e');};
    const fly=async(axis:string,end:number,id:string)=>{await c.until((s:any)=>s.swing.web?.anchorId===id,'real '+id);note('attached '+id);await c.at(axis,end);c.keys('Shift','w');note('released '+id);};
    try{
      await c.look(-Math.PI/2,1.65);c.keys('Shift','w');await c.at('z',21);await jump();await fly('z',37,'ring-1');await c.until((s:any)=>s.skyline.stage===1,'first landing');note('landing1');
      await c.at('z',53);await jump();await fly('z',76.5,'ring-2');await c.until((s:any)=>s.skyline.stage===2,'second landing');note('landing2');
      await c.at('z',95);await jump();await fly('z',122,'ring-3');await c.at('z',123.2);c.keys('Shift','w','e');await fly('z',152,'ring-4');await c.until((s:any)=>s.skyline.stage===3,'third landing');note('landing3');
      await c.at('z',165.5);await c.rest(650);await c.look(Math.PI,1.65);c.keys('Shift','w');await c.at('x',5);await jump();await fly('x',20,'ring-5');await c.until((s:any)=>s.skyline.stage===4,'fourth landing');await c.at('x',34.5);await c.rest(850);note('finish');
      return {method:'Fresh ordinary start, same four gaps, five exact anchors and midair reattachment; DOM keyboard/mouse on real RAF, no source-state/time writes. No screenshot transport while motion is held.',rows,inputs:c.events,anchors:c.anchors,finish:c.state()};
    }finally{c.keys();}
  });
  expect(observed.anchors.map((x:any)=>x.expected)).toEqual(['ring-1','ring-2','ring-3','ring-4','ring-5']);
  expect(observed.rows.every((x:any)=>x.state.health===100)).toBe(true);
  await mkdir(root,{recursive:true});
  await writeFile(root+'/real-frame-'+profile+'.json',JSON.stringify(observed,null,2));
`, 'Replace delayed transport around jump/release/turn with observed real-frame keyboard inputs. Preserve every completion/validity/safe/save/reopen assertion and both actual scheduling profiles; add exact five-anchor and health assertions.');
edit('e2e/wm002.spec.ts','async function keyboardRoute(page: Page, captures = true) {','async function keyboardRoute(page: Page, captures = true, profile = "ordinary") {','Name retained route input evidence per original timing profile.');
edit('e2e/wm002.spec.ts','    await keyboardRoute(page, false);','    await keyboardRoute(page, false, name);','Retain each timing profile separately.');
edit('e2e/routes/wm003-route.ts','import { mkdir, writeFile } from "node:fs/promises";','import { mkdir, writeFile } from "node:fs/promises";\nimport {installCourseControls} from "./wm004-route";','Use semantic controller on real browser frames only for final crate/ledge jumps.');
const before=`  // Jump east onto the moved crate, then turn west for the higher ledge.
  await controls.down("w");`;
const after=`  // The controller press helper waits across several transport round-trips;
  // retained failure showed stepped=true but then ran off the crate toX-2.
  // Observe the real support and stop at its center before the second jump.
  if(prefix === "controller") {
    await installCourseControls(p,true);
    const crateEvidence=await p.evaluate(async()=>{
      const c=(window as any).__wm004Controls,rows:any[]=[];
      const note=(label:string)=>rows.push({label,time:performance.now(),state:c.state()});
      try{
        const crate=c.state().pullObjects.find((o:any)=>o.id==='route-step');note('actual moved crate');
        c.keys('w');await c.at('x',crate.position.x-2.2);c.keys('w','Space');await c.frame();c.keys('w');
        await c.at('x',crate.position.x-.3);c.keys();await c.until((s:any)=>s.grounded&&s.position.y>1.2&&s.position.y<1.4,'real crate support');await c.rest(450);note('supported on moved crate');
        if(!c.state().training.stepped||c.state().safe)throw Error('Real dynamic support must earn step and still forbid save');
        await c.look(0,1.1);c.keys('w');await c.at('x',crate.position.x-1.1,-1);c.keys('w','Space');await c.frame();c.keys('w');
        await c.until((s:any)=>s.training.completed,'real gold ledge finish');await c.rest(650);note('earned gold ledge finish');
        return {method:'Semantic Gamepad API only; actual browser-frame input, real moved crate support, jump and earned ledge; no position/progression/time writes.',rows,inputs:c.events};
      }finally{c.keys();}
    });
    await writeFile(out+'/controller-crate-finish-frames.json',JSON.stringify(crateEvidence,null,2));
    await shot(p,prefix+'-combined-finish');return;
  }
  // Jump east onto the moved crate, then turn west for the higher ledge.
  await controls.down("w");`;
edit('e2e/routes/wm003-route.ts',before,after,'Controller only: replace fixed-delay final two jumps with same semantic inputs tied to actual moved crate support. Entire preceding swing/wall/ceiling/pull route and all following save/load/keyboard-fallback assertions retained.');
fs.writeFileSync('evidence/wm-004/inherited-recheck/four-case-derived-verification.json',JSON.stringify({source:'aef5f5ae4dac555d8efed6bbc6553b87a9a2a444',tree:'b3c41a9ad436b3eddf2a131045fd7457852933db',classification:'SELF_REVIEW verification-only; candidate tracked source unchanged',changes},null,2));
