import { defineConfig, devices } from "@playwright/test";
process.env.WM_EVIDENCE_ROOT = "evidence/wm-004/regression";
process.env.WM_BROWSER_CHANNEL = "chromium";
export default defineConfig({
  testDir:"./e2e",
  // Superseded plated-hero review is replaced by WM004 captures. The old absolute
  // software-CI FPS assertion is retained historically; paired FPS and fresh HUD layout are separate WM004 gates.
  grepInvert:/WM003 original eyes palette body lattice|keeps the rendered HUD and menus usable at 1920x1080 and representative iPad landscape/,testMatch:["wm004.spec.ts","wm004-hero.spec.ts","wm003.spec.ts","wm003-remediation.spec.ts","wm002.spec.ts","wm001.spec.ts"],
  outputDir:`test-results-wm004/${process.env.WM004_SUITE??"local"}`,timeout:120000,expect:{timeout:15000},workers:1,fullyParallel:false,retries:0,forbidOnly:true,
  reporter:[["list"],["json",{outputFile:`evidence/wm-004/${process.env.WM004_SUITE??"local"}-browser-results.json`}]],
  use:{baseURL:"http://127.0.0.1:4173",trace:"off",video:"off",screenshot:"only-on-failure"},
  webServer:{command:"node scripts/wm004-devserver.mjs",url:"http://127.0.0.1:4173",timeout:120000,reuseExistingServer:false},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"],viewport:{width:1280,height:720},launchOptions:{channel:"chromium"}}}],
});
