import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const url='https://timcgha.github.io/Webmaster/wm006-preview/';
const prefix='webmaster.wm006-preview.v1:',out='evidence/wm-006/public/ordinary';
const profile=path.resolve('.wm006-profiles/public-ordinary');
fs.mkdirSync(out,{recursive:true});fs.rmSync(profile,{recursive:true,force:true});
const options={headless:true,channel:'chromium',viewport:{width:1280,height:720}};
let context;const errors=[],result={source:process.env.WM_SOURCE,tree:process.env.WM_TREE,url,status:'INCOMPLETE',method:'Ordinary public URL without test/diagnostics parameters; genuine menus and keyboard, no debug or gameplay fixtures. Save & Quit, browser process close/reopen, Continue and combat entry; native root/earlier-preview sentinel preservation.'};
const snapshot=page=>page.evaluate(()=>{const s=window.__wmOrdinaryNative;return Object.fromEntries(Array.from({length:s.length},(_,i)=>{const k=s.key(i);return[k,s.getItem(k)];}));});
const rootOnly=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!k.startsWith(prefix)));
async function open(){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});
  assert.equal(await page.evaluate(()=>typeof window.__WM_DEBUG__),'undefined');
  await expect(page.locator('#wm-preview')).toContainText('WM-006 preview');
  await expect(page.locator('#wm-preview-diagnostics')).toHaveCount(0);
  return page;
}
try{
  context=await chromium.launchPersistentContext(profile,options);
  await context.addInitScript(()=>{window.__wmOrdinaryNative=window.localStorage;for(const k of ['webmaster.root-public-check','webmaster.wm003-preview.v1:public-check','webmaster.wm004-preview.v1:public-check','webmaster.wm005-preview.v1:public-check'])localStorage.setItem(k,'preserve');});
  let page=await open();const before=await snapshot(page);
  await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();
  await expect(page.locator('#hud-layer')).toBeVisible();await page.waitForTimeout(800);
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/Save Game/})).toBeEnabled();
  await page.getByRole('button',{name:/Save Game/}).click();await page.locator('#toast-layer').filter({hasText:'Save confirmed'}).waitFor();
  await page.getByRole('button',{name:/Save & Quit/}).click();await page.getByRole('heading',{name:'WEBMASTER',exact:true}).waitFor();
  const saved=await snapshot(page);assert.deepEqual(rootOnly(saved),rootOnly(before));assert.ok(Object.keys(saved).some(k=>k.startsWith(prefix)));
  await context.close();context=await chromium.launchPersistentContext(profile,options);
  await context.addInitScript(()=>{window.__wmOrdinaryNative=window.localStorage;});
  page=await open();assert.deepEqual(await snapshot(page),saved);
  await page.getByRole('button',{name:/Continue/}).click();await expect(page.locator('#hud-layer')).toBeVisible();assert.deepEqual(await snapshot(page),saved);
  await page.screenshot({path:out+'/continued.png'});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Combat Playground/}).click();await expect(page.locator('.combat-card')).toBeVisible();
  await page.keyboard.press('j');await page.waitForTimeout(180);await page.screenshot({path:out+'/combat.png'});
  assert.deepEqual(rootOnly(await snapshot(page)),rootOnly(before));assert.deepEqual(errors,[]);result.status='PASS';
}catch(error){result.status='FAIL';result.error=String(error);throw error;}
finally{await context?.close();fs.writeFileSync(out+'/result.json',JSON.stringify({...result,errors},null,2));}
console.log(JSON.stringify(result));
