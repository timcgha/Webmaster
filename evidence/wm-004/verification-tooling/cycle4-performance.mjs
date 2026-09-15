import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {createServer} from 'vite';import {chromium} from '@playwright/test';
const roots={candidate:path.resolve('.'),baseline:path.resolve('../baseline')};
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git(roots.candidate,'rev-parse','HEAD'),'1b877def5183de08f06efc3d1f774bd93f821728');
assert.equal(git(roots.candidate,'rev-parse','HEAD^{tree}'),'29c07fcd3b33ecc17ce9d5f6287abb030e106b2d');
assert.equal(git(roots.baseline,'rev-parse','HEAD'),'3962446ca00c6e1db6bd8b250335b24619a0aeab');
assert.equal(git(roots.baseline,'rev-parse','HEAD^{tree}'),'f1c808a922c4cd7b96c87b519e72d1ed60d71a4c');
const records=[];let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chromium'});
  for(const[width,height]of[[1280,720],[1920,1080]])for(const round of[0,1,2,3])for(const name of round?['candidate','baseline']:['baseline','candidate']){
    const server=await createServer({root:roots[name],configFile:path.join(roots[name],'vite.config.ts'),server:{host:'127.0.0.1',port:4176,strictPort:true,watch:null,hmr:false}});await server.listen();
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto('http://127.0.0.1:4176/?test=1');await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});
      await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();
      await page.waitForTimeout(10000);
      const gpu=await page.evaluate(()=>{const c=document.querySelector('#game-canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return{renderer:'unavailable'};const e=g.getExtension('WEBGL_debug_renderer_info');return{renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),canvas:[c.width,c.height]};});
      const sampling=page.evaluate(()=>new Promise(resolve=>{let start=null;const times=[];function frame(t){start??=t;times.push(t-start);if(t-start<12000)requestAnimationFrame(frame);else resolve(times);}requestAnimationFrame(frame);}));
      for(let n=0;n<4;n++)for(const key of['w','s']){await page.keyboard.down(key);await page.waitForTimeout(700);await page.keyboard.up(key);await page.waitForTimeout(400);}
      const times=await sampling,buckets=Array.from({length:12},(_,i)=>times.filter(t=>t>=i*1000&&t<(i+1)*1000).length);
      assert.deepEqual(errors,[]);
      records.push({name,round,width,height,source:git(roots[name],'rev-parse','HEAD'),tree:git(roots[name],'rev-parse','HEAD^{tree}'),browser:browser.version(),gpu,
        elapsedMs:times.at(-1),fps:(times.length-1)*1000/times.at(-1),minimum:Math.min(...buckets),oneSecondFps:buckets,frameTimesMs:times,errors});
      console.log(JSON.stringify({...records.at(-1),frameTimesMs:undefined}));
    }finally{await context.close();await server.close();}
  }
}finally{await browser?.close();}
const comparisons=[];
for(const width of[1280,1920]){
  const c=records.filter(x=>x.name==='candidate'&&x.width===width),b=records.filter(x=>x.name==='baseline'&&x.width===width);
  const mean=a=>a.reduce((s,x)=>s+x.fps,0)/a.length,candidate=mean(c),baseline=mean(b);
  const software=[...c,...b].every(x=>/SwiftShader|software|llvmpipe/i.test(x.gpu.renderer));
  const candidateFloor=c.every(x=>x.minimum>=30),baselineFloor=b.every(x=>x.minimum>=30);
  const noMaterialRegression=candidate>=baseline*.9||baseline-candidate<=2;
  const pass=noMaterialRegression&&(candidateFloor||(software&&!baselineFloor));
  comparisons.push({width,candidate,baseline,ratio:candidate/baseline,software,candidateFloor,baselineFloor,noMaterialRegression,pass});
}
const result={method:'Four alternating-order same-browser/runtime repetitions; default adaptive quality; no recorder, fixture placement or competing renderer; actual ordinary practice forward/back input. Criterion: mean FPS loss <=10% or <=2FPS sampling tolerance. Real-browser30FPS target remains; software exception only when exact accepted baseline also fails.',records,comparisons,status:comparisons.every(x=>x.pass)?'PASS':'NOT_PASS'};
fs.writeFileSync('evidence/wm-004/cycle4-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(comparisons));assert.equal(result.status,'PASS');
