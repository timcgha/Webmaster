import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { start, controllerStart, state, padTap, hudLayout } from './routes/wm003-route';
import { installCourseControls } from './routes/wm005-route';
import { menuChoice } from './routes/wm006-route';
const out='evidence/wm-006/followup';
for(const pad of [false,true]) test(`standing web launch and discoverable combat entry ${pad?'controller':'keyboard'}`,async({page})=>{
  test.setTimeout(180000);await mkdir(out,{recursive:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  if(pad)await controllerStart(page);else await start(page);
  await expect(page.locator('[data-hud="combat-entry"]')).toBeVisible();
  await hudLayout(page,`followup-${pad}-entry`);
  await installCourseControls(page,pad);
  const frames=await page.evaluate(async()=>{
    const c=(window as any).__wm005Controls;await c.look(-Math.PI/2);c.keys('w');await c.at('z',21);await c.rest(700);
    const before=c.state();if(!before.grounded||Math.hypot(before.velocity.x,before.velocity.z)>=1)throw Error('launch not standing');
    const samples:any[]=[];c.keys('e');const end=performance.now()+650;
    while(performance.now()<end){await c.frame();samples.push(c.state());}c.keys();return{before,samples};
  });
  expect(frames.samples.some((s:any)=>s.swing.web?.anchorId==='ring-1')).toBe(true);
  expect(Math.max(...frames.samples.map((s:any)=>s.position.y))).toBeGreaterThan(frames.before.position.y+2.5);
  expect(frames.samples.at(-1)!.swing.attachments).toBe(frames.before.swing.attachments+1);
  await writeFile(`${out}/${pad}-standing-launch.json`,JSON.stringify(frames,null,2));
  await page.screenshot({path:`${out}/${pad}-launch.png`});
  if (pad) await padTap(page, 9);
  else await page.getByRole('button', { name: 'Open Combat Playground', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paused', exact: true })).toBeVisible();
  // Combat is second in the pause list so pad navigation reaches it without scrolling off-screen.
  await menuChoice(page, pad, /^Combat Playground/);
  await expect(page.locator('.combat-card')).toBeVisible();
  await expect(page.locator('[data-hud="combat-entry"]')).toBeHidden();
  expect((await state(page)).combat.active).toBe(true);
  await page.screenshot({ path: `${out}/${pad}-combat-entered.png` });
  expect(errors).toEqual([]);
});
