import {test,expect,type Page} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import {installCourseControls} from "./routes/wm004-route";
import {COURSE_NODES} from "../src/core/course";
import {state,start,controllerStart,keyboard,controller,padTap,look,hudLayout} from "./routes/wm003-route";
const out="evidence/wm-004/captures";
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
  await p.evaluate(async()=>{try{await (window as any).__wm004Controls.legacy();}finally{(window as any).__wm004Controls.keys();}});
  const missed=await p.evaluate(async()=>{try{return await (window as any).__wm004Controls.missFirst();}finally{(window as any).__wm004Controls.keys();}});
  expect(missed).toMatchObject({health:100,grounded:true,position:{y:-18},course:{next:6,valid:true,completed:false}});
  await shot(p,`${label}-missed-ring-street`);await hudLayout(p,`wm004-${label}-missed-street`);
  const climbing=await p.evaluate(async()=>await (window as any).__wm004Controls.approachRecovery());
  await shot(p,`${label}-missed-ring-climbing`);await hudLayout(p,`wm004-${label}-recovery-climbing`);
  const rejoined=await p.evaluate(async()=>{try{return await (window as any).__wm004Controls.finishRecovery();}finally{(window as any).__wm004Controls.keys();}});
  expect(rejoined).toMatchObject({health:100,grounded:true,position:{y:1},course:{next:6,valid:true,completed:false}});await shot(p,`${label}-missed-ring-rejoined`);
  await writeFile(`${out}/${label}-miss-recovery-rejoin.json`,JSON.stringify({method:"Genuine missed extension jump without web; uninterrupted street landing; ordinary walk around to roof4 marked wall; held climb and continuous top-out; walk back and rejoin next intended anchor. No fixture/state/time writes.",missed,climbing,rejoined},null,2));
  for(let n=0;n<14;n++){
    await p.evaluate(async({a,b,n})=>{try{await (window as any).__wm004Controls.extension(a,b,n);}finally{(window as any).__wm004Controls.keys();}},{a:COURSE_NODES[n]!,b:COURSE_NODES[n+1]!,n});
    if([0,3,7,10,13].includes(n))await shot(p,`${label}-ring-${n+6}-landing`);
  }
  await until(p,s=>s.course.completed);
  expect((await state(p)).course).toMatchObject({next:20,valid:true,completed:true,completions:1});
  const data=await p.evaluate(()=>{const c=(window as any).__wm004Controls;return{records:c.anchors,inputs:c.events,finish:c.state()};});
  expect(data.records.map((x:any)=>x.expected)).toEqual(["training-ring",...Array.from({length:19},(_,i)=>`ring-${i+1}`)]);
  await shot(p,`${label}-complete-course`);
  await writeFile(`${out}/${label}-20-ring-route.json`,JSON.stringify({method:"Ordinary menu start, browser-frame DOM keyboard/mouse or Gamepad API semantic input. Source state and time are read-only; no fixture positions/progression writes. Frame sequencing avoids transport latency at roof edges.",...data},null,2));
}
async function groundReturn(p:Page,c:Controls,label:string){
  await c.up("Shift");await c.look(-Math.PI/2,1.1);await c.down("w");
  await at(p,"z",21);await c.up("w"); // Walk off the actual final roof, then land uninterrupted.
  await until(p,s=>s.grounded&&s.position.y===-18);await p.waitForTimeout(450);
  expect((await state(p)).health).toBe(100);expect((await state(p)).safe).toBe(true);
  const landed=await state(p);await shot(p,`${label}-natural-street-landing`);
  await c.look(Math.PI/2,1.1);await c.down("w");await at(p,"z",16.5,-1);await c.up("w");await p.waitForTimeout(500);
  await c.look(-Math.PI/2,1.52);await p.waitForTimeout(500);
  const nearWall=await state(p);expect(nearWall.cameraPosition.z).toBeGreaterThan(16.19);await shot(p,`${label}-close-wall-camera`);
  await c.look(Math.PI/2,1.1);await c.down("w");await c.down("c");
  await until(p,s=>s.traversal.surfaceId==="course-roof-14");
  await until(p,s=>s.position.y>-9);await c.up("w");await shot(p,`${label}-street-wall-climb`);
  await c.down("w");await until(p,s=>s.grounded&&s.position.y===1, null,30000);
  await c.up("w");await c.up("c");await p.waitForTimeout(500);
  expect((await state(p)).health).toBe(100);expect((await state(p)).traversal.surfaceId).toBeNull();
  await shot(p,`${label}-recovered-rooftop`);
  await writeFile(`${out}/${label}-ground-recovery.json`,JSON.stringify({method:"Normal rooftop walk-off, street landing, walking approach, close-wall camera and held climb/top-out; no fixture",landed,nearWall,returned:await state(p)},null,2));
  await hudLayout(p,`wm004-${label}-roof`);
}
for(const pad of [false,true]) test(`WM004 complete twenty-ring course and ground recovery ${pad?"semantic-controller":"keyboard-mouse"}`,async({page},info)=>{
  test.setTimeout(600000);const errors:string[]=[];page.on("pageerror",e=>errors.push(String(e)));
  const label=pad?"controller":"keyboard";
  try{
    if(pad)await controllerStart(page);else await start(page);
    const c=pad?controller(page):keyboard(page);await replayStart(page,c,pad);await fullCourse(page,label);await groundReturn(page,c,label);
    expect(errors).toEqual([]);
  }finally{await mkdir(out,{recursive:true});await writeFile(`${out}/${label}-last-state.json`,JSON.stringify({source:process.env.GITHUB_SHA,state:await state(page).catch(()=>null),inputs:await page.evaluate(()=>(window as any).__wm004Controls?.events).catch(()=>null),anchors:await page.evaluate(()=>(window as any).__wm004Controls?.anchors).catch(()=>null),errors},null,2));await page.screenshot({path:info.outputPath("last.png")});}
});

test("WM004 street safe save reopen Continue preserves position and generations",async({page,context})=>{
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
