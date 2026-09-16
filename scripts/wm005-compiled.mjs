import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';import {chromium} from '@playwright/test';
const base='/Webmaster/wm005-preview/',url='http://127.0.0.1:4177'+base+'?test=1&diagnostics=1',prefix='webmaster.wm005-preview.v1:';
const out=path.resolve('.wm005-payload'),reportDir='evidence/wm-005/compiled';fs.mkdirSync(reportDir,{recursive:true});
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const baseline=path.resolve('../save-baseline'),derived=path.resolve('.wm005-derived');fs.mkdirSync(derived,{recursive:true});
assert.equal(git(baseline,'rev-parse','HEAD'),'3962446ca00c6e1db6bd8b250335b24619a0aeab');
const sources=[];for(const file of fs.readdirSync(baseline+'/src/core').filter(x=>x.endsWith('.ts'))){
  const b=fs.readFileSync(baseline+'/src/core/'+file),blob=crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');assert.equal(blob,git(baseline,'rev-parse',`HEAD:src/core/${file}`));
  fs.writeFileSync(derived+'/'+file.replace(/\.ts$/,'.mjs'),stripTypeScriptTypes(b.toString(),{mode:'transform'}).replace(/(from\s*["'])(\.[^"']+)(["'])/g,(_,a,p,z)=>a+p+'.mjs'+z));sources.push({file,blob});
}
const {SaveStore}=await import(pathToFileURL(derived+'/save.mjs').href);
const old=['WM-001','WM-002'].map(name=>({name,...JSON.parse(fs.readFileSync(`evidence/wm-003/legacy-saves/${name}.json`))}));
const map=new Map(),memory={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
const payload={...old[1].payload,slot:1,position:{x:-11,y:2.6,z:-51},climb:{version:1,checkpoint:6,completed:true},updatedAt:Date.now()-86400000};
assert.equal(new SaveStore(memory).write(1,'manual',payload).ok,true);
old.push({name:'WM-003',payload,stored:Object.fromEntries(map),source:git(baseline,'rev-parse','HEAD'),sources});
fs.writeFileSync(reportDir+'/wm003-exact-writer-fixture.json',JSON.stringify(old[2],null,2));
const obsoletePayload={...payload,position:{x:0,y:-8,z:30}},obsoleteMap=new Map();
const obsoleteStore={getItem:k=>obsoleteMap.get(k)??null,setItem:(k,v)=>obsoleteMap.set(k,v),removeItem:k=>obsoleteMap.delete(k)};
assert.equal(new SaveStore(obsoleteStore).write(1,'manual',obsoletePayload).ok,true);
old.push({name:'WM-003-obsolete-support',payload:obsoletePayload,expectedPosition:{x:0,y:-18,z:30},stored:Object.fromEntries(obsoleteMap),source:git(baseline,'rev-parse','HEAD'),classification:'Explicit compatibility fixture at removed WM003 learning-catch support; exact historical writer, not a sponsor record or earned route'});
const wm004Root=path.resolve('../baseline'),wm004Derived=path.join(derived,'wm004');fs.mkdirSync(wm004Derived,{recursive:true});
assert.equal(git(wm004Root,'rev-parse','HEAD'),'a63ad0e05ce12d2b42ff22e97d39de4af51d4b08');
const wm004Sources=[];for(const file of fs.readdirSync(wm004Root+'/src/core').filter(x=>x.endsWith('.ts'))){
 const b=fs.readFileSync(wm004Root+'/src/core/'+file),blob=crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');assert.equal(blob,git(wm004Root,'rev-parse',`HEAD:src/core/${file}`));
 fs.writeFileSync(wm004Derived+'/'+file.replace(/\.ts$/,'.mjs'),stripTypeScriptTypes(b.toString(),{mode:'transform'}).replace(/(from\s*["'])(\.[^"']+)(["'])/g,(_,a,p,z)=>a+p+'.mjs'+z));wm004Sources.push({file,blob});
}
const {SaveStore:WM004SaveStore}=await import(pathToFileURL(wm004Derived+'/save.mjs').href);
old.push({name:'WM-004-completed-course',payload:{...payload,position:{x:67,y:1,z:6},course:{version:1,next:20,completed:true}},expectedPosition:{x:67,y:-18,z:6},stored:{},source:git(wm004Root,'rev-parse','HEAD'),sources:wm004Sources});
const wm4=old.at(-1),mm=new Map(),st={getItem:k=>mm.get(k)??null,setItem:(k,v)=>mm.set(k,v),removeItem:k=>mm.delete(k)};
assert.equal(new WM004SaveStore(st).write(1,'manual',wm4.payload).ok,true);wm4.stored=Object.fromEntries(mm);wm4.classification='Exact merged WM004 writer; completed course at displaced final roof; preserved record, nearest street restoration';
fs.writeFileSync(reportDir+'/wm004-exact-writer-fixture.json',JSON.stringify(wm4,null,2));
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!pathname.startsWith(base)){res.writeHead(404);res.end();return;}
  const file=path.resolve(out,pathname.slice(base.length)||'index.html');if(!file.startsWith(out+path.sep)){res.writeHead(403);res.end();return;}
  const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.wasm':'application/wasm'};
  res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(4177,'127.0.0.1',resolve));
