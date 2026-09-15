import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"./e2e",testMatch:["wm004.spec.ts","wm003.spec.ts","wm003-remediation.spec.ts","wm002.spec.ts","wm001.spec.ts"],
  outputDir:"test-results-wm004",timeout:120000,expect:{timeout:15000},workers:1,fullyParallel:false,retries:0,forbidOnly:true,
  reporter:[["list"],["json",{outputFile:"evidence/wm-004/browser-results.json"}]],
  use:{baseURL:"http://127.0.0.1:4173",trace:"retain-on-failure",video:"on",screenshot:"only-on-failure"},
  webServer:{command:"pnpm dev --host 127.0.0.1 --port 4173",url:"http://127.0.0.1:4173",timeout:120000,reuseExistingServer:false},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"],viewport:{width:1280,height:720},launchOptions:{channel:"chromium"}}}],
});
