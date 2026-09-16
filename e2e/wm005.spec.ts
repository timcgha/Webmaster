import {test,expect,type Page} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import {installCourseControls} from "./routes/wm005-route";
import {COURSE_NODES} from "../src/core/course";
import {state,start,controllerStart,keyboard,controller,padTap,look,hudLayout} from "./routes/wm003-route";
const out="evidence/wm-005/captures";
type Controls=ReturnType<typeof keyboard>;
async function until(p:Page,body:(s:any,a:any)=>boolean,args:unknown=null,timeout=30000){
  await p.waitForFunction(({body,args})=>new Function("s","a",`return (${body})(s,a)`)(window.__WM_DEBUG__!.getState(),args),{body:body.toString(),args},{timeout});
}
const at=(p:Page,axis:"x"|"z",target:number,sign=1)=>until(p,(s,a)=>a.sign*(s.position[a.axis]-a.target)>=0,{axis,target,sign});
async function shot(p:Page,name:string){await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/${name}.png`});}
async function replayStart(p:Page,c:Controls,pad:boolean){
  await c.press("Escape");await expect(p.getByRole("heading",{name:"Paused"})).toBeVisible();
  if(pad){
    // Observe the actual selected menu label; never assume a transport-timed
    // D-pad tap selected a particular item or inject a click on the pad route.
    for(let n=0;n<12;n++){
      if(await p.locator('[data-menu-item][aria-current="true"] > span').innerText()==='Replay 20-ring course')break;
      await padTap(p,13);
    }
    await expect(p.locator('[data-menu-item][aria-current="true"] > span')).toHaveText('Replay 20-ring course');await padTap(p,0);
  }else await p.getByRole("button",{name:/Replay 20-ring/}).click();
  await c.look(-Math.PI/2,1.65);await p.waitForTimeout(300);
  expect((await state(p)).position).toEqual({x:0,y:0,z:-42});
  expect((await state(p)).course).toMatchObject({active:true,valid:true,next:0});
}
async function fullCourse(p:Page,label:string){
  await installCourseControls(p,label==="controller");
  await p.evaluate(async()=>{try{await (window as any).__wm005Controls.legacy();}finally{(window as any).__wm005Controls.keys();}});
  const missed=await p.evaluate(async()=>{try{return await (window as any).__wm005Controls.missFirst();}finally{(window as any).__wm005Controls.keys();}});
  expect(missed).toMatchObject({health:100,grounded:true,position:{y:-18},course:{next:6,valid:true,completed:false}});
  await shot(p,`${label}-missed-ring-street`);await hudLayout(p,`wm005-${label}-missed-street`);
  const climbing=await p.evaluate(async()=>await (window as any).__wm005Controls.approachRecovery());
  await shot(p,`${label}-missed-ring-climbing`);await hudLayout(p,`wm005-${label}-recovery-climbing`);
  const rejoined=await p.evaluate(async()=>{try{return await (window as any).__wm005Controls.finishRecovery();}finally{(window as any).__wm005Controls.keys();}});
  expect(rejoined).toMatchObject({health:100,grounded:true,position:{y:1},course:{next:6,valid:true,completed:false}});await shot(p,`${label}-missed-ring-rejoined`);
  await writeFile(`${out}/${label}-miss-recovery-rejoin.json`,JSON.stringify({method:"Genuine missed extension jump without web; uninterrupted street landing; ordinary walk around to roof4 marked wall; held climb and continuous top-out; walk back and rejoin next intended anchor. No fixture/state/time writes.",missed,climbing,rejoined},null,2));
  for(let lap=0;lap<2;lap++){
  if(lap>0)await p.evaluate(async()=>{await (window as any).__wm005Controls.legacy();});
  for(let n=0;n<14;n++){
    await p.evaluate(async({a,b,n})=>{try{await (window as any).__wm005Controls.extension(a,b,n);}finally{(window as any).__wm005Controls.keys();}},{a:COURSE_NODES[n]!,b:COURSE_NODES[n+1]!,n});
    if([0,3,7,10,13].includes(n))await shot(p,`${label}-ring-${n+6}-landing`);
  }
  }
  await p.evaluate(async()=>{await (window as any).__wm005Controls.closeLap();});
  await until(p,s=>s.course.completions===2);
  expect((await state(p)).course).toMatchObject({next:1,valid:true,completed:true,completions:2});
  const data=await p.evaluate(()=>{const c=(window as any).__wm005Controls;return{records:c.anchors,inputs:c.events,finish:c.state()};});
  expect(data.records.map((x:any)=>x.expected)).toEqual([...Array.from({length:2},()=>["training-ring",...Array.from({length:19},(_,i)=>`ring-${i+1}`)]).flat(),"training-ring"]);
  await shot(p,`${label}-complete-course`);
  await writeFile(`${out}/${label}-20-ring-route.json`,JSON.stringify({method:"Ordinary menu start, browser-frame DOM keyboard/mouse or Gamepad API semantic input. Source state and time are read-only; no fixture positions/progression writes. Frame sequencing avoids transport latency at roof edges.",...data},null,2));
}
for(const pad of [false,true])test(`WM005 two complete circuit laps plus ground recovery ${pad?'semantic-controller':'keyboard-mouse'}`,async({page},info)=>{
 test.setTimeout(900000);const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));const label=pad?'controller':'keyboard';
 try{if(pad)await controllerStart(page);else await start(page);const c=pad?controller(page):keyboard(page);
  await replayStart(page,c,pad);await fullCourse(page,label);expect(errors).toEqual([]);
 }finally{await mkdir(out,{recursive:true});await writeFile(`${out}/${label}-last-state.json`,JSON.stringify({state:await state(page).catch(()=>null),errors},null,2));await page.screenshot({path:info.outputPath('last.png')});}
});

test("WM005 street safe save reopen Continue preserves position and generations",async({page,context})=>{
  await start(page);await look(page,Math.PI,1.1);await page.keyboard.down("w");await at(page,"x",15.5);await page.keyboard.up("w");
  await until(page,s=>s.grounded&&s.position.y===-18);await page.waitForTimeout(500);
  const street=await state(page);expect(street.safe).toBe(true);expect(street.health).toBe(100);
  await page.keyboard.press("Escape");await page.getByRole("button",{name:/Save & Quit/}).click();
  await expect(page.getByRole("heading",{name:"WEBMASTER",exact:true})).toBeVisible();
  const stored=await page.evaluate(()=>({...localStorage}));const origin=page.url();await page.close();const reopened=await context.newPage();await reopened.goto(origin);
  await reopened.getByRole("button",{name:/Continue/}).click();await until(reopened,s=>s.safe);
  const loaded=await state(reopened);expect(loaded.position).toEqual(street.position);expect(loaded.velocity).toEqual({x:0,y:0,z:0});
  expect(await reopened.evaluate(()=>({...localStorage}))).toEqual(stored);
  await shot(reopened,"street-save-reopened");await writeFile(`${out}/street-save.json`,JSON.stringify({method:"Real UI Save & Quit, close page and reopen same origin/context (persistent-profile browser restart is a separate release gate)",street,loaded,keys:Object.keys(stored)},null,2));
});


for(const pad of[false,true])for(const pump of[false,true])test(`WM005 ${pump?'sufficient':'insufficient'} momentum vertical orbit ${pad?'semantic-controller':'keyboard-mouse'}`,async({page})=>{
 test.setTimeout(180000);if(pad)await controllerStart(page);else await start(page);await installCourseControls(page,pad);
 const label=`${pad?'controller':'keyboard'}-${pump?'pumped':'low-energy'}`;
 await page.evaluate(async()=>{await (window as any).__wm005Controls.loopSetup();});
 const result=await page.evaluate(async pump=>{
  const c=(window as any).__wm005Controls,first=c.state(),anchor=first.swing.web.anchor;
  const angle=(s:any)=>Math.atan2(s.hand.z-anchor.z,anchor.y-s.hand.y);
  let previous=angle(first),total=0,max=0,reverse=false;const frames:any[]=[];c.keys(...(pump?['w','e']:['e']));
  const start=performance.now();while(performance.now()-start<22000){const s=await c.frame();if(!s.swing.web)throw Error(`Unexpected detach: ${JSON.stringify(s)}`);
   const at=angle(s);let d=at-previous;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;total+=d;max=Math.max(max,total);reverse||=d<-.002;previous=at;
   frames.push({at:performance.now(),angle:at,total,state:s});if(pump&&total>Math.PI*2+.2)break;
  }c.keys('e');return{first,total,max,reverse,frames};
 },pump);
 if(pump)expect(result.total).toBeGreaterThan(Math.PI*2);else{expect(result.reverse).toBe(true);expect(result.max).toBeLessThan(Math.PI*2);}
 expect(result.frames.every(f=>f.state.swing.web?.anchorId==='ring-3')).toBe(true);
 await shot(page,label);await mkdir(out,{recursive:true});await writeFile(`${out}/${label}.json`,JSON.stringify({method:'Ordinary New Game and first two rooftop transfers; ring3 attached through ordinary jump/input; camera/state/time read-only; sustained actual input and angular samples',...result},null,2));
 await page.evaluate(async()=>{const c=(window as any).__wm005Controls;c.keys();await c.frame();await c.until((s:any)=>!s.swing.web,'release');});expect((await state(page)).swing.web).toBeNull();
});
for(const pad of[false,true])test(`WM005 held web survives rooftop contact ${pad?'semantic-controller':'keyboard-mouse'}`,async({page})=>{
 test.setTimeout(120000);if(pad)await controllerStart(page);else await start(page);await installCourseControls(page,pad);
 const result=await page.evaluate(async()=>{const c=(window as any).__wm005Controls;await c.look(-Math.PI/2);c.keys('Shift','w');await c.at('z',20);await c.rest(700);
  // A valid short web cannot reach the far roof while taut. Jump and return to
  // the current roof under the same held web, exercising actual landing contact.
  c.keys('e','Space');await c.frame();c.keys('e');await c.until((s:any)=>s.swing.web?.anchorId==='ring-1'&&!s.grounded,'attached rooftop jump');
  await c.until((s:any)=>s.grounded&&s.position.y===0,'attached roof contact');c.keys('e');
  const start=performance.now(),frames=[];while(performance.now()-start<1000)frames.push(await c.frame());return frames;});
 expect(result.every(s=>s.swing.web?.anchorId==='ring-1'&&s.grounded&&!s.safe)).toBe(true);await shot(page,`${pad?'controller':'keyboard'}-held-roof-web`);
 await writeFile(`${out}/${pad?'controller':'keyboard'}-held-roof-web.json`,JSON.stringify(result,null,2));
});
