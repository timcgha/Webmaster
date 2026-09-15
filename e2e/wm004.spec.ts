import {test,expect,type Page} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import {COURSE_NODES} from "../src/core/course";
import {state,start,controllerStart,keyboard,controller,padTap,look} from "./routes/wm003-route";
const out="evidence/wm-004/captures";
type Controls=ReturnType<typeof keyboard>;
async function until(p:Page,body:(s:any,a:any)=>boolean,args:unknown=null,timeout=30000){
  await p.waitForFunction(({body,args})=>new Function("s","a",`return (${body})(s,a)`)(window.__WM_DEBUG__!.getState(),args),{body:body.toString(),args},{timeout});
}
const at=(p:Page,axis:"x"|"z",target:number,sign=1)=>until(p,(s,a)=>a.sign*(s.position[a.axis]-a.target)>=0,{axis,target,sign});
async function shot(p:Page,name:string){await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/${name}.png`});}
async function center(p:Page,c:Controls,b:{x:number,z:number}){
  await c.up("Shift");
  for(let n=0;n<8;n++){
    const s=await state(p),dx=b.x-s.position.x,dz=b.z-s.position.z;
    if(Math.hypot(dx,dz)<.85)break;
    const f={x:-Math.cos(s.cameraAlpha),z:-Math.sin(s.cameraAlpha)},forward=dx*f.x+dz*f.z,side=dx*f.z-dz*f.x;
    const along=Math.abs(forward)>Math.abs(side),k=along?(forward>0?"w":"s"):(side>0?"d":"a");
    const axis=Math.abs(along?f.x:f.z)>.8?"x":"z",target=b[axis],sign=Math.sign(target-s.position[axis]);
    await c.down(k);await at(p,axis,target-sign*.55,sign);await c.up(k);await p.waitForTimeout(400);
  }
  expect(Math.hypot((await state(p)).position.x-b.x,(await state(p)).position.z-b.z)).toBeLessThan(1.8);
}
async function replayStart(p:Page,c:Controls,pad:boolean){
  await c.press("Escape");await expect(p.getByRole("heading",{name:"Paused"})).toBeVisible();
  if(pad){await padTap(p,12);await padTap(p,0);}else await p.getByRole("button",{name:/Replay 20-ring/}).click();
  await c.look(-Math.PI/2,1.65);await p.waitForTimeout(300);
  expect((await state(p)).course).toMatchObject({valid:true,next:0});
}
async function fullCourse(p:Page,c:Controls,label:string){
  const records:any[]=[];
  async function captureAnchor(id:string){await until(p,(s,a)=>s.swing.web?.anchorId===a,id);records.push({expected:id,state:await state(p)});}
  const fly=async(axis:"x"|"z",target:number,id:string,sign=1)=>{await c.down("e");await captureAnchor(id);await at(p,axis,target,sign);await c.up("e");};
  await c.down("Shift");await c.down("w");await at(p,"z",-39);await c.press("Space");
  await until(p,s=>s.position.y>1.25);await fly("z",-23.5,"training-ring");
  await until(p,s=>s.grounded);await at(p,"z",21);await c.down("e");await c.press("Space");await captureAnchor("ring-1");await at(p,"z",37);await c.up("e");
  await until(p,s=>s.skyline.stage===1);await at(p,"z",53);await c.down("e");await c.press("Space");await captureAnchor("ring-2");await at(p,"z",76.5);await c.up("e");
  await until(p,s=>s.skyline.stage===2);await at(p,"z",95);await c.down("e");await c.press("Space");await captureAnchor("ring-3");await at(p,"z",122);await c.up("e");
  await at(p,"z",123.2);await fly("z",152,"ring-4");await until(p,s=>s.skyline.stage===3);
  await at(p,"z",165.5);await c.up("w");await p.waitForTimeout(650);await c.look(Math.PI,1.65);
  await c.down("w");await at(p,"x",5);await c.down("e");await c.press("Space");await captureAnchor("ring-5");await at(p,"x",20);await c.up("e");
  await until(p,s=>s.skyline.stage===4);await at(p,"x",34.5);await c.up("w");await p.waitForTimeout(650);
  for(let n=0;n<14;n++){
    const a=COURSE_NODES[n]!,b=COURSE_NODES[n+1]!,axis=a.x===b.x?"z":"x",sign=Math.sign(b[axis]-a[axis]);
    const alpha=axis==="x"?(sign>0?Math.PI:0):(sign>0?-Math.PI/2:Math.PI/2);
    await center(p,c,a);await c.look(alpha,1.65);await c.down("Shift");await c.down("w");
    await at(p,axis,a[axis]+sign*5,sign);await c.press("Space");await until(p,s=>s.position.y>2.25);
    await fly(axis,a[axis]+sign*18,`ring-${n+6}`,sign);
    await c.up("w");await c.down("s");await until(p,s=>s.grounded);await c.up("s");await p.waitForTimeout(900);
    expect((await state(p)).position.y,`roof after ring ${n+6}`).toBeCloseTo(1);
    await center(p,c,b);
    if([0,3,7,10,13].includes(n))await shot(p,`${label}-ring-${n+6}-landing`);
  }
  await until(p,s=>s.course.completed);
  expect((await state(p)).course).toMatchObject({next:20,valid:true,completed:true,completions:1});
  expect(records.map(x=>x.expected)).toEqual(["training-ring",...Array.from({length:19},(_,i)=>`ring-${i+1}`)]);
  await shot(p,`${label}-complete-course`);
  await writeFile(`${out}/${label}-20-ring-route.json`,JSON.stringify({method:"Ordinary menu start and keyboard/mouse or Gamepad API semantic input; no fixture positions or progression writes",records,finish:await state(p)},null,2));
}
async function groundReturn(p:Page,c:Controls,label:string){
  await c.up("Shift");await c.look(-Math.PI/2,1.1);await c.down("w");
  await at(p,"z",21);await c.up("w"); // Walk off the actual final roof, then land uninterrupted.
  await until(p,s=>s.grounded&&s.position.y===-18);await p.waitForTimeout(450);
  expect((await state(p)).health).toBe(100);expect((await state(p)).safe).toBe(true);
  const landed=await state(p);await shot(p,`${label}-natural-street-landing`);
  await c.look(Math.PI/2,1.1);await c.down("w");await c.down("c");
  await until(p,s=>s.traversal.surfaceId==="course-roof-14");
  await until(p,s=>s.position.y>-9);await c.up("w");await shot(p,`${label}-street-wall-climb`);
  await c.down("w");await until(p,s=>s.grounded&&s.position.y===1, null,30000);
  await c.up("w");await c.up("c");await p.waitForTimeout(500);
  expect((await state(p)).health).toBe(100);expect((await state(p)).traversal.surfaceId).toBeNull();
  await shot(p,`${label}-recovered-rooftop`);
  await writeFile(`${out}/${label}-ground-recovery.json`,JSON.stringify({method:"Normal rooftop walk-off, street landing, walking approach and held climb/top-out; no fixture",landed,returned:await state(p)},null,2));
}
for(const pad of [false,true]) test(`WM004 complete twenty-ring course and ground recovery ${pad?"semantic-controller":"keyboard-mouse"}`,async({page},info)=>{
  test.setTimeout(600000);const errors:string[]=[];page.on("pageerror",e=>errors.push(String(e)));
  const label=pad?"controller":"keyboard";
  try{
    if(pad)await controllerStart(page);else await start(page);
    const c=pad?controller(page):keyboard(page);await replayStart(page,c,pad);await fullCourse(page,c,label);await groundReturn(page,c,label);
    expect(errors).toEqual([]);
  }finally{await mkdir(out,{recursive:true});await writeFile(`${out}/${label}-last-state.json`,JSON.stringify({source:process.env.GITHUB_SHA,state:await state(page).catch(()=>null),errors},null,2));await page.screenshot({path:info.outputPath("last.png")});}
});

test("WM004 hero front rear side idle walking and movement transitions",async({page})=>{
  test.setTimeout(120000);await start(page);await page.setViewportSize({width:1920,height:1080});
  for(const[name,alpha]of[["rear",-Math.PI/2],["front",Math.PI/2],["side",0]]as const){
    await look(page,alpha,1.35);await page.waitForTimeout(400);await shot(page,`hero-idle-${name}`);
    // Strafe relative to each review camera: actual input and movement; never writes a pose.
    const key=name==="rear"?"w":name==="front"?"s":"d";
    await page.keyboard.down(key);await page.waitForTimeout(450);await shot(page,`hero-walking-${name}`);
    await page.keyboard.up(key);await page.waitForTimeout(700);await shot(page,`hero-stop-${name}`);
  }
  await look(page,Math.PI/2,1.1);await page.keyboard.down("Shift");await page.keyboard.down("a");await page.waitForTimeout(350);await shot(page,"hero-running-transition");
  await page.keyboard.press("Space");await page.waitForTimeout(150);await shot(page,"hero-jumping-transition");await page.keyboard.up("a");await page.keyboard.up("Shift");
  await writeFile(`${out}/hero-rig-state.json`,JSON.stringify(await state(page),null,2));
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
