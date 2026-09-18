import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {enterCombat} from './routes/wm006-route';
import {state} from './routes/wm003-route';
import {startHeroRecording,saveHeroRecording} from './routes/wm004-recording';
test('WM006 unobstructed face-oriented front side rear self-review capture',async({page})=>{
 test.setTimeout(150000);const out='evidence/wm-006/review-views';await mkdir(out,{recursive:true});await enterCombat(page,false);
 // Ordinary walking selects clear street space; no actor, pose, camera or time setters.
 await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.center(-70);});
 const records=[];
 for(const [alpha,name]of [[Math.PI/2,'front'],[0,'right-side'],[-Math.PI/2,'rear']] as const){
   await page.evaluate(async alpha=>{const c=(window as any).__wm006Controls;await c.look(alpha,1.25);await c.rest(1100);},alpha);
   const before=await state(page);expect(Math.abs(before.position.z+70)).toBeLessThan(.8);
   const view=await page.evaluate(()=>window.__WM_DEBUG__!.getHeroView());
   expect(view.front.z).toBeGreaterThan(.95);expect(Math.abs(view.front.x)).toBeLessThan(.1);
   await page.screenshot({path:`${out}/${name}-idle.png`});
   await startHeroRecording(page);
   await page.evaluate(async()=>{const c=(window as any).__wm006Controls;for(const key of ['j','k','l']){await c.three(key);await c.rest(450);}});
   const recording=await saveHeroRecording(page,`${out}/${name}-nine-attacks.webm`);
   records.push({name,alpha,before,after:await state(page),recording,heroView:await page.evaluate(()=>window.__WM_DEBUG__!.getHeroView())});
 }
 await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.look(Math.PI/2,1.25);await c.rest(1100);});
 for(const [kind,key]of [['punch','j'],['kick','k'],['web','l']] as const){
   for(const step of [1,2,3]){await page.keyboard.press(key);await page.waitForFunction(({kind,step})=>{const a=window.__WM_DEBUG__!.getState().combat.attack;return a?.kind===kind&&a.step===step&&a.age>=.12;},{kind,step});await page.screenshot({path:`${out}/front-${kind}-${step}.png`});await page.waitForFunction(()=>!window.__WM_DEBUG__!.getState().combat.attack);}
   await page.waitForTimeout(1100);
 }
 await writeFile(`${out}/records.json`,JSON.stringify({source:process.env.WM_SOURCE,tree:process.env.WM_TREE,classification:'SELF_REVIEW supplemental capture only; unchanged product source; correct geometric viewpoints after ordinary facing/movement',records},null,2));
});
