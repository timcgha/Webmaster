import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {enterCombat} from './routes/wm006-route';
import {state} from './routes/wm003-route';
import {startHeroRecording,saveHeroRecording} from './routes/wm004-recording';

test('WM006 nine visible attacks, dodge directions, audio and held-input edges',async({page})=>{
 test.setTimeout(180000);const out='evidence/wm-006/visual';await mkdir(out,{recursive:true});
 await page.addInitScript(()=>{
   const w=window as any;w.__soundObserved=[];
   const original=AudioContext.prototype.createOscillator;
   AudioContext.prototype.createOscillator=function(){w.__soundObserved.push({at:performance.now(),context:this.state});return original.call(this);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));await enterCombat(page,false);const poses:any[]=[];
 for(const [kind,key]of [['punch','j'],['kick','k'],['web','l']] as const){
   await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.rest(1100);await c.look(Math.PI/2,1.25);});
   for(const step of [1,2,3]){
     await page.keyboard.press(key);
     await page.waitForFunction(({kind,step})=>{const a=window.__WM_DEBUG__!.getState().combat.attack;return a?.kind===kind&&a.step===step&&a.age>=.12;},{kind,step});
     poses.push({kind,step,state:await state(page)});await page.screenshot({path:`${out}/${kind}-${step}.png`});
     await page.waitForFunction(()=>!window.__WM_DEBUG__!.getState().combat.attack);
   }
 }
 await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.rest(1200);});
 for(const direction of ['a','d','neutral']){
   if(direction!=='neutral')await page.keyboard.down(direction);
   await page.keyboard.press('f');await page.waitForFunction(()=>!!window.__WM_DEBUG__!.getState().combat.dodge);
   poses.push({direction,state:await state(page)});await page.screenshot({path:`${out}/dodge-${direction}.png`});
   if(direction!=='neutral')await page.keyboard.up(direction);await page.waitForTimeout(1100);
 }
 const clips=[];
 for(const [angle,name]of [[Math.PI/2,'front'],[0,'side'],[-Math.PI/2,'rear']] as const){
  await page.evaluate(async angle=>{const c=(window as any).__wm006Controls;await c.rest(1100);await c.look(angle,1.25);},angle);
  await startHeroRecording(page);
  await page.evaluate(async()=>{const c=(window as any).__wm006Controls;for(const key of ['j','k','l']){await c.three(key);await c.rest(400);}});
  clips.push(await saveHeroRecording(page,`${out}/${name}-all-variations.webm`));
 }
 await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Settings/}).click();await page.getByRole('button',{name:/^Combat sounds: On/}).click();await page.getByRole('button',{name:/^Done/}).click();await page.getByRole('button',{name:/^Resume/}).click();
 const mutedBefore=await page.evaluate(()=>(window as any).__soundObserved.length);await page.keyboard.press('j');await page.waitForTimeout(650);expect(await page.evaluate(()=>(window as any).__soundObserved.length)).toBe(mutedBefore);
 const audio=await page.evaluate(()=>(window as any).__soundObserved);expect(audio.length).toBeGreaterThan(9);expect(audio.every((a:any)=>a.context==='running')).toBe(true);expect(errors).toEqual([]);
 await writeFile(`${out}/poses-and-audio.json`,JSON.stringify({poses,clips,audio,mutedBefore,errors,limitations:'Actual animated front/side/rear captures and poses; WebAudio scheduling and mute observed, perceived sound quality remains sponsor judgment.'},null,2));
});
