import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import {createServer} from 'vite';import {chromium} from '@playwright/test';
const out='evidence/wm-004/render-diagnostic';fs.mkdirSync(out,{recursive:true});
const identity=root=>({head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim()});
assert.equal(identity('.').head,'87ae3cda98221e3339aaf3a88610c93e3938ae28');assert.equal(identity('../baseline').head,'3962446ca00c6e1db6bd8b250335b24619a0aeab');
const results=[],browser=await chromium.launch({headless:true,channel:'chromium'});
try{for(const variant of ['baseline','candidate','new-surfaces-no-shadow','hero-no-texture','new-labels-hidden','new-surfaces-hidden','freeze-materials','candidate-repeat']){
  const root=path.resolve(variant==='baseline'?'../baseline':'.'),server=await createServer({root,configFile:path.join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:4178,strictPort:true,watch:null,hmr:false}});await server.listen();
  const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
    await page.goto('http://127.0.0.1:4178/?test=1');await page.locator('#loading.hidden').waitFor({state:'attached',timeout:45000});
    await page.getByRole('button',{name:/New Game/}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.getByRole('button',{name:/Normal/}).click();await page.waitForTimeout(5000);
    const setup=await page.evaluate(async variant=>{
      const entry=performance.getEntriesByType('resource').find(x=>x.name.includes('@babylonjs_core_Engines_engine.js'));if(!entry)throw Error('Exact already-loaded Engine module not found');
      const {Engine}=await import(entry.name),scene=Engine.LastCreatedScene;if(!scene||scene.getEngine().getRenderingCanvas()!==document.querySelector('#game-canvas'))throw Error('Wrong scene identity');
      const changed=[],surfaces=scene.meshes.filter(m=>m.name==='solid-recovery-street'||m.name.endsWith('-s4-building'));
      if(variant==='new-surfaces-no-shadow')for(const m of surfaces){m.receiveShadows=false;changed.push(m.name);}
      if(variant==='hero-no-texture')for(const m of scene.materials.filter(m=>m.name.startsWith('hero-'))){m.diffuseTexture=null;changed.push(m.name);}
      if(variant==='new-labels-hidden')for(const m of scene.meshes.filter(m=>/^(ring-number-|wall-sign-|long-course-|practice-course-guide)/.test(m.name))){m.setEnabled(false);changed.push(m.name);}
      if(variant==='new-surfaces-hidden')for(const m of surfaces){m.setEnabled(false);changed.push(m.name);}
      if(variant==='freeze-materials')for(const m of scene.materials){m.freeze();changed.push(m.name);}
      const canvas=scene.getEngine().getRenderingCanvas(),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
      return{engineModule:entry.name,changed,meshCount:scene.meshes.length,activeMeshes:scene.getActiveMeshes().length,materials:scene.materials.length,canvas:[canvas.width,canvas.height],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),meshes:scene.meshes.map(m=>({name:m.name,enabled:m.isEnabled(),receiveShadows:m.receiveShadows,material:m.material?.name,vertices:m.getTotalVertices()}))};
    },variant);
    await page.waitForTimeout(3000);const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
    const times=await page.evaluate(()=>new Promise(resolve=>{let first;const times=[];function frame(t){first??=t;times.push(t-first);if(t-first<8000)requestAnimationFrame(frame);else resolve(times);}requestAnimationFrame(frame);}));
    const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(`${out}/${variant}.cpuprofile`,JSON.stringify(profile));
    await page.screenshot({path:`${out}/${variant}.png`});
    const fps=(times.length-1)*1000/times.at(-1),top=profile.nodes.map(n=>({function:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,hits:n.hitCount??0})).sort((a,b)=>b.hits-a.hits).slice(0,30);
    const result={variant,classification:variant==='baseline'||variant.startsWith('candidate')?'UNCHANGED_CONTROL':'DIAGNOSTIC_RUNTIME_ABLATION_NOT_ACCEPTANCE_OR_GAMEPLAY_EVIDENCE',source:identity(root),browser:browser.version(),setup,fps,frameTimesMs:times,top,errors};results.push(result);console.log(JSON.stringify({variant,fps,changed:setup.changed,top:top.slice(0,8),errors}));assert.deepEqual(errors,[]);
  }catch(error){fs.writeFileSync(`${out}/${variant}-failure.txt`,String(error));throw error;}finally{await context.close();await server.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({actor:'WEBMASTER_PRODUCT_OWNER',classification:'One bounded diagnostic; temporary rendering toggles only, never an acceptance PASS',results},null,2));}
}}finally{await browser.close();}
