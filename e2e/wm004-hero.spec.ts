import {test,expect,type Page} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import {state,start,look,hudLayout} from "./routes/wm003-route";
import {installCourseControls} from "./routes/wm004-route";
const out="evidence/wm-004/captures";
async function shot(p:Page,name:string){await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/${name}.png`});}
  test.use({video:{mode:"on",size:{width:1280,height:720}}});
  for(const[name,alpha,key]of[["rear",-Math.PI/2,"w"],["front",Math.PI/2,"s"],["side",0,"d"]]as const)test(`WM004 hero ${name} idle walking running jump and stop transitions`,async({page})=>{
    test.setTimeout(180000);await start(page);await page.setViewportSize({width:1920,height:1080});await installCourseControls(page,false);
    await look(page,alpha,1.35);await page.waitForTimeout(400);await shot(page,`hero-idle-${name}`);
    const walking=page.evaluate(async key=>{const c=(window as any).__wm004Controls,states=[];c.keys(key);const start=performance.now();try{while(performance.now()-start<2000)states.push(await c.frame());}finally{c.keys();}await c.rest(700);return states;},key);
    await page.waitForTimeout(450);await shot(page,`hero-walking-${name}`);const walkStates=await walking;await shot(page,`hero-stop-${name}`);
    const movement=await page.evaluate(async key=>{const c=(window as any).__wm004Controls,states=[];c.keys('Shift',key);const start=performance.now();try{while(performance.now()-start<300)states.push(await c.frame());c.keys('Shift',key,'Space');states.push(await c.frame());c.keys('Shift',key);while(performance.now()-start<600)states.push(await c.frame());}finally{c.keys();}await c.rest(1300);return states;},key);
    await shot(page,`hero-transition-landed-${name}`);
    expect(walkStates.some(s=>Math.abs(s.gait.hips[0])>.1)).toBe(true);expect(movement.some(s=>!s.grounded)).toBe(true);
    expect((await state(page)).grounded).toBe(true);expect((await state(page)).position.y).toBe(0);
    await writeFile(`${out}/hero-${name}-movement.json`,JSON.stringify({method:"Fresh ordinary New Game; mouse review angle; timed ordinary DOM keyboard input on actual browser frames; video records walk/stop/run/jump. No pose, position, camera or time assignments.",walkStates,movement,finish:await state(page)},null,2));
    if(name==="front")await hudLayout(page,"wm004-hero-review");
  });
