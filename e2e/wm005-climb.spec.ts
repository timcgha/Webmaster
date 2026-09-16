import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {start,controllerStart,keyboard,controller,state,wait,stop} from './routes/wm003-route';
import {installCourseControls} from './routes/wm005-route';
import {startHeroRecording,saveHeroRecording} from './routes/wm004-recording';
const out='evidence/wm-005/captures';
for(const pad of[false,true])test(`WM005 unmarked east facade street-to-roof ${pad?'semantic-controller':'keyboard-mouse'}`,async({page})=>{
 test.setTimeout(150000);if(pad)await controllerStart(page);else await start(page);await installCourseControls(page,pad);await mkdir(out,{recursive:true});
 const label=pad?'controller':'keyboard';
 await page.evaluate(async()=>{const c=(window as any).__wm005Controls;await c.look(Math.PI,1.1);c.keys('w');await c.at('x',16);c.keys();await c.until((s:any)=>s.grounded&&s.position.y===-18,'street');});
 await page.screenshot({path:`${out}/${label}-unmarked-east-street.png`});
 await page.evaluate(async()=>{const c=(window as any).__wm005Controls;await c.look(0,1.1);c.keys('w','c');await c.until((s:any)=>s.traversal.surfaceId==='practice:face-2','unmarked east');await c.until((s:any)=>s.position.y>-12,'mid wall');c.keys('c');});
 await startHeroRecording(page);const climbing=page.evaluate(async()=>{const c=(window as any).__wm005Controls,frames=[];c.keys('w','c');const start=performance.now();while(performance.now()-start<1800)frames.push(await c.frame());c.keys('c');return frames;});
 await page.waitForTimeout(600);await page.screenshot({path:`${out}/${label}-unmarked-east-climbing.png`});const frames=await climbing;
 await saveHeroRecording(page,`${out}/${label}-wall-climbing.webm`);
 await page.evaluate(async()=>{const c=(window as any).__wm005Controls;c.keys('w','c');await c.until((s:any)=>s.grounded&&s.position.y===0,'east topout');c.keys();await c.rest();});
 const finish=await state(page);expect(finish.grounded).toBe(true);expect(finish.position.y).toBe(0);expect(finish.health).toBe(100);expect(finish.traversal.surfaceId).toBeNull();
 await page.screenshot({path:`${out}/${label}-unmarked-east-topout.png`});await writeFile(`${out}/${label}-unmarked-east.json`,JSON.stringify({method:'Ordinary New Game, walk off east side, street landing and approach to unmarked face; real held climb to roof',frames,finish},null,2));
});
for(const pad of[false,true])test(`WM005 visible face-up head-first ceiling and challenge top-out ${pad?'semantic-controller':'keyboard-mouse'}`,async({page})=>{
 test.setTimeout(240000);if(pad)await controllerStart(page);else await start(page);const c=pad?controller(page):keyboard(page),label=pad?'controller':'keyboard';await mkdir(out,{recursive:true});
 await c.look(Math.PI/2,1.65);await c.down('w');await c.down('Shift');await wait(page,s=>s.position.z<-21);await c.down('e');await c.press('Space');await wait(page,s=>s.swing.web?.anchorId==='training-ring');await wait(page,s=>s.position.z<-36);await c.up('e');await wait(page,s=>s.training.stage===1);await stop(page,c);
 await c.look(Math.PI/2,1.08);await c.down('d');await wait(page,s=>s.position.x<-2.7);await c.up('d');await page.waitForTimeout(250);await c.down('w');await wait(page,s=>s.position.z<-57.5);await c.up('w');await page.waitForTimeout(250);await c.down('a');await wait(page,s=>s.position.x>-.1);await c.up('a');await page.waitForTimeout(250);await c.down('w');await wait(page,s=>s.position.z<-60.1);await c.up('w');await page.waitForTimeout(300);await c.down('c');await wait(page,s=>s.traversal.surfaceId==='climb-wall');
 await c.down('w');await wait(page,s=>s.position.y>6);await c.up('w');await page.screenshot({path:`${out}/${label}-challenge-wall.png`});await c.down('d');await wait(page,s=>s.position.x<-6);await c.up('d');
 await startHeroRecording(page);await c.down('w');await wait(page,s=>s.traversal.surfaceId==='climb-ceiling');await c.up('w');await page.waitForTimeout(800);await page.screenshot({path:`${out}/${label}-ceiling-face-up.png`});
 expect((await state(page)).heroPitch).toBeLessThan(-1.4);const first=await state(page);await c.down('s');await page.waitForTimeout(1500);await c.up('s');const moved=await state(page);expect(moved.position.z).toBeGreaterThan(first.position.z+3);await page.screenshot({path:`${out}/${label}-ceiling-head-first.png`});await saveHeroRecording(page,`${out}/${label}-ceiling-climb.webm`);
 // Continuous held crawl reaches the outer fascia; ordinary forward/up input tops out.
 await c.down('s');await wait(page,s=>s.traversal.surfaceId==='climb-ceiling:face-0'&&s.traversal.cameraMode==='wall',15000);await c.up('s');
 await c.down('w');await wait(page,s=>s.grounded&&s.position.y===11.5);await stop(page,c);const finish=await state(page);await page.screenshot({path:`${out}/${label}-challenge-platform-top.png`});
 await writeFile(`${out}/${label}-ceiling-topout.json`,JSON.stringify({method:'Earned entry swing, real vertical/lateral wall climb, face-up head-first ceiling traversal and actual fascia/top-out',first,moved,finish},null,2));
});
