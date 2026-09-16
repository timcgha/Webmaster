// Run only after exact-source SELF_REVIEW_PASS and authorized isolated publication.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const expected=JSON.parse(fs.readFileSync('../tooling/evidence/wm-005/public-tooling/accepted.json'));
const site=path.resolve('../site'),prior=path.resolve('../prior'),out='evidence/wm-005/public';fs.mkdirSync(out,{recursive:true});
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git('.','rev-parse','HEAD'),expected.source);assert.equal(git('.','rev-parse','HEAD^{tree}'),expected.sourceTree);
assert.equal(git(site,'rev-parse','HEAD'),expected.pagesCommit);assert.equal(git(site,'rev-parse','HEAD^{tree}'),expected.pagesTree);
assert.equal(git(prior,'rev-parse','HEAD'),'b4a583116fc0823434f11788e5ab0bec36358f4d');
function files(root){return execFileSync('git',['ls-tree','-r','--name-only','-z','HEAD'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);}
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=files(prior);for(const file of old)assert.deepEqual(fs.readFileSync(path.join(site,file)),fs.readFileSync(path.join(prior,file)),file+' preserved');
const all=files(site);assert(all.filter(f=>!old.includes(f)).every(f=>f.startsWith('wm005-preview/')));
assert.equal(git(site,'rev-parse','HEAD:wm005-preview'),expected.payloadTree);
const provenance=JSON.parse(fs.readFileSync(path.join(site,'wm005-preview/wm-provenance.json')));
assert.equal(provenance.source,expected.source);assert.equal(provenance.tree,expected.sourceTree);assert.equal(provenance.payloadSha256,expected.payloadSha256);assert.equal(provenance.saveNamespace,'webmaster.wm005-preview.v1:');
const results=[],failures=[];
for(const file of all){
 const local=fs.readFileSync(path.join(site,file)),sha256=digest(local),url='https://timcgha.github.io/Webmaster/'+file;
 let record;
 for(let attempt=0;attempt<6;attempt++){
  try{const r=await fetch(url+(attempt?'?wm005='+expected.source+'-'+attempt:''));const bytes=Buffer.from(await r.arrayBuffer());
   record={path:file,status:r.status,bytes:bytes.length,sha256:digest(bytes),expectedSha256:sha256,attempt,prior:old.includes(file)};
   if(r.status===200&&record.sha256===sha256)break;
  }catch(error){record={path:file,error:String(error),attempt};}
  await new Promise(r=>setTimeout(r,5000));
 }
 results.push(record);if(record.status!==200||record.sha256!==sha256)failures.push(record);
}
fs.writeFileSync(out+'/public-bytes.json',JSON.stringify({expected,priorFiles:old.length,allFiles:all.length,results,failures,status:failures.length?'NOT_PASS':'PASS'},null,2));
assert.deepEqual(failures,[]);console.log(JSON.stringify({status:'PASS',priorFiles:old.length,allFiles:all.length}));
