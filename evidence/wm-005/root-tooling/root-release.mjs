// Release-only packaging and verification. Never modifies accepted tracked source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'vite';
const source='aec0b3e970368c0b70cdde5c18e0dab301c93383', tree='2d815a1d42d6e9da3d08175b286aa685acb06e72';
const prior='32ef25495acec4a12a33c4375d74d9ae4018125b';
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report='evidence/wm-005/root-release';fs.mkdirSync(report,{recursive:true});
const mode=process.argv[2];
assert.equal(git('.','rev-parse','HEAD'),source);assert.equal(git('.','rev-parse','HEAD^{tree}'),tree);
function files(root){const out=[];for(const e of fs.readdirSync(root,{withFileTypes:true})){if(e.name==='.git'||e.name==='.vite')continue;const p=path.join(root,e.name);if(e.isDirectory())out.push(...files(p));else out.push(p);}return out;}
function adapt(publicMode){
 let s=fs.readFileSync('scripts/wm005-compiled.mjs','utf8');
 const replacements=[
 ["const base='/Webmaster/wm005-preview/',url='http://127.0.0.1:4177'+base+'?test=1&diagnostics=1',prefix='webmaster.wm005-preview.v1:';",`const base='/Webmaster/',url='${publicMode?'https://timcgha.github.io':'http://127.0.0.1:4177'}'+base+'?test=1',prefix='';`],
 ["reportDir='evidence/wm-005/compiled'",`reportDir='${report}/${publicMode?'public-saves':'prepared-saves'}'`],
 ["...old[1].stored,'webmaster.wm003-preview.v1:sentinel'","'webmaster.wm005-preview.v1:sentinel':'keep S5 preview','webmaster.wm003-preview.v1:sentinel'"],
 ["assert.match(await page.locator('#wm-preview').innerText(),/WM-005 preview/);","assert.equal(await page.locator('#wm-preview').count(),0);"],
 ["filter(([k])=>!k.startsWith(prefix))","filter(([k])=>/^webmaster\\.wm00[345]-preview\\.v1:/.test(k))"],
 ["Compiled isolated preview; genuine menu actions",`${publicMode?'Public':'Prepared'} normal root; genuine menu actions`]
 ];
 for(const[a,b]of replacements){assert.equal(s.split(a).length,2,'Adapter exact occurrence: '+a);s=s.replace(a,b);}
 const target=`scripts/wm005-root-${publicMode?'public':'prepared'}-saves.mjs`;fs.writeFileSync(target,s);
 fs.writeFileSync(`${report}/adapter-${publicMode?'public':'prepared'}.json`,JSON.stringify({input:hash(fs.readFileSync('scripts/wm005-compiled.mjs')),output:hash(Buffer.from(s)),replacements},null,2));
}
if(mode==='prepare'){
 await build({base:'/Webmaster/',build:{outDir:'.wm005-payload',emptyOutDir:true,manifest:true}});
 const out='.wm005-payload';fs.writeFileSync(out+'/.nojekyll','');
 const html=fs.readFileSync(out+'/index.html','utf8');assert.ok(html.includes('/Webmaster/assets/'));assert.ok(!html.includes('preview'));
 const rows=files(out).map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:hash(fs.readFileSync(p))})).sort((a,b)=>a.path.localeCompare(b.path));
 const provenance={change:'WM-005',kind:'sponsor accepted normal-root release',source,tree,base:'/Webmaster/',priorPages:prior,saveNamespace:'existing native root storage; preview namespaces unchanged',payloadSha256:hash(Buffer.from(rows.map(r=>`${r.path}\0${r.sha256}\0${r.bytes}\n`).join(''))),runtimeFiles:rows.length};
 fs.writeFileSync(out+'/wm-provenance.json',JSON.stringify(provenance,null,2)+'\n');fs.writeFileSync(out+'/wm-manifest.tsv','path\tbytes\tsha256\n'+rows.map(r=>`${r.path}\t${r.bytes}\t${r.sha256}`).join('\n')+'\n');
 fs.writeFileSync(report+'/prepared.json',JSON.stringify({provenance,rows},null,2));adapt(false);
}else if(mode==='stage'){
 assert.equal(git('../site','rev-parse','HEAD'),prior);
 const tracked=git('../site','ls-files').split('\n');const preserved=tracked.filter(p=>/^wm00[345]-preview\//.test(p));assert.ok(preserved.length>200);
 const before=preserved.map(p=>({path:p,sha256:hash(fs.readFileSync('../site/'+p))}));
 // Remove only enumerated previous root publication files, retained in parent commit.
 for(const p of tracked.filter(p=>!preserved.includes(p)))fs.unlinkSync('../site/'+p);
 for(const p of files('.wm005-payload')){const target=path.join('../site',path.relative('.wm005-payload',p));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(p,target);}
 for(const row of before)assert.equal(hash(fs.readFileSync('../site/'+row.path)),row.sha256);
 git('../site','add','-A');const stagedTree=git('../site','write-tree');
 fs.writeFileSync(report+'/staged.json',JSON.stringify({source,tree,prior,stagedTree,preserved:before},null,2));console.log(JSON.stringify({stagedTree,preserved:before.length}));
}else if(mode==='public'){
 const rows=[];for(const p of git('../site','ls-files').split('\n')){const expected=hash(fs.readFileSync('../site/'+p));const url='https://timcgha.github.io/Webmaster/'+p;let actual,status;for(let n=0;n<8;n++){const r=await fetch(url,{headers:{'Cache-Control':'no-cache'}});status=r.status;actual=hash(Buffer.from(await r.arrayBuffer()));if(status===200&&actual===expected)break;await new Promise(r=>setTimeout(r,5000));}rows.push({path:p,status,expected,actual});}
 const failures=rows.filter(r=>r.status!==200||r.actual!==r.expected);fs.writeFileSync(report+'/public-bytes.json',JSON.stringify({pages:git('../site','rev-parse','HEAD'),tree:git('../site','rev-parse','HEAD^{tree}'),rows,failures},null,2));assert.equal(failures.length,0);adapt(true);
}else throw Error('Unknown mode');
