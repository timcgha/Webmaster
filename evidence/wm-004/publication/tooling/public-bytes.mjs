// Existing-platform public verification; called from the publication checkout.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const expected={head:'__PUBLICATION_HEAD__',tree:'__PUBLICATION_TREE__',source:'__ACCEPTED_SOURCE__',sourceTree:'__ACCEPTED_TREE__',payload:'__ACCEPTED_PAYLOAD__'};
const baseline=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),output=process.argv[3],preflight=process.argv.includes('--preflight');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
assert.equal(head,preflight?baseline.head:expected.head);assert.equal(tree,preflight?baseline.tree:expected.tree);
const paths=execFileSync('git',['ls-tree','-rz','--name-only','HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
const old=new Map(baseline.files.map(x=>[x.path,x]));const files=[];
for(const file of paths){const b=fs.readFileSync(file),row={path:file,bytes:b.length,sha256:sha(b),kind:old.has(file)?'preserved':'new'};
 if(old.has(file)){assert.equal(row.sha256,old.get(file).sha256,file);assert.equal(row.bytes,old.get(file).bytes,file);}else assert.ok(!preflight&&file.startsWith('wm004-preview/'),file);
 files.push(row);
}
assert.equal(files.filter(x=>x.kind==='preserved').length,baseline.files.length);
let provenance=null;
if(!preflight){provenance=JSON.parse(fs.readFileSync('wm004-preview/wm-provenance.json','utf8'));assert.equal(provenance.source,expected.source);assert.equal(provenance.tree,expected.sourceTree);assert.equal(provenance.payloadSha256,expected.payload);}
const results=new Map();let remaining=files;
for(let attempt=1;attempt<=2&&remaining.length;attempt++){
 let next=0,done=0;
 await Promise.all(Array.from({length:12},async()=>{while(next<remaining.length){const x=remaining[next++];let result;
   try{const response=await fetch('https://timcgha.github.io/Webmaster/'+x.path.split('/').map(encodeURIComponent).join('/'),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
    const b=Buffer.from(await response.arrayBuffer()),observed={status:response.status,bytes:b.length,sha256:sha(b)};
    result={...x,observed,pass:response.status===200&&b.length===x.bytes&&observed.sha256===x.sha256};
   }catch(error){result={...x,pass:false,error:String(error)};}
   results.set(x.path,result);if(++done%25===0)console.log(JSON.stringify({attempt,checked:done,total:remaining.length}));
 }}));
 remaining=files.filter(x=>!results.get(x.path).pass);console.log(JSON.stringify({attempt,failed:remaining.length}));
 if(remaining.length&&attempt<2)await new Promise(r=>setTimeout(r,1000));
}
const report={status:remaining.length?'NOT_PASS':'PASS',author:'WEBMASTER_PRODUCT_OWNER',classification:'SELF_REVIEW; not independent QA',phase:preflight?'prepublication accepted baseline':'postpublication new and preserved bytes',head,tree,provenance,preserved:baseline.files.length,new:files.length-baseline.files.length,files:files.map(x=>results.get(x.path))};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,preserved:report.preserved,new:report.new}));assert.equal(report.status,'PASS');
