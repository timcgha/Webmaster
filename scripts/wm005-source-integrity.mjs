import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const files=[],discrepancies=[];
for(const row of execFileSync('git',['ls-tree','-r','-z','HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean)) {
  const tab=row.indexOf('\t'), sha=row.slice(0,tab).split(' ')[2], path=row.slice(tab+1);
  if(!fs.existsSync(path)){discrepancies.push({path,expected:sha,actual:'MISSING'});continue;}
  const bytes=fs.readFileSync(path),blob=crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if(blob!==sha)discrepancies.push({path,expected:sha,actual:blob});
  files.push({path,blob,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
fs.mkdirSync('evidence/wm-005',{recursive:true});
const report={source:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),baseline:'a63ad0e05ce12d2b42ff22e97d39de4af51d4b08',checked:files.length,status:discrepancies.length?'FAIL':'PASS',discrepancies,files};
fs.writeFileSync('evidence/wm-005/source-integrity.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,files:undefined}));
assert.equal(discrepancies.length,0,'Tracked bytes changed; the complete discrepancy report has been retained');