const results=[],failures=[];
const nativeState=p=>p.evaluate(()=>{const n=window.__wm4Native;return Object.fromEntries(Array.from({length:n.length},(_,i)=>{const k=n.key(i);return[k,n.getItem(k)];}));});
try{for(const fixture of[...old,{name:'new-street',stored:{}}]){
  const profile=path.resolve(`.wm005-profiles/${fixture.name}`);fs.rmSync(profile,{recursive:true,force:true});
  const opts={headless:true,channel:'chromium',viewport:{width:1280,height:720}};
  let ctx=await chromium.launchPersistentContext(profile,opts),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await ctx.addInitScript(({root,stored,prefix})=>{window.__wm4Native=window.localStorage;for(const[k,v]of Object.entries(root))localStorage.setItem(k,v);for(const[k,v]of Object.entries(stored))localStorage.setItem(prefix+k,v);},{root:{...old[1].stored,'webmaster.wm003-preview.v1:sentinel':'keep previous preview','webmaster.wm004-preview.v1:sentinel':'keep S4 preview'},stored:fixture.stored,prefix});
  try{
    await page.goto(url);await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});
    assert.match(await page.locator('#wm-preview').innerText(),/WM-005 preview/);
    const before=await nativeState(page);
    if(fixture.name==='new-street'){
      await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();
      await page.keyboard.down('d');await page.waitForFunction(()=>window.__WM_DEBUG__.getState().position.x>=15.5,null,{timeout:15000});await page.keyboard.up('d');
      await page.waitForFunction(()=>{const s=window.__WM_DEBUG__.getState();return s.safe&&s.position.y===-18;},null,{timeout:15000});await page.waitForTimeout(700);
    }else{
      await page.getByRole('button',{name:/Continue/}).click();await page.waitForFunction(()=>window.__WM_DEBUG__.getState().safe);
      assert.deepEqual((await page.evaluate(()=>window.__WM_DEBUG__.getState())).position,fixture.expectedPosition??fixture.payload.position);
      assert.deepEqual(await nativeState(page),before);
    }
    const historicalLoaded=await page.evaluate(()=>window.__WM_DEBUG__.getState());
    if(fixture.name==='WM-004-completed-course'){assert.equal(historicalLoaded.course.completed,true);assert.equal(historicalLoaded.course.next,0);assert.equal(historicalLoaded.course.completions,0);}
    if(fixture.name==='WM-003'){
      await page.keyboard.press('Escape');await page.getByRole('button',{name:/Replay 20-ring/}).click();
      await page.waitForFunction(()=>window.__WM_DEBUG__.getState().course.active);
      const replay=await page.evaluate(()=>window.__WM_DEBUG__.getState());
      assert.equal(replay.training.checkpoint,historicalLoaded.training.checkpoint);assert.equal(replay.training.completed,historicalLoaded.training.completed);
      assert.equal(replay.skyline.stage,historicalLoaded.skyline.stage);assert.equal(replay.skyline.completed,historicalLoaded.skyline.completed);
      assert.deepEqual(replay.position,{x:0,y:0,z:-42});
    }
    const loaded=await page.evaluate(()=>window.__WM_DEBUG__.getState());
    await page.keyboard.press('Escape');await page.getByRole('button',{name:/Save Game/}).click();await page.locator('#toast-layer').filter({hasText:'Save confirmed'}).waitFor();
    await page.getByRole('button',{name:/Save & Quit/}).click();await page.getByRole('heading',{name:'WEBMASTER',exact:true}).waitFor();
    const saved=await nativeState(page),rootOnly=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!k.startsWith(prefix)));
    assert.deepEqual(rootOnly(saved),rootOnly(before));assert.deepEqual(errors,[]);
    await ctx.close();ctx=await chromium.launchPersistentContext(profile,opts);await ctx.addInitScript(()=>{window.__wm4Native=window.localStorage;});page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url);await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});assert.deepEqual(await nativeState(page),saved);
    await page.getByRole('button',{name:/Continue/}).click();await page.waitForFunction(()=>window.__WM_DEBUG__.getState().safe);
    const reopened=await page.evaluate(()=>window.__WM_DEBUG__.getState());assert.deepEqual(reopened.position,loaded.position);assert.ok(Object.values(reopened.velocity).every(v=>v===0),"Every velocity component must be exactly zero (either sign)");assert.equal(reopened.swing.web,null);assert.equal(reopened.traversal.surfaceId,null);assert.equal(reopened.traversal.pullId,null);assert.deepEqual(await nativeState(page),saved);assert.deepEqual(errors,[]);
    assert.equal(reopened.training.checkpoint,loaded.training.checkpoint);assert.equal(reopened.training.completed,loaded.training.completed);
    assert.equal(reopened.skyline.stage,loaded.skyline.stage);assert.equal(reopened.skyline.completed,loaded.skyline.completed);
    if(fixture.name==='WM-003')assert.equal(reopened.course.active,true);
    await page.screenshot({path:`${reportDir}/${fixture.name}-reopened.png`});results.push({fixture:fixture.name,status:'PASS',method:'Compiled isolated preview; genuine menu actions; exact old writer fixture; WM003 Replay 20-ring preserves earned S2/S3 progress; Save Game/Save & Quit; Chromium process closes and reopens same persistent profile without reinjection; identical stored generations and preserved root/WM003 keys',historicalLoaded,loaded,reopened,errors});
  }catch(error){
    failures.push({fixture:fixture.name,error:String(error),state:await page.evaluate(()=>window.__WM_DEBUG__?.getState()).catch(()=>null),errors});
    await page.screenshot({path:`${reportDir}/${fixture.name}-failure.png`}).catch(()=>{});throw error;
  }finally{await ctx.close();}
}}finally{await new Promise(resolve=>server.close(resolve));fs.writeFileSync(reportDir+'/results.json',JSON.stringify({source:git('.','rev-parse','HEAD'),tree:git('.','rev-parse','HEAD^{tree}'),results,failures,complete:results.length===6&&failures.length===0},null,2));}
assert.equal(results.length,6);console.log(JSON.stringify({status:'PASS',cases:results.map(x=>x.fixture)}));

