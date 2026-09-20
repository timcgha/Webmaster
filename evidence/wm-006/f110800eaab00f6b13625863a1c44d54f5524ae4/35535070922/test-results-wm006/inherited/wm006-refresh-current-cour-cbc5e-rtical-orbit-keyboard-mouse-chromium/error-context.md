# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm006-refresh-current-course.spec.ts >> WM005 sufficient momentum vertical orbit keyboard-mouse
- Location: e2e\wm006-refresh-current-course.spec.ts:81:60

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 6.283185307179586
Received:   -0.2321845653828905
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: SKYLINE 3 / 4
        - strong: "Long gap: release ring 3 and catch ring 4 before landing."
      - region "Swing status":
        - text: "SWING: Hold E / LT • release to let go"
        - strong: Attached to ring 3
        - generic: Web held. Press forward to build momentum for a loop; let go to release.
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: "-14, 11, 93 • 60 FPS"
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
      - generic:
        - strong: Try punching, kicking, webs & dodges
        - generic: Esc / Menu / Options → Combat Playground
        - button "Open training menu" [ref=e4] [cursor=pointer]
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
  - status: "Checkpoint: Long gap: release ring 3 and catch ring 4 before landing."
```

# Test source

```ts
  1   | import {menuChoice} from "./routes/wm006-route";
  2   | import {test,expect,type Page} from "@playwright/test";
  3   | import {mkdir,writeFile} from "node:fs/promises";
  4   | import {installCourseControls} from "./routes/wm005-route";
  5   | import {COURSE_NODES} from "../src/core/course";
  6   | import {state,start,controllerStart,keyboard,controller,padTap,look,hudLayout} from "./routes/wm003-route";
  7   | const out="evidence/wm-006/regression-refresh/current-course";
  8   | type Controls=ReturnType<typeof keyboard>;
  9   | async function until(p:Page,body:(s:any,a:any)=>boolean,args:unknown=null,timeout=30000){
  10  |   await p.waitForFunction(({body,args})=>new Function("s","a",`return (${body})(s,a)`)(window.__WM_DEBUG__!.getState(),args),{body:body.toString(),args},{timeout});
  11  | }
  12  | const at=(p:Page,axis:"x"|"z",target:number,sign=1)=>until(p,(s,a)=>a.sign*(s.position[a.axis]-a.target)>=0,{axis,target,sign});
  13  | async function shot(p:Page,name:string){await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/${name}.png`});}
  14  | async function replayStart(p:Page,c:Controls,pad:boolean){
  15  |   await c.press("Escape");await expect(p.getByRole("heading",{name:"Paused"})).toBeVisible();
  16  |   if(pad){
  17  |     // Observe the actual selected menu label; never assume a transport-timed
  18  |     // D-pad tap selected a particular item or inject a click on the pad route.
  19  |     for(let n=0;n<12;n++){
  20  |       if(await p.locator('[data-menu-item][aria-current="true"] > span').innerText()==='Replay 20-ring course')break;
  21  |       await padTap(p,13);
  22  |     }
  23  |     await expect(p.locator('[data-menu-item][aria-current="true"] > span')).toHaveText('Replay 20-ring course');await padTap(p,0);
  24  |   }else await p.getByRole("button",{name:/Replay 20-ring/}).click();
  25  |   await c.look(-Math.PI/2,1.65);await p.waitForTimeout(300);
  26  |   expect((await state(p)).position).toEqual({x:0,y:0,z:-42});
  27  |   expect((await state(p)).course).toMatchObject({active:true,valid:true,next:0});
  28  | }
  29  | async function fullCourse(p:Page,label:string){
  30  |   await installCourseControls(p,label==="controller");
  31  |   await p.evaluate(async()=>{try{await (window as any).__wm005Controls.legacy();}finally{(window as any).__wm005Controls.keys();}});
  32  |   const missed=await p.evaluate(async()=>{try{return await (window as any).__wm005Controls.missFirst();}finally{(window as any).__wm005Controls.keys();}});
  33  |   expect(missed).toMatchObject({health:100,grounded:true,position:{y:-18},course:{next:6,valid:true,completed:false}});
  34  |   await shot(p,`${label}-missed-ring-street`);await hudLayout(p,`wm005-${label}-missed-street`);
  35  |   const climbing=await p.evaluate(async()=>await (window as any).__wm005Controls.approachRecovery());
  36  |   await shot(p,`${label}-missed-ring-climbing`);await hudLayout(p,`wm005-${label}-recovery-climbing`);
  37  |   const rejoined=await p.evaluate(async()=>{try{return await (window as any).__wm005Controls.finishRecovery();}finally{(window as any).__wm005Controls.keys();}});
  38  |   expect(rejoined).toMatchObject({health:100,grounded:true,position:{y:1},course:{next:6,valid:true,completed:false}});await shot(p,`${label}-missed-ring-rejoined`);
  39  |   await writeFile(`${out}/${label}-miss-recovery-rejoin.json`,JSON.stringify({method:"Genuine missed extension jump without web; uninterrupted street landing; ordinary walk around to roof4 marked wall; held climb and continuous top-out; walk back and rejoin next intended anchor. No fixture/state/time writes.",missed,climbing,rejoined},null,2));
  40  |   for(let lap=0;lap<2;lap++){
  41  |   if(lap>0)await p.evaluate(async()=>{await (window as any).__wm005Controls.legacy();});
  42  |   for(let n=0;n<14;n++){
  43  |     await p.evaluate(async({a,b,n})=>{try{await (window as any).__wm005Controls.extension(a,b,n);}finally{(window as any).__wm005Controls.keys();}},{a:COURSE_NODES[n]!,b:COURSE_NODES[n+1]!,n});
  44  |     if([0,3,7,10,13].includes(n))await shot(p,`${label}-ring-${n+6}-landing`);
  45  |   }
  46  |   }
  47  |   await p.evaluate(async()=>{await (window as any).__wm005Controls.closeLap();});
  48  |   await until(p,s=>s.course.completions===2);
  49  |   expect((await state(p)).course).toMatchObject({next:1,valid:true,completed:true,completions:2});
  50  |   const data=await p.evaluate(()=>{const c=(window as any).__wm005Controls;return{records:c.anchors,inputs:c.events,finish:c.state()};});
  51  |   expect(data.records.map((x:any)=>x.expected)).toEqual([...Array.from({length:2},()=>["training-ring",...Array.from({length:19},(_,i)=>`ring-${i+1}`)]).flat(),"training-ring"]);
  52  |   await shot(p,`${label}-complete-course`);
  53  |   await writeFile(`${out}/${label}-20-ring-route.json`,JSON.stringify({method:"Ordinary menu start, browser-frame DOM keyboard/mouse or Gamepad API semantic input. Source state and time are read-only; no fixture positions/progression writes. Frame sequencing avoids transport latency at roof edges.",...data},null,2));
  54  | }
  55  | for(const pad of [false,true])test(`WM005 two complete circuit laps plus ground recovery ${pad?'semantic-controller':'keyboard-mouse'}`,async({page},info)=>{
  56  |  test.setTimeout(900000);const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));const label=pad?'controller':'keyboard';
  57  |  try{if(pad)await controllerStart(page);else await start(page);const c=pad?controller(page):keyboard(page);
  58  |   await replayStart(page,c,pad);await fullCourse(page,label);
  59  |   await expect(page.locator('[data-hud="combat-invite"]')).toHaveText('Rings complete! Try combat training next.');
  60  |   await hudLayout(page,'followup-'+label+'-rings-complete');
  61  |   if(pad)await padTap(page,9);else await page.getByRole('button',{name:'Open training menu',exact:true}).click();
  62  |   await menuChoice(page,pad,/^Combat Playground/);await expect(page.locator('.combat-card')).toBeVisible();
  63  |   expect((await state(page)).combat.active).toBe(true);await shot(page,label+'-rings-to-combat');expect(errors).toEqual([]);
  64  |  }finally{await mkdir(out,{recursive:true});await writeFile(`${out}/${label}-last-state.json`,JSON.stringify({state:await state(page).catch(()=>null),errors},null,2));await page.screenshot({path:info.outputPath('last.png')});}
  65  | });
  66  | 
  67  | test("WM005 street safe save reopen Continue preserves position and generations",async({page,context})=>{
  68  |   await start(page);await look(page,Math.PI,1.1);await page.keyboard.down("w");await at(page,"x",15.5);await page.keyboard.up("w");
  69  |   await until(page,s=>s.grounded&&s.position.y===-18);await page.waitForTimeout(500);
  70  |   const street=await state(page);expect(street.safe).toBe(true);expect(street.health).toBe(100);
  71  |   await page.keyboard.press("Escape");await page.getByRole("button",{name:/Save & Quit/}).click();
  72  |   await expect(page.getByRole("heading",{name:"WEBMASTER",exact:true})).toBeVisible();
  73  |   const stored=await page.evaluate(()=>({...localStorage}));const origin=page.url();await page.close();const reopened=await context.newPage();await reopened.goto(origin);
  74  |   await reopened.getByRole("button",{name:/Continue/}).click();await until(reopened,s=>s.safe);
  75  |   const loaded=await state(reopened);expect(loaded.position).toEqual(street.position);expect(loaded.velocity).toEqual({x:0,y:0,z:0});
  76  |   expect(await reopened.evaluate(()=>({...localStorage}))).toEqual(stored);
  77  |   await shot(reopened,"street-save-reopened");await writeFile(`${out}/street-save.json`,JSON.stringify({method:"Real UI Save & Quit, close page and reopen same origin/context (persistent-profile browser restart is a separate release gate)",street,loaded,keys:Object.keys(stored)},null,2));
  78  | });
  79  | 
  80  | 
  81  | for(const pad of[false,true])for(const pump of[false,true])test(`WM005 ${pump?'sufficient':'insufficient'} momentum vertical orbit ${pad?'semantic-controller':'keyboard-mouse'}`,async({page})=>{
  82  |  test.setTimeout(180000);if(pad)await controllerStart(page);else await start(page);await installCourseControls(page,pad);
  83  |  const label=`${pad?'controller':'keyboard'}-${pump?'pumped':'low-energy'}`;
  84  |  await page.evaluate(async()=>{await (window as any).__wm005Controls.loopSetup();});
  85  |  const result=await page.evaluate(async pump=>{
  86  |   const c=(window as any).__wm005Controls,first=c.state(),anchor=first.swing.web.anchor;
  87  |   const angle=(s:any)=>Math.atan2(s.hand.z-anchor.z,anchor.y-s.hand.y);
  88  |   let previous=angle(first),total=0,max=0,reverse=false;const frames:any[]=[];c.keys(...(pump?['w','e']:['e']));
  89  |   const start=performance.now();while(performance.now()-start<22000){const s=await c.frame();if(!s.swing.web)throw Error(`Unexpected detach: ${JSON.stringify(s)}`);
  90  |    const at=angle(s);let d=at-previous;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;total+=d;max=Math.max(max,total);reverse||=d<-.002;previous=at;
  91  |    frames.push({at:performance.now(),angle:at,total,state:s});if(pump&&total>Math.PI*2+.2)break;
  92  |   }c.keys('e');return{first,total,max,reverse,frames};
  93  |  },pump);
> 94  |  if(pump)expect(result.total).toBeGreaterThan(Math.PI*2);else{expect(result.reverse).toBe(true);expect(result.max).toBeLessThan(Math.PI*2);}
      |                               ^ Error: expect(received).toBeGreaterThan(expected)
  95  |  expect(result.frames.every(f=>f.state.swing.web?.anchorId==='ring-3')).toBe(true);
  96  |  await shot(page,label);await mkdir(out,{recursive:true});await writeFile(`${out}/${label}.json`,JSON.stringify({method:'Ordinary New Game and first two rooftop transfers; ring3 attached through ordinary jump/input; camera/state/time read-only; sustained actual input and angular samples',...result},null,2));
  97  |  await page.evaluate(async()=>{const c=(window as any).__wm005Controls;c.keys();await c.frame();await c.until((s:any)=>!s.swing.web,'release');});expect((await state(page)).swing.web).toBeNull();
  98  | });
  99  | for(const pad of[false,true])test(`WM005 held web survives rooftop contact ${pad?'semantic-controller':'keyboard-mouse'}`,async({page})=>{
  100 |  test.setTimeout(120000);if(pad)await controllerStart(page);else await start(page);await installCourseControls(page,pad);
  101 |  const result=await page.evaluate(async()=>{const c=(window as any).__wm005Controls;await c.look(-Math.PI/2);c.keys('Shift','w');await c.at('z',20);await c.rest(700);
  102 |   // A valid short web cannot reach the far roof while taut. Jump and return to
  103 |   // the current roof under the same held web, exercising actual landing contact.
  104 |   c.keys('e','Space');await c.frame();c.keys('e');await c.until((s:any)=>s.swing.web?.anchorId==='ring-1'&&!s.grounded,'attached rooftop jump');
  105 |   await c.until((s:any)=>s.grounded&&s.position.y===0,'attached roof contact');c.keys('e');
  106 |   const start=performance.now(),frames=[];while(performance.now()-start<1000)frames.push(await c.frame());return frames;});
  107 |  expect(result.every(s=>s.swing.web?.anchorId==='ring-1'&&s.grounded&&!s.safe)).toBe(true);await shot(page,`${pad?'controller':'keyboard'}-held-roof-web`);
  108 |  await writeFile(`${out}/${pad?'controller':'keyboard'}-held-roof-web.json`,JSON.stringify(result,null,2));
  109 | });
  110 | 
```