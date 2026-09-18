import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
// Read-only release proof. This script cannot publish, update refs or grant PASS.
const [directory,source,tree,reportFile]=process.argv.slice(2);
assert.ok(directory&&source&&tree&&reportFile,'Usage: node verify-payload.mjs PAYLOAD EXPECTED_SOURCE EXPECTED_TREE REPORT');
const root=path.resolve(directory),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const p=JSON.parse(fs.readFileSync(path.join(root,'wm-provenance.json'),'utf8'));
assert.equal(p.source,source);assert.equal(p.tree,tree);assert.equal(p.change,'WM-006');
assert.equal(p.base,'/Webmaster/wm006-preview/');assert.equal(p.saveNamespace,'webmaster.wm006-preview.v1:');
assert.equal(p.priorRoot,'2b1a4bd0c94e7d226d6fc8388cafcb0ff0aff8f8');assert.equal(p.mergeOrRootRelease,false);
const lines=fs.readFileSync(path.join(root,'wm-manifest.tsv'),'utf8').trimEnd().split('\n');
assert.equal(lines.shift(),'path\tbytes\tsha256');
const rows=lines.map(line=>{const [name,size,digest]=line.split('\t');return{path:name,bytes:Number(size),sha256:digest};});
assert.equal(new Set(rows.map(r=>r.path)).size,rows.length,'unique manifest paths');
const files=[];
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);assert.equal(entry.isSymbolicLink(),false,'no payload symlinks');if(entry.isDirectory())scan(file);else{assert.ok(entry.isFile());files.push(path.relative(root,file).replaceAll('\\','/'));}}}
scan(root);assert.deepEqual(files.sort(),[...rows.map(r=>r.path),'wm-manifest.tsv'].sort(),'complete payload inventory');
for(const r of rows){
 const file=path.resolve(root,r.path);assert.ok(file.startsWith(root+path.sep),'manifest stays inside payload');assert.ok(!r.path.endsWith('.map'));
 const b=fs.readFileSync(file);assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);
}
const runtime=rows.filter(r=>r.path!=='wm-provenance.json').sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
assert.equal(runtime.length,p.runtimeFiles);assert.equal(runtime.reduce((sum,r)=>sum+r.bytes,0),p.rawBytes);
const digest=hash(Buffer.from(runtime.map(r=>`${r.path}\0${r.sha256}\0${r.bytes}\n`).join('')));
assert.equal(digest,p.payloadSha256,'manifest agrees with declared runtime payload digest');
const result={status:'PASS',source,tree,provenance:p,files:files.length,runtimeFiles:runtime.length,payloadSha256:digest,manifestSha256:hash(fs.readFileSync(path.join(root,'wm-manifest.tsv'))),classification:'Read-only payload byte proof; publication still requires exact-source SELF_REVIEW_PASS and fresh protected refs'};
fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
