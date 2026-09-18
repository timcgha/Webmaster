import fs from 'node:fs';
import assert from 'node:assert/strict';
// Reuse the exact-source complete input journeys against the actual public URL.
// Generate untracked harness copies; never patch the tracked product or helpers.
const url='https://timcgha.github.io/Webmaster/wm006-preview/?test=1&diagnostics=1';
let legacy=fs.readFileSync('e2e/routes/wm003-route.ts','utf8');
assert.equal(legacy.split('p.goto("/?test=1")').length-1,2);
legacy=legacy.replaceAll('p.goto("/?test=1")',`p.goto(${JSON.stringify(url)})`);
fs.writeFileSync('e2e/routes/wm006-public-legacy-route.ts',legacy);
const route=fs.readFileSync('e2e/routes/wm006-route.ts','utf8');
assert.ok(route.includes('from "./wm003-route"'));
fs.writeFileSync('e2e/routes/wm006-public-route.ts',route.replace('from "./wm003-route"','from "./wm006-public-legacy-route"'));
const suite=fs.readFileSync('e2e/wm006.spec.ts','utf8');
assert.ok(suite.includes('const out = "evidence/wm-006/rendered"'));
fs.writeFileSync('e2e/wm006-public.spec.ts',suite.replace('"./routes/wm006-route"','"./routes/wm006-public-route"').replace('"./routes/wm003-route"','"./routes/wm006-public-legacy-route"').replace('"evidence/wm-006/rendered"','"evidence/wm-006/public/rendered"'));
fs.writeFileSync('playwright.wm006-public.config.ts',`import {defineConfig,devices} from '@playwright/test';
process.env.WM_EVIDENCE_ROOT='evidence/wm-006/public/regression';
export default defineConfig({testDir:'./e2e',testMatch:'wm006-public.spec.ts',workers:1,retries:0,forbidOnly:true,timeout:300000,expect:{timeout:15000},outputDir:'test-results-wm006/public',reporter:[['list'],['json',{outputFile:'evidence/wm-006/public/browser-results.json'}]],use:{...devices['Desktop Chrome'],viewport:{width:1280,height:720},launchOptions:{channel:'chromium'},screenshot:'only-on-failure',trace:'off',video:'off'}});
`);
fs.mkdirSync('evidence/wm-006/public',{recursive:true});
fs.writeFileSync('evidence/wm-006/public/journey-method.json',JSON.stringify({source:process.env.WM_SOURCE,tree:process.env.WM_TREE,url,method:'Exact-source WM006 complete keyboard and semantic-controller journeys reused unchanged, except generated helper entry URL and evidence paths. Real public HTTP and ordinary inputs; no local server or product/state/time patches. Save/quit/continue combat checkpoint, retries and traversal return retained. No retries.',trackedSourceModified:false},null,2));
