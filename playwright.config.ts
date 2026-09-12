import { defineConfig, devices } from "@playwright/test";

const chromiumExecutable = process.env.WM_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  timeout: 45_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    video: "on",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : {},
      },
    },
    {
      name: "webkit-ipad-landscape",
      use: {
        ...devices["iPad Pro 11 landscape"],
        viewport: { width: 1194, height: 834 },
      },
    },
  ],
});
