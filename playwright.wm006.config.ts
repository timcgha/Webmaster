import { defineConfig, devices } from "@playwright/test";
process.env.WM_EVIDENCE_ROOT = "evidence/wm-006/regression";
process.env.WM_BROWSER_CHANNEL = "chromium";
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "wm006*.spec.ts",
    "wm005-climb.spec.ts",
    "wm001.spec.ts",
    "wm003.spec.ts",
    "wm003-remediation.spec.ts",
    "wm002.spec.ts",
  ],
  grepInvert:
    /WM003 original eyes palette body lattice|keeps the rendered HUD and menus usable at 1920x1080 and representative iPad landscape/,
  outputDir: `test-results-wm006/${process.env.WM006_SUITE ?? "development"}`,
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `evidence/wm-006/${process.env.WM006_SUITE ?? "development"}-browser-results.json`,
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/wm005-devserver.mjs",
    url: "http://127.0.0.1:4173",
    timeout: 120000,
    reuseExistingServer: !!process.env.WM_LOCAL,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        launchOptions: { channel: "chromium" },
      },
    },
  ],
});
