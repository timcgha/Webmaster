import fs from 'node:fs';
const root='evidence/wm-006/regression-refresh';fs.mkdirSync(root,{recursive:true});
const transformed=[];
for(const n of ['wm001','wm002','wm003']){
 let s=fs.readFileSync(`e2e/${n}.spec.ts`,'utf8');
 // Update selectors for the expanded, truthful combat save explanation; do not
 // change enabled/disabled or lifecycle expectations.
 s=s.replaceAll('name: /Resume/','name: /^Resume/');
 s=s.replace('Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering','Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight');
 if(n==='wm002'){
  s='import {installCourseControls} from "./routes/wm005-route";\n'+s;
  const a=s.indexOf('async function keyboardRoute('),b=s.indexOf('test("WM-002 keyboard',a);
  s=s.slice(0,a)+`async function keyboardRoute(page:Page, captures=true){await currentLegacyRoute(page,false);}\n`+s.slice(b);
  const c=s.indexOf('async function controllerRoute('),d=s.indexOf('test("WM-002 simulated',c);
  s=s.slice(0,c)+`async function controllerRoute(page:Page){await currentLegacyRoute(page,true);}\n`+s.slice(d);
  // The original persistent options tested WM_BROWSER_CHANNEL but did not use
  // it. Match the prescribed full Chromium used by the rest of this exact-source run.
  s=s.replace('headless: true,','headless: true, channel: "chromium",');
  s+=`\nasync function currentLegacyRoute(page:Page,padRoute:boolean){
   if(padRoute){await tap(page,9);for(let n=0;n<12;n++){if(await page.locator('[data-menu-item][aria-current="true"] > span').innerText()==='Replay 20-ring course')break;await tap(page,13);}await expect(page.locator('[data-menu-item][aria-current="true"] > span')).toHaveText('Replay 20-ring course');await tap(page,0);await padReady(page);await page.evaluate(()=>{(window as any).__wm003pad=(window as any).__wm002pad;});}
   else{await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Replay 20-ring/}).click();}
   await installCourseControls(page,padRoute);
   const route=await page.evaluate(async()=>{const c=(window as any).__wm005Controls;try{await c.legacy();return {finish:c.state(),anchors:c.anchors,inputs:c.events};}finally{c.keys();}});
   expect(route.finish.skyline).toMatchObject({stage:4,completed:true,completions:1,valid:true});expect(route.finish.safe).toBe(true);expect(route.finish.swing.web).toBeNull();
   expect(route.anchors.map((x:any)=>x.expected)).toEqual(['training-ring','ring-1','ring-2','ring-3','ring-4','ring-5']);
   await shot(page,padRoute?'controller-refreshed-legacy-finish':'keyboard-refreshed-legacy-finish');
   await writeFile('${root}/'+(padRoute?'controller':'keyboard')+'-legacy.json',JSON.stringify({method:'Exact frozen candidate; existing accepted WM005 browser-frame input sequencer. Ordinary replay menu, all original rooftops plus starting training ring. Actual DOM keyboard/mouse or semantic pad only; no state/position/time/progression changes. No blocking screenshot at airborne handoff.',...route},null,2));
  }\n`;
 }
 const target=`e2e/wm006-refresh-${n}.spec.ts`;fs.writeFileSync(target,s);transformed.push({original:`e2e/${n}.spec.ts`,overlay:target});
}
let s=fs.readFileSync('e2e/wm005.spec.ts','utf8').replace('const out="evidence/wm-005/captures"','const out="evidence/wm-006/regression-refresh/current-course"');
fs.writeFileSync('e2e/wm006-refresh-current-course.spec.ts',s);
fs.writeFileSync(`${root}/method.json`,JSON.stringify({source:process.env.WM_SOURCE,tree:process.env.WM_TREE,transformed,reason:'Refresh outdated text and ambiguous selectors; replace transport-timed roof-edge input with the existing released browser-frame semantic sequencer; persistent browser uses prescribed full Chromium. All original progression, save, pause/focus and lifecycle assertions remain. Original failed evidence preserved. Additional current two-lap course tests exercise full twenty-anchor route on both input routes.',productMutation:false},null,2));
