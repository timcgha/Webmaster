// Verification-only adapter. Copy the frozen compiled save test and change only
// its served origin, report folder and evidence label. Never modify game source.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const input=fs.readFileSync('scripts/wm005-compiled.mjs','utf8');
const replacements=[
 ["url='http://127.0.0.1:4177'+base", "url='https://timcgha.github.io'+base"],
 ["reportDir='evidence/wm-005/compiled'", "reportDir='evidence/wm-005/public/saves'"],
 ["method:'Compiled isolated preview;", "method:'Public isolated preview;"],
];
let output=input;for(const[a,b]of replacements){assert.equal(output.split(a).length,2,'adapter target occurs once');output=output.replace(a,b);}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
fs.mkdirSync('evidence/wm-005/public',{recursive:true});
fs.writeFileSync('evidence/wm-005/public/save-test-adapter.json',JSON.stringify({classification:'Verification-only origin adapter of exact frozen compiled test; game source unchanged',inputSha256:hash(input),outputSha256:hash(output),replacements},null,2));
fs.writeFileSync('scripts/wm005-public-saves.mjs',output);
