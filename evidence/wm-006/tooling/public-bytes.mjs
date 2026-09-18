import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{cwd:'../site',encoding:'utf8'}).trim();
const source=process.env.WM_SOURCE,publication=process.env.WM_PUBLICATION,baseline='2b1a4bd0c94e7d226d6fc8388cafcb0ff0aff8f8';
assert.equal(git('rev-parse','HEAD'),publication);assert.equal(git('rev-parse','HEAD^'),baseline);
const list=ref=>git('ls-tree','-r',ref).split('\n').map(x=>{const tab=x.indexOf('\t');return{path:x.slice(tab+1),blob:x.slice(0,tab).split(' ')[2]};});
const before=list(baseline),after=list('HEAD');assert.deepEqual(after.filter(x=>!x.path.startsWith('wm006-preview/')),before,'Root and every earlier preview must be byte-identical');
const provenance=JSON.parse(fs.readFileSync('../site/wm006-preview/wm-provenance.json','utf8'));assert.equal(provenance.source,source);assert.equal(provenance.tree,process.env.WM_TREE);assert.equal(provenance.saveNamespace,'webmaster.wm006-preview.v1:');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),records=[],hidden=[];
let index=0;async function worker(){while(index<after.length){const f=after[index++];if(f.path.split('/').some(x=>x.startsWith('.'))){hidden.push(f);continue;}
 const expected=fs.readFileSync(path.join('../site',f.path)),url='https://timcgha.github.io/Webmaster/'+f.path.split('/').map(encodeURIComponent).join('/');
 let last;for(let attempt=1;attempt<=3;attempt++){try{const response=await fetch(url+'?wm006='+source,{signal:AbortSignal.timeout(45000)});assert.equal(response.status,200,url);const actual=Buffer.from(await response.arrayBuffer());assert.equal(hash(actual),hash(expected),url);last={path:f.path,url,bytes:actual.length,sha256:hash(actual),status:'PASS'};break;}catch(e){last={path:f.path,url,status:'FAIL',error:String(e)};if(attempt<3)await new Promise(r=>setTimeout(r,1500));}}records.push(last);
}}
await Promise.all(Array.from({length:6},worker));records.sort((a,b)=>a.path.localeCompare(b.path));
fs.mkdirSync('evidence/wm-006/public',{recursive:true});const result={source,tree:process.env.WM_TREE,publication,publicationTree:git('rev-parse','HEAD^{tree}'),priorPages:baseline,provenance,rootAndEarlierPreviewGitFilesUnchanged:before.length,publicRecords:records,platformMarkersVerifiedInGitOnly:hidden,status:records.every(x=>x.status==='PASS')?'PASS':'FAIL'};
fs.writeFileSync('evidence/wm-006/public/bytes.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,publicRecords:records.length,platformMarkersVerifiedInGitOnly:hidden.length}));assert.equal(result.status,'PASS');
