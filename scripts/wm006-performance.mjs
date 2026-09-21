import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {createServer} from 'vite';import {chromium} from '@playwright/test';
import {installCourseControls} from '../e2e/routes/wm005-route.ts';
const roots={candidate:path.resolve('.'),baseline:path.resolve('../baseline')};
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git(roots.baseline,'rev-parse','HEAD'),'6aff5802736b5c12380102a70a38794838397d7d');
assert.equal(git(roots.baseline,'rev-parse','HEAD^{tree}'),'2d815a1d42d6e9da3d08175b286aa685acb06e72');
const records=[];let browser;
async function begin(page){
  await page.goto('http://127.0.0.1:4176/?test=1');await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});
  await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();
  await installCourseControls(page,false);await page.waitForTimeout(5000);
}
async function sample(page,phase){
  return page.evaluate(async phase=>{
    const c=window.__wm005Controls,times=[],states=[];let start=null,lastBucket=-1,lastAttack=-1;
    while(true){await new Promise(requestAnimationFrame);const now=performance.now();start??=now;const t=now-start;times.push(t);
      const bucket=Math.floor(t/1000);if(bucket!==lastBucket){lastBucket=bucket;states.push({t,state:c.state()});
        if(phase==='practice')c.keys(bucket%2?'s':'w');
        else if(phase==='climbing')c.keys('c',bucket%2?'s':'w');
        else if(phase==='combat-street')c.keys();
        else c.keys('w','e');
      }if(t>=12000)break;
      if(phase==='combat-street'&&c.state().combat?.active){const n=Math.floor(t/450);if(n!==lastAttack){lastAttack=n;const key=['j','k','l'][n%3],code='Key'+key.toUpperCase();window.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key,code,bubbles:true}));}}
    }c.keys();return{times,states};
  },phase);
}
try{
  for(const[width,height]of[[1280,720],[1920,1080]])for(const round of[0,1,2,3])for(const name of round%2?['candidate','baseline']:['baseline','candidate']){
    // Isolate GPU/context lifetime between paired groups. The unchanged-C2
    // heading diagnosis exhausted a long-lived browser during its final round.
    // Every group still uses the same installed browser, machine and defaults.
    browser=await chromium.launch({headless:true,channel:'chromium'});
    const server=await createServer({root:roots[name],configFile:path.join(roots[name],'vite.config.ts'),server:{host:'127.0.0.1',port:4176,strictPort:true,watch:null,hmr:false}});await server.listen();
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await begin(page);
      for(const phase of ['practice','swinging','climbing','combat-street']){
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
        else await page.evaluate(async()=>{const c=window.__wm005Controls;await c.look(-Math.PI/2,1.08);c.keys('a');await c.at('x',-21,-1);c.keys();await c.until(s=>s.grounded&&s.position.y===-18,'paired combat street');await c.center({x:-21,z:-54});await c.center({x:-38,z:-54});const before=c.state().position.z;c.keys('w');await c.until(s=>s.position.z>before+.06,'ordinary-input facing alignment');c.keys();await c.rest(600);});
        await page.waitForTimeout(1500);
      }
      const gpu=await page.evaluate(()=>{const c=document.querySelector('#game-canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return{renderer:'unavailable'};const e=g.getExtension('WEBGL_debug_renderer_info');return{renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),canvas:[c.width,c.height]};});
      const setup=await page.evaluate(()=>({state:window.__wm005Controls.state(),hero:window.__WM_DEBUG__.getHeroView()}));
      if(phase==='combat-street'){
        assert.ok(Math.abs(setup.hero.front.x)<.01&&setup.hero.front.z>.99,'same north-facing hero before samples');
        assert.ok(Math.abs(setup.state.cameraAlpha+Math.PI/2)<.01&&Math.abs(setup.state.cameraBeta-1.08)<.01,'paired camera angles');
        assert.ok(Math.abs(setup.state.position.x+38)<.55&&Math.abs(setup.state.position.z+54)<.8,'same street location through actual input');
      }
      const {times,states}=await sample(page,phase),buckets=Array.from({length:12},(_,i)=>times.filter(t=>t>=i*1000&&t<(i+1)*1000).length);
      assert.deepEqual(errors,[]);
      if(phase==='swinging')assert(states.every(x=>x.state.swing.web?.anchorId==='ring-3'),'paired attached swing samples');
      if(phase==='climbing')assert(states.every(x=>x.state.traversal.surfaceId==='practice'),'paired active climb samples');
      records.push({name,round,phase,width,height,setup,source:git(roots[name],'rev-parse','HEAD'),tree:git(roots[name],'rev-parse','HEAD^{tree}'),browser:browser.version(),gpu,
        elapsedMs:times.at(-1),fps:(times.length-1)*1000/times.at(-1),minimum:Math.min(...buckets),oneSecondFps:buckets,frameTimesMs:times,states,errors});
      fs.writeFileSync('evidence/wm-006/performance-partial.json',JSON.stringify({status:'INCOMPLETE',records},null,2));
      console.log(JSON.stringify({...records.at(-1),frameTimesMs:undefined,states:undefined,setup:undefined}));
      if(phase==='combat-street'){fs.mkdirSync('evidence/wm-006/performance-captures',{recursive:true});await page.screenshot({path:`evidence/wm-006/performance-captures/${name}-${width}-${round}.png`});}
      }
    }finally{await context.close();await browser.close();browser=null;await server.close();}
  }
}finally{await browser?.close();}
const comparisons=[];
for(const width of[1280,1920])for(const phase of ['practice','swinging','climbing','combat-street']){
  const c=records.filter(x=>x.name==='candidate'&&x.width===width&&x.phase===phase),b=records.filter(x=>x.name==='baseline'&&x.width===width&&x.phase===phase);
  assert.equal(c.length,4,'all candidate repetitions required');assert.equal(b.length,4,'all baseline repetitions required');
  const mean=a=>a.reduce((s,x)=>s+x.fps,0)/a.length,candidate=mean(c),baseline=mean(b);
  const software=[...c,...b].every(x=>/SwiftShader|software|llvmpipe/i.test(x.gpu.renderer));
  // The approved target is measured FPS, reported as the paired-run mean.
  // One-second buckets remain raw evidence but are not a second, hidden threshold.
  const candidateFloor=candidate>=30,baselineFloor=baseline>=30;
  const noMaterialRegression=candidate>=baseline*.9;
  const pass=noMaterialRegression&&(candidateFloor||(software&&!baselineFloor));
  comparisons.push({width,phase,candidate,baseline,ratio:candidate/baseline,software,candidateFloor,baselineFloor,noMaterialRegression,pass});
}
const result={method:'Four alternating-order same-browser-version/runtime/machine repetitions at each resolution, with practice, attached forward-assisted swinging, active wall-climb and combat-street samples. Fresh browser process per baseline/candidate group to release old GPU contexts. All reached from ordinary New Game and actual keyboard/mouse input; paired combat heading/camera/location asserted. No recorder, fixture placement, source/time/progression writes or competing renderer; default adaptive quality. Each phase must have mean FPS >=30, or the narrow software-renderer baseline exception, and mean loss <=10%. Raw frame times, actual phase canvas and one-second gameplay states retained. Real-browser30FPS target remains; software exception only when exact accepted baseline also fails.',records,comparisons,status:comparisons.every(x=>x.pass)?'PASS':'NOT_PASS'};
fs.writeFileSync('evidence/wm-006/performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(comparisons));assert.equal(result.status,'PASS');
