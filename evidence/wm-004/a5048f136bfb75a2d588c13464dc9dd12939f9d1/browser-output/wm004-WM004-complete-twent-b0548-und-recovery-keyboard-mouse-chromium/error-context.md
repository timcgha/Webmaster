# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm004.spec.ts >> WM004 complete twenty-ring course and ground recovery keyboard-mouse
- Location: e2e\wm004.spec.ts:75:32

# Error details

```
TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - region "Current objective":
      - text: PRACTICE 1 / 3
      - strong: Reach the glowing sky gate
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 0, -18, -24 • 15 FPS
      - generic: "Street recovery: follow the mint paths to a striped wall. Hold C / RB / R1 and climb up onto its roof."
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
    - region "Climb and Pull status":
      - strong: CLIMB C / RB • PULL Q / LB
      - generic: Released safely. Let go of controls, then press again.
  - status: Slot 1 started on Normal
```

# Test source

```ts
  1   | import {test,expect,type Page} from "@playwright/test";
  2   | import {mkdir,writeFile} from "node:fs/promises";
  3   | import {COURSE_NODES} from "../src/core/course";
  4   | import {state,start,controllerStart,keyboard,controller,padTap,look} from "./routes/wm003-route";
  5   | const out="evidence/wm-004/captures";
  6   | type Controls=ReturnType<typeof keyboard>;
  7   | async function until(p:Page,body:(s:any,a:any)=>boolean,args:unknown=null,timeout=30000){
> 8   |   await p.waitForFunction(({body,args})=>new Function("s","a",`return (${body})(s,a)`)(window.__WM_DEBUG__!.getState(),args),{body:body.toString(),args},{timeout});
      |           ^ TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
  9   | }
  10  | const at=(p:Page,axis:"x"|"z",target:number,sign=1)=>until(p,(s,a)=>a.sign*(s.position[a.axis]-a.target)>=0,{axis,target,sign});
  11  | async function shot(p:Page,name:string){await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/${name}.png`});}
  12  | async function center(p:Page,c:Controls,b:{x:number,z:number}){
  13  |   await c.up("Shift");
  14  |   for(let n=0;n<8;n++){
  15  |     const s=await state(p),dx=b.x-s.position.x,dz=b.z-s.position.z;
  16  |     if(Math.hypot(dx,dz)<.85)break;
  17  |     const f={x:-Math.cos(s.cameraAlpha),z:-Math.sin(s.cameraAlpha)},forward=dx*f.x+dz*f.z,side=dx*f.z-dz*f.x;
  18  |     const along=Math.abs(forward)>Math.abs(side),k=along?(forward>0?"w":"s"):(side>0?"d":"a");
  19  |     const axis=Math.abs(along?f.x:f.z)>.8?"x":"z",target=b[axis],sign=Math.sign(target-s.position[axis]);
  20  |     await c.down(k);await at(p,axis,target-sign*.55,sign);await c.up(k);await p.waitForTimeout(400);
  21  |   }
  22  |   expect(Math.hypot((await state(p)).position.x-b.x,(await state(p)).position.z-b.z)).toBeLessThan(1.8);
  23  | }
  24  | async function replayStart(p:Page,c:Controls,pad:boolean){
  25  |   await c.press("Escape");await expect(p.getByRole("heading",{name:"Paused"})).toBeVisible();
  26  |   if(pad){await padTap(p,12);await padTap(p,0);}else await p.getByRole("button",{name:/Replay 20-ring/}).click();
  27  |   await c.look(-Math.PI/2,1.65);await p.waitForTimeout(300);
  28  |   expect((await state(p)).course).toMatchObject({valid:true,next:0});
  29  | }
  30  | async function fullCourse(p:Page,c:Controls,label:string){
  31  |   const records:any[]=[];
  32  |   async function captureAnchor(id:string){await until(p,(s,a)=>s.swing.web?.anchorId===a,id);records.push({expected:id,state:await state(p)});}
  33  |   const fly=async(axis:"x"|"z",target:number,id:string,sign=1)=>{await c.down("e");await captureAnchor(id);await at(p,axis,target,sign);await c.up("e");};
  34  |   await c.down("Shift");await c.down("w");await at(p,"z",-39);await c.press("Space");
  35  |   await until(p,s=>s.position.y>1.25);await fly("z",-23.5,"training-ring");
  36  |   await until(p,s=>s.grounded);await at(p,"z",21);await c.down("e");await c.press("Space");await captureAnchor("ring-1");await at(p,"z",37);await c.up("e");
  37  |   await until(p,s=>s.skyline.stage===1);await at(p,"z",53);await c.down("e");await c.press("Space");await captureAnchor("ring-2");await at(p,"z",76.5);await c.up("e");
  38  |   await until(p,s=>s.skyline.stage===2);await at(p,"z",95);await c.down("e");await c.press("Space");await captureAnchor("ring-3");await at(p,"z",122);await c.up("e");
  39  |   await at(p,"z",123.2);await fly("z",152,"ring-4");await until(p,s=>s.skyline.stage===3);
  40  |   await at(p,"z",165.5);await c.up("w");await p.waitForTimeout(650);await c.look(Math.PI,1.65);
  41  |   await c.down("w");await at(p,"x",5);await c.down("e");await c.press("Space");await captureAnchor("ring-5");await at(p,"x",20);await c.up("e");
  42  |   await until(p,s=>s.skyline.stage===4);await at(p,"x",34.5);await c.up("w");await p.waitForTimeout(650);
  43  |   for(let n=0;n<14;n++){
  44  |     const a=COURSE_NODES[n]!,b=COURSE_NODES[n+1]!,axis=a.x===b.x?"z":"x",sign=Math.sign(b[axis]-a[axis]);
  45  |     const alpha=axis==="x"?(sign>0?Math.PI:0):(sign>0?-Math.PI/2:Math.PI/2);
  46  |     await center(p,c,a);await c.look(alpha,1.65);await c.down("Shift");await c.down("w");
  47  |     await at(p,axis,a[axis]+sign*5,sign);await c.press("Space");await until(p,s=>s.position.y>2.25);
  48  |     await fly(axis,a[axis]+sign*18,`ring-${n+6}`,sign);
  49  |     await c.up("w");await c.down("s");await until(p,s=>s.grounded);await c.up("s");await p.waitForTimeout(900);
  50  |     expect((await state(p)).position.y,`roof after ring ${n+6}`).toBeCloseTo(1);
  51  |     await center(p,c,b);
  52  |     if([0,3,7,10,13].includes(n))await shot(p,`${label}-ring-${n+6}-landing`);
  53  |   }
  54  |   await until(p,s=>s.course.completed);
  55  |   expect((await state(p)).course).toMatchObject({next:20,valid:true,completed:true,completions:1});
  56  |   expect(records.map(x=>x.expected)).toEqual(["training-ring",...Array.from({length:19},(_,i)=>`ring-${i+1}`)]);
  57  |   await shot(p,`${label}-complete-course`);
  58  |   await writeFile(`${out}/${label}-20-ring-route.json`,JSON.stringify({method:"Ordinary menu start and keyboard/mouse or Gamepad API semantic input; no fixture positions or progression writes",records,finish:await state(p)},null,2));
  59  | }
  60  | async function groundReturn(p:Page,c:Controls,label:string){
  61  |   await c.up("Shift");await c.look(-Math.PI/2,1.1);await c.down("w");
  62  |   await at(p,"z",21);await c.up("w"); // Walk off the actual final roof, then land uninterrupted.
  63  |   await until(p,s=>s.grounded&&s.position.y===-18);await p.waitForTimeout(450);
  64  |   expect((await state(p)).health).toBe(100);expect((await state(p)).safe).toBe(true);
  65  |   const landed=await state(p);await shot(p,`${label}-natural-street-landing`);
  66  |   await c.look(Math.PI/2,1.1);await c.down("w");await c.down("c");
  67  |   await until(p,s=>s.traversal.surfaceId==="course-roof-14");
  68  |   await until(p,s=>s.position.y>-9);await c.up("w");await shot(p,`${label}-street-wall-climb`);
  69  |   await c.down("w");await until(p,s=>s.grounded&&s.position.y===1, null,30000);
  70  |   await c.up("w");await c.up("c");await p.waitForTimeout(500);
  71  |   expect((await state(p)).health).toBe(100);expect((await state(p)).traversal.surfaceId).toBeNull();
  72  |   await shot(p,`${label}-recovered-rooftop`);
  73  |   await writeFile(`${out}/${label}-ground-recovery.json`,JSON.stringify({method:"Normal rooftop walk-off, street landing, walking approach and held climb/top-out; no fixture",landed,returned:await state(p)},null,2));
  74  | }
  75  | for(const pad of [false,true]) test(`WM004 complete twenty-ring course and ground recovery ${pad?"semantic-controller":"keyboard-mouse"}`,async({page},info)=>{
  76  |   test.setTimeout(600000);const errors:string[]=[];page.on("pageerror",e=>errors.push(String(e)));
  77  |   const label=pad?"controller":"keyboard";
  78  |   try{
  79  |     if(pad)await controllerStart(page);else await start(page);
  80  |     const c=pad?controller(page):keyboard(page);await replayStart(page,c,pad);await fullCourse(page,c,label);await groundReturn(page,c,label);
  81  |     expect(errors).toEqual([]);
  82  |   }finally{await mkdir(out,{recursive:true});await writeFile(`${out}/${label}-last-state.json`,JSON.stringify({source:process.env.GITHUB_SHA,state:await state(page).catch(()=>null),errors},null,2));await page.screenshot({path:info.outputPath("last.png")});}
  83  | });
  84  | 
  85  | test("WM004 hero front rear side idle walking and movement transitions",async({page})=>{
  86  |   test.setTimeout(120000);await start(page);await page.setViewportSize({width:1920,height:1080});
  87  |   for(const[name,alpha]of[["rear",-Math.PI/2],["front",Math.PI/2],["side",0]]as const){
  88  |     await look(page,alpha,1.35);await page.waitForTimeout(400);await shot(page,`hero-idle-${name}`);
  89  |     // Strafe relative to each review camera: actual input and movement; never writes a pose.
  90  |     const key=name==="rear"?"w":name==="front"?"s":"d";
  91  |     await page.keyboard.down(key);await page.waitForTimeout(450);await shot(page,`hero-walking-${name}`);
  92  |     await page.keyboard.up(key);await page.waitForTimeout(700);await shot(page,`hero-stop-${name}`);
  93  |   }
  94  |   await look(page,Math.PI/2,1.1);await page.keyboard.down("Shift");await page.keyboard.down("a");await page.waitForTimeout(350);await shot(page,"hero-running-transition");
  95  |   await page.keyboard.press("Space");await page.waitForTimeout(150);await shot(page,"hero-jumping-transition");await page.keyboard.up("a");await page.keyboard.up("Shift");
  96  |   await writeFile(`${out}/hero-rig-state.json`,JSON.stringify(await state(page),null,2));
  97  | });
  98  | 
  99  | test("WM004 street safe save reopen Continue preserves position and generations",async({page,context})=>{
  100 |   await start(page);await look(page,Math.PI,1.1);await page.keyboard.down("w");await at(page,"x",15.5);await page.keyboard.up("w");
  101 |   await until(page,s=>s.grounded&&s.position.y===-18);await page.waitForTimeout(500);
  102 |   const street=await state(page);expect(street.safe).toBe(true);expect(street.health).toBe(100);
  103 |   await page.keyboard.press("Escape");await page.getByRole("button",{name:/Save & Quit/}).click();
  104 |   await expect(page.getByRole("heading",{name:"WEBMASTER",exact:true})).toBeVisible();
  105 |   const stored=await page.evaluate(()=>({...localStorage}));const origin=page.url();await page.close();const reopened=await context.newPage();await reopened.goto(origin);
  106 |   await reopened.getByRole("button",{name:/Continue/}).click();await until(reopened,s=>s.safe);
  107 |   const loaded=await state(reopened);expect(loaded.position).toEqual(street.position);expect(loaded.velocity).toEqual({x:0,y:0,z:0});
  108 |   expect(await reopened.evaluate(()=>({...localStorage}))).toEqual(stored);
```