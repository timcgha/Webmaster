import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {enterCombat} from './routes/wm006-route';
import {startHeroRecording,saveHeroRecording} from './routes/wm004-recording';

test('WM006 C3 continuous nine-attack observation, clear moving views and mute',async({page})=>{
 test.setTimeout(150000);const out='evidence/wm-006/c3-visual';await mkdir(out,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{const w=window as any;w.__soundObserved=[];const create=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){w.__soundObserved.push({at:performance.now(),context:this.state});return create.call(this);};});
 const records:any[]=[];
 try{
  await enterCombat(page,false);
  await page.evaluate(async()=>{await (window as any).__wm006Controls.center(-70);});
  for(const [alpha,name]of [[Math.PI/2,'front'],[0,'right-side'],[-Math.PI/2,'rear']] as const){
   await page.evaluate(async alpha=>{const c=(window as any).__wm006Controls;await c.look(alpha,1.25);await c.rest(1100);},alpha);
   const view=await page.evaluate(()=>window.__WM_DEBUG__!.getHeroView());
   expect(view.front.z).toBeGreaterThan(.95);expect(Math.abs(view.front.x)).toBeLessThan(.1);
   await page.screenshot({path:`${out}/${name}-idle.png`});
   await startHeroRecording(page);
   // Install observation before input. A protocol round trip after a short
   // attack can miss its age window; persistent samples do not alter game time.
   await page.evaluate(()=>{const w=window as any;w.__visualSamples=[];w.__visualFrame=0;const sample=()=>{const s=w.__WM_DEBUG__.getState();w.__visualSamples.push({at:performance.now(),position:s.position,attack:s.combat.attack,shots:s.combat.shots,dodge:s.combat.dodge,history:s.combat.history});w.__visualFrame=requestAnimationFrame(sample);};sample();});
   await page.evaluate(async()=>{const c=(window as any).__wm006Controls;for(const key of ['j','k','l']){await c.three(key);await c.rest(1100);}});
   const frames=await page.evaluate(()=>{const w=window as any;cancelAnimationFrame(w.__visualFrame);return w.__visualSamples;});
   const recording=await saveHeroRecording(page,`${out}/${name}-nine-attacks.webm`);
   records.push({name,alpha,view,recording,frames});
   for(const kind of ['punch','kick','web'])for(const step of [1,2,3]){
    expect(frames.some((f:any)=>f.attack?.kind===kind&&f.attack.step===step&&f.attack.age>=.12),`${name}: ${kind} ${step} active pose`).toBe(true);
   }
   for(const step of [1,2,3])expect(frames.some((f:any)=>f.shots.some((s:any)=>s.step===step)),`${name}: projectile ${step}`).toBe(true);
  }
  for(const direction of ['a','d','neutral']){
   const observed=await page.evaluate(async direction=>{const c=(window as any).__wm006Controls;await c.rest(1200);c.keys(...(direction==='neutral'?['f']:[direction,'f']));await c.frame();await c.frame();c.keys();const state=c.state();await c.rest(150);return state;},direction);
   expect(observed.combat.dodge,`real ${direction} dodge`).not.toBeNull();
   await page.screenshot({path:`${out}/dodge-${direction}.png`});records.push({direction,observed});
  }
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Settings/}).click();await page.getByRole('button',{name:/^Combat sounds: On/}).click();await page.getByRole('button',{name:/^Done/}).click();await page.getByRole('button',{name:/^Resume/}).click();
  const mutedBefore=await page.evaluate(()=>(window as any).__soundObserved.length);await page.keyboard.press('j');await page.waitForTimeout(650);
  const audio=await page.evaluate(()=>(window as any).__soundObserved);expect(audio.length).toBe(mutedBefore);expect(audio.length).toBeGreaterThan(9);expect(audio.every((x:any)=>x.context==='running')).toBe(true);records.push({audio,mutedBefore});
  expect(errors).toEqual([]);
 }finally{await writeFile(`${out}/observations.json`,JSON.stringify({source:process.env.WM_SOURCE,tree:process.env.WM_TREE,classification:'SELF_REVIEW targeted unchanged-source completion of C3 visual timeout; original failure retained',method:'Existing released browser-frame input sequencer and bounded native recorder. Observer installed before inputs, all nine active poses and three projectile variants asserted for each clear face-oriented view. No gameplay/pose/time changes. Perceived sound and physical devices remain unverified.',records,errors},null,2));}
});
