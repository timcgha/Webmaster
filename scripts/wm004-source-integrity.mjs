import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const files=[];
for(const row of execFileSync('git',['ls-tree','-r','-z','HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean)) {
  const tab=row.indexOf('\t'), sha=row.slice(0,tab).split(' ')[2], path=row.slice(tab+1);
  const bytes=fs.readFileSync(path),blob=crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  assert.equal(blob,sha,path);files.push({path,blob,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
fs.mkdirSync('evidence/wm-004',{recursive:true});const report={source:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),baseline:'3962446ca00c6e1db6bd8b250335b24619a0aeab',checked:files.length,status:'PASS',files};fs.writeFileSync('evidence/wm-004/source-integrity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,files:undefined}));
