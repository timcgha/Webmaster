import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const c2='a5ef60b893b746f1b1792cbec270872783ffa128',c1='8a221c08642ebdd1264a04ebfaf6093d838cf60e';
const allowed=['src/game/hero.ts','src/game/world.ts','e2e/wm001.spec.ts','e2e/wm003.spec.ts','e2e/wm005-climb.spec.ts','tests/wm005-shadow-review.test.ts','scripts/wm005-reuse.mjs','.github/workflows/wm005-verification.yml'];
const changed=git('diff','--name-only',c2,'HEAD').split('\n');
assert(changed.every(p=>allowed.includes(p)),'Reuse invalidated by additional source changes');
assert.equal(git('rev-parse',`${c2}:src/core`),git('rev-parse','HEAD:src/core'),'C2 gameplay and persistence source must match exactly');
assert.equal(git('show',`${c2}:src/game/world.ts`),git('show','HEAD:src/game/world.ts').split('\n').filter(l=>!l.includes('jointTriangles:')&&!l.includes('jointCount:')).join('\n'),'Only read-only triangle observations may change in world');
const stripJoint=s=>s.replace(/  function joint\([\s\S]*?\n  }\n/,'');
assert.equal(stripJoint(git('show',`${c2}:src/game/hero.ts`)),stripJoint(git('show','HEAD:src/game/hero.ts')),'Only the small joint render mesh may change');
const c1CoreDiff=git('diff','--name-only',c1,c2,'--','src/core').split('\n');
assert.deepEqual(c1CoreDiff,['src/core/presentation.ts']);
const roots={c2:path.resolve('../prior-c2/evidence/wm-005/'+c2+'/35065467172/evidence/wm-005'),c1:path.resolve('../prior-c1/evidence/wm-005/'+c1+'/35062375370/evidence/wm-005')};
const hashes=[
 ['c2','source-integrity.json','200bc875c4444764c421fc56407097317456b0e6ad12aea6b5b6a47ad5fe3cc8'],
 ['c2','new-browser-results.json','cb91edfee218ad71701941dbf761879158d56d2925057356af688fc2cb9fa699'],
 ['c2','inherited-browser-results.json','f3d2e82e86c9dbb3d851082dacb4c6c163673f452d63b8c7633955dbab5dc911'],
 ['c2','compiled/results.json','61e822cbdaf79c36b8c43631eb9b88769c1a29ee4bc07b4241a285e5a1dd30b3'],
 ['c1','new-browser-results.json','71811020ced63349a3691033f5e58bd9edc62f557c68c87fccd06f3b292af563'],
];
const reports={};for(const[from,file,sha]of hashes){const bytes=fs.readFileSync(path.join(roots[from],file));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);reports[from+'/'+file]=JSON.parse(bytes);}
const integrity=reports['c2/source-integrity.json'];assert.equal(integrity.source,c2);assert.equal(integrity.tree,'c6df58481ac7a21546a510f25aad2a0720d2c534');assert.equal(integrity.status,'PASS');assert.equal(integrity.checked,462);assert.deepEqual(integrity.discrepancies,[]);
const specs=suites=>suites.flatMap(s=>[...(s.specs??[]),...specs(s.suites??[])]);
const old=reports['c2/inherited-browser-results.json'];assert.equal(old.stats.expected,37);assert.equal(old.stats.unexpected,3);assert.equal(old.stats.flaky,0);assert.equal(old.stats.skipped,0);
const failed=specs(old.suites).filter(s=>s.tests.some(t=>t.status!=='expected')).map(s=>s.title);
assert.deepEqual(failed,[
 'moves, jumps, orbits, recenters, collides, pauses safely, and completes the real practice route',
 'supports connection after load, disconnect cleanup, keyboard fallback, and deliberate replacement',
 'WM003 repeated replay pause save load clears transients and bounds resources',
]);
const first=reports['c1/new-browser-results.json'];assert.equal(first.stats.expected,16);assert.equal(first.stats.unexpected,0);assert.equal(first.stats.flaky,0);assert.equal(first.stats.skipped,0);
const priorNew=specs(first.suites).filter(s=>/two complete circuit laps|street safe save|momentum vertical orbit|held web survives/.test(s.title));assert.equal(priorNew.length,9);assert(priorNew.every(s=>s.tests.every(t=>t.status==='expected')));
const report={status:'BOUNDED_REUSE_PASS_FRESH_GATES_REQUIRED',role:'WEBMASTER_PRODUCT_OWNER',classification:'SELF_REVIEW; not independent QA',source:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),changed,
 sourceEvidence:{c2:{source:c2,run:35065467172,archive:'bff98139d8f08cf1f8587c5387beac9bffaabc89'},c1:{source:c1,run:35062375370,archive:'85396f7bc071c8873860fa9634d72e1dc9801c12'}},hashes,
 reusedInherited:specs(old.suites).filter(s=>s.tests.every(t=>t.status==='expected')).map(s=>s.title),reusedNewGameplay:priorNew.map(s=>s.title),
 impact:'C3 runtime difference is only the small joint sphere tessellation/shadow representation; world difference is read-only counts. C2 core/input/save/HUD/camera/collision code and all other runtime/build/dependency files are byte-identical. C1 nine functional ring/orbit/held-roof/save journeys use unchanged core logic; C2 presentation-only core difference is covered by fresh ceiling/hero cases. Reuse covers actual functional outcomes, not current appearance or performance. Historical source-integrity failure and failed browser cases are not reused as PASS.',
 requiredFresh:['all deterministic tests','TypeScript','isolated storage','production/Pages builds','audits','source integrity','7 hero/climb rendered cases','3 failed inherited cases','6 compiled save cases','48 paired performance samples','personal visual self-review']};
fs.mkdirSync('evidence/wm-005',{recursive:true});fs.writeFileSync('evidence/wm-005/reuse-proof.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,reusedInherited:37,reusedNewGameplay:9}));
