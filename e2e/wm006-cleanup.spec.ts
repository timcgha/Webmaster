import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {enterCombat,menuChoice} from './routes/wm006-route';
import {state,padTap,setPad} from './routes/wm003-route';

for(const pad of [false,true])test(`WM006 combat lifecycle cleanup ${pad?'controller-disconnect':'keyboard-focus'}`,async({page})=>{
 test.setTimeout(120000);await enterCombat(page,pad);const observations:any[]=[];
 await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.center(-52);});
 for(const kind of ['j','l','f']){
   await page.evaluate(async key=>{const c=(window as any).__wm006Controls;c.keys(key);await c.frame();c.keys();},kind);
   if(pad){await page.evaluate(()=>(window as any).__wm003pad.connected=false);await page.waitForFunction(()=>window.__WM_DEBUG__!.getControllerStatus().lifecycle==='CONTROLLER_DISCONNECTED');}
   else await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   const interrupted=await state(page);observations.push({kind,interrupted});
   expect(interrupted.combat.attack).toBeNull();expect(interrupted.combat.queued).toBeNull();expect(interrupted.combat.shots).toHaveLength(0);expect(interrupted.combat.dodge).toBeNull();expect(interrupted.combat.dodgeCooldown).toBe(0);expect(interrupted.combat.stage).toBe(0);
   if(pad){await page.evaluate(()=>(window as any).__wm003pad.connected=true);await padTap(page,0);await page.waitForFunction(()=>window.__WM_DEBUG__!.getControllerStatus().lifecycle==='CONTROLLER_READY');await setPad(page);}
   else await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await page.waitForTimeout(1200);
 }
 // Real hits earn the moving-dummy station, then interruption clears wrap without awarding its completion.
 await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.three('j');await c.until((s:any)=>s.combat.stage===1,'box');await c.center(-44);await c.tap('k');await c.until((s:any)=>s.combat.stage===2&&s.grounded,'kick');await c.center(-37);await c.tap('l');await c.until((s:any)=>s.combat.targets[2].wrap>0,'wrap');});
 if(pad){await page.evaluate(()=>(window as any).__wm003pad.connected=false);await page.waitForFunction(()=>window.__WM_DEBUG__!.getControllerStatus().lifecycle==='CONTROLLER_DISCONNECTED');}
 else await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 const wrappedInterrupted=await state(page);expect(wrappedInterrupted.combat.targets[2]!.wrap).toBe(0);expect(wrappedInterrupted.combat.stage).toBe(2);expect(wrappedInterrupted.combat.completed).toBe(false);observations.push({wrappedInterrupted});
 // Keyboard remains available even while the controller is absent.
 await page.keyboard.press('Escape');await menuChoice(page,false,/^Restart at checkpoint/);const retried=await state(page);expect(retried.combat.stage).toBe(2);expect(retried.combat.targets[2]!.hp).toBe(160);expect(retried.combat.targets[2]!.hits).toHaveLength(0);
 await mkdir('evidence/wm-006/cleanup',{recursive:true});await writeFile(`evidence/wm-006/cleanup/${pad?'controller':'keyboard'}.json`,JSON.stringify({observations,retried},null,2));
});
