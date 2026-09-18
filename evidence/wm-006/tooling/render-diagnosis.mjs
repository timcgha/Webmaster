import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {createServer} from 'vite';import {chromium} from '@playwright/test';
import {installCourseControls} from '../e2e/routes/wm005-route.ts';
const roots={candidate:path.resolve('.'),baseline:path.resolve('../baseline')};
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git(roots.baseline,'rev-parse','HEAD'),'6aff5802736b5c12380102a70a38794838397d7d');
assert.equal(git(roots.baseline,'rev-parse','HEAD^{tree}'),'2d815a1d42d6e9da3d08175b286aa685acb06e72');
const records=[];let browser;const out='evidence/wm-006/render-diagnosis';fs.mkdirSync(out,{recursive:true});
async function begin(page){
  await page.goto('http://127.0.0.1:4176/?test=1');await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});
  await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();
  await installCourseControls(page,false);await page.waitForTimeout(5000);
}
async function sample(page,phase,mode){
 return page.evaluate(async ({phase,mode})=>{
  const c=window.__wm005Controls,times=[],states=[];let start=null,lastBucket=-1,lastAttack=-1,readMs=0,readCount=0,active=false;
  const read=()=>{const start=performance.now(),s=c.state();readMs+=performance.now()-start;readCount++;return s;};
  while(true){await new Promise(requestAnimationFrame);const now=performance.now();start??=now;const t=now-start;times.push(t);
   const bucket=Math.floor(t/1000);if(bucket!==lastBucket){lastBucket=bucket;const state=read();active=!!state.combat?.active;const canvas=document.querySelector('#game-canvas');states.push({t,state,canvas:[canvas.width,canvas.height]});c.keys();}
   if(t>=12000)break;
   active=!!read().combat?.active;
   if(mode!=='idle'&&active){const n=Math.floor(t/450);if(n!==lastAttack){lastAttack=n;const key=['j','k','l'][n%3],code='Key'+key.toUpperCase();window.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key,code,bubbles:true}));}}
  }c.keys();return{times,states,readMs,readCount};
 },{phase,mode});
}
try{
  browser=await chromium.launch({headless:true,channel:'chromium'});
  for(const[width,height]of[[1920,1080]])for(const round of[0])for(const name of round%2?['candidate','baseline']:['baseline','candidate']){
    const server=await createServer({root:roots[name],configFile:path.join(roots[name],'vite.config.ts'),server:{host:'127.0.0.1',port:4176,strictPort:true,watch:null,hmr:false}});await server.listen();
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await begin(page);
      const gpu=await page.evaluate(()=>{const c=document.querySelector('#game-canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return{renderer:'unavailable'};const e=g.getExtension('WEBGL_debug_renderer_info');return{renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),canvas:[c.width,c.height]};});
      for(const phase of ['combat-street']){
      if(phase==='swinging')await page.evaluate(async()=>{await window.__wm005Controls.loopSetup();});
      if(phase==='climbing'){
        // A fresh menu start prevents the preceding swing's earned position from
        // affecting the paired climb. The accepted WM004 north teaching face is
        // shared with WM005; new unmarked-face correctness is verified separately.
        await page.evaluate(()=>localStorage.clear());await begin(page);
        await page.evaluate(async()=>{const c=window.__wm005Controls;await c.look(-Math.PI/2,1.1);c.keys('w');await c.at('z',26);c.keys();await c.until(s=>s.grounded&&s.position.y===-18,'performance street');await c.look(Math.PI/2,1.1);c.keys('w','c');await c.until(s=>s.traversal.surfaceId==='practice'&&s.position.y>-12,'performance wall');c.keys('c');});
      }
      if(phase==='combat-street'){
        await page.evaluate(()=>localStorage.clear());await begin(page);
        if(name==='candidate'){await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Combat Playground/}).click();}
        else await page.evaluate(async()=>{const c=window.__wm005Controls;await c.look(-Math.PI/2,1.08);c.keys('a');await c.at('x',-21,-1);c.keys();await c.until(s=>s.grounded&&s.position.y===-18,'paired combat street');await c.center({x:-21,z:-54});await c.center({x:-38,z:-54});});
        await page.waitForTimeout(1500);
      }
      await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('@babylonjs_core_Engines_engine.js'));if(!url)throw Error('Engine module not observed');const {Engine}=await import(url);const scene=Engine.LastCreatedScene;if(!scene)throw Error('Existing scene unavailable');window.__renderDiagnostic={scene,meshes:scene.meshes.filter(m=>m.metadata?.combatDynamic).map(m=>({mesh:m,visible:m.isVisible})),materials:scene.materials.filter(m=>m.name.startsWith('training-')||m.name.startsWith('label-mat-')).map(m=>({material:m,disabled:m.disableLighting,emissive:m.emissiveColor?.clone()}))};});
      for(const mode of (name==='candidate'?['native','mats-hidden','actors-hidden','unlit-combat','restored-native']:['native'])){
      await page.evaluate(mode=>{const d=window.__renderDiagnostic;for(const {mesh,visible}of d.meshes)mesh.isVisible=visible;for(const {material,disabled,emissive}of d.materials){material.disableLighting=disabled;if(emissive)material.emissiveColor=emissive.clone();}for(const {mesh}of d.meshes){const mat=mesh.name.startsWith('combat-station-mat-');if((mode==='mats-hidden'&&mat)||(mode==='actors-hidden'&&!mat))mesh.isVisible=false;}if(mode==='unlit-combat')for(const {material}of d.materials){material.disableLighting=true;material.emissiveColor=material.diffuseColor.clone();}},mode);
      await page.evaluate(()=>window.__wm005Controls.rest(1500));
      if(mode==='hidden-hud')await page.addStyleTag({content:'#hud-layer { visibility:hidden !important; }'}).then(h=>h.evaluate(e=>e.id='diagnostic-only-style'));
      const {times,states,readMs,readCount}=await sample(page,phase,mode),buckets=Array.from({length:12},(_,i)=>times.filter(t=>t>=i*1000&&t<(i+1)*1000).length);
      assert.deepEqual(errors,[]);
      if(phase==='swinging')assert(states.every(x=>x.state.swing.web?.anchorId==='ring-3'),'paired attached swing samples');
      if(phase==='climbing')assert(states.every(x=>x.state.traversal.surfaceId==='practice'),'paired active climb samples');
      records.push({name,round,phase,mode,readMs,readCount,width,height,source:git(roots[name],'rev-parse','HEAD'),tree:git(roots[name],'rev-parse','HEAD^{tree}'),browser:browser.version(),gpu,
        elapsedMs:times.at(-1),fps:(times.length-1)*1000/times.at(-1),minimum:Math.min(...buckets),oneSecondFps:buckets,frameTimesMs:times,states,errors});
      fs.writeFileSync(out+'/records.json',JSON.stringify({status:'INCOMPLETE',records},null,2));
      console.log(JSON.stringify({...records.at(-1),frameTimesMs:undefined,states:undefined}));
      await page.screenshot({path:`${out}/${name}-${round}-${mode}.png`});
      await page.evaluate(()=>document.querySelector('#diagnostic-only-style')?.remove());
      }
      }
    }finally{await context.close();await server.close();}
  }
}finally{await browser?.close();}
fs.writeFileSync(out+'/summary.json',JSON.stringify({classification:'DIAGNOSTIC_ONLY, not a gate pass; removed geometry and unlit conditions are diagnostic only, not eligible acceptance evidence',source:git(roots.candidate,'rev-parse','HEAD'),tree:git(roots.candidate,'rev-parse','HEAD^{tree}'),records:records.map(({frameTimesMs,states,...r})=>({...r,first:states[0],last:states.at(-1)}))},null,2));
