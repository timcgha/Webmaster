// Ordinary sponsor URL: no test mode, injected fixtures, debug state or console work.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const accepted=JSON.parse(fs.readFileSync('../tooling/evidence/wm-005/public-tooling/accepted.json'));
const url='https://timcgha.github.io/Webmaster/wm005-preview/?diagnostics=1';
const out='evidence/wm-005/public',profile=path.resolve('.wm005-public-normal-profile');fs.mkdirSync(out,{recursive:true});fs.rmSync(profile,{recursive:true,force:true});
const opts={headless:true,channel:'chromium',viewport:{width:1280,height:720}},errors=[],observations=[];let context,page;
async function open(){context=await chromium.launchPersistentContext(profile,opts);page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});assert.equal(await page.evaluate(()=>typeof window.__WM_DEBUG__),'undefined');assert.equal(await page.locator('#wm-preview-error').count(),0);assert.match(await page.locator('#wm-preview').innerText(),/WM-005 preview/);}
try{
 await open();await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();
 await page.locator('#hud-layer:not(.hidden) .objective-card').waitFor();await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');await page.waitForTimeout(700);
 observations.push({stage:'ordinary play',diagnostics:await page.locator('#wm-preview-diagnostics').innerText()});
 await page.keyboard.press('Escape');const save=page.getByRole('button',{name:/Save Game/});await save.waitFor();assert.equal(await save.isEnabled(),true);await save.click();await page.locator('#toast-layer').filter({hasText:'Save confirmed'}).waitFor();await page.getByRole('button',{name:/Save & Quit/}).click();
 await page.getByRole('heading',{name:'WEBMASTER',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/Continue/}).isEnabled(),true);await page.waitForTimeout(600);observations.push({stage:'saved',diagnostics:await page.locator('#wm-preview-diagnostics').innerText()});
 await context.close();context=null;await open();assert.equal(await page.getByRole('button',{name:/Continue/}).isEnabled(),true);await page.getByRole('button',{name:/Continue/}).click();await page.locator('#hud-layer:not(.hidden) .objective-card').waitFor();await page.waitForTimeout(1200);observations.push({stage:'real browser process reopened and Continue',diagnostics:await page.locator('#wm-preview-diagnostics').innerText()});
 await page.screenshot({path:out+'/ordinary-url-reopened.png'});assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/ordinary-url.json',JSON.stringify({status:'PASS',accepted,url,browser:context.browser()?.version(),method:'Ordinary sponsor URL with diagnostics only; debug API absent; real keyboard and menu movement/Save Game/Save & Quit; complete browser process close and persistent-profile reopen/Continue. No injected state or save fixtures.',observations,errors},null,2));
}catch(error){fs.writeFileSync(out+'/ordinary-url-failure.json',JSON.stringify({status:'NOT_PASS',accepted,url,error:String(error),observations,errors},null,2));throw error;}finally{await context?.close();}
