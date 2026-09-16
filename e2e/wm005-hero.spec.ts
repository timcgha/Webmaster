import {test,expect,type Page} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import {state,start,look,hudLayout} from "./routes/wm003-route";
import {installCourseControls} from "./routes/wm005-route";
import {startHeroRecording,saveHeroRecording} from "./routes/wm004-recording";
const out="evidence/wm-004/captures";
async function shot(p:Page,name:string){await mkdir(out,{recursive:true});await p.screenshot({path:`${out}/${name}.png`});}
  // Native canvas recording is explicitly stopped before context teardown.
  test.use({video:"off"});
  for(const[name,alpha,key]of[["rear",-Math.PI/2,"w"],["front",Math.PI/2,"s"],["side",0,"d"]]as const)test(`WM005 hero ${name} idle walking running jump and stop transitions`,async({page})=>{
    test.setTimeout(180000);await start(page);await page.setViewportSize({width:1920,height:1080});await installCourseControls(page,false);
    await look(page,alpha,1.35);await page.waitForTimeout(400);await shot(page,`hero-idle-${name}`);
    await startHeroRecording(page);let video:any;
    try {
    const walking=page.evaluate(async key=>{const c=(window as any).__wm005Controls,states=[];c.keys(key);const start=performance.now();try{while(performance.now()-start<2000)states.push({...await c.frame(),recordedAt:performance.now()});}finally{c.keys();}await c.rest(700);return states;},key);
    await page.waitForTimeout(450);await shot(page,`hero-walking-${name}`);const walkStates=await walking;await shot(page,`hero-stop-${name}`);
    const movement=await page.evaluate(async key=>{const c=(window as any).__wm005Controls,states=[];c.keys('Shift',key);const start=performance.now();try{while(performance.now()-start<300)states.push({...await c.frame(),recordedAt:performance.now()});c.keys('Shift',key,'Space');states.push({...await c.frame(),recordedAt:performance.now()});c.keys('Shift',key);while(performance.now()-start<600)states.push({...await c.frame(),recordedAt:performance.now()});}finally{c.keys();}await c.rest(1300);return states;},key);
    await shot(page,`hero-transition-landed-${name}`);
    video=await saveHeroRecording(page,`${out}/hero-${name}-native.webm`);
    expect(video.elapsedMs).toBeGreaterThan(3000);
    expect(video.automaticStop,"The entire action sequence must finish inside the bounded recording window").toBe(false);
    expect(movement.at(-1)!.recordedAt).toBeLessThanOrEqual(video.stoppedAt);
    expect(walkStates.some(s=>Math.abs(s.gait.hips[0])>.1)).toBe(true);expect(movement.some(s=>!s.grounded)).toBe(true);
    expect((await state(page)).grounded).toBe(true);expect((await state(page)).position.y).toBe(0);
    await writeFile(`${out}/hero-${name}-movement.json`,JSON.stringify({method:"Fresh ordinary New Game; mouse review angle; timed ordinary DOM keyboard input on actual browser frames; native canvas video records actual walk/stop/run/jump frames at up to15FPS; stopped before context close. No pose, position, camera or time assignments.",video,walkStates,movement,finish:await state(page)},null,2));
    if(name==="front")await hudLayout(page,"wm005-hero-review");
    }finally{if(!video)await saveHeroRecording(page,`${out}/hero-${name}-native.webm`);}
  });

