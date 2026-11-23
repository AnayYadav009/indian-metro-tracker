import { defineConfig, devices } from "@playwright/test";

const useStaticExport = process.env.PLAYWRIGHT_STATIC_EXPORT === "true";
const port = process.env.PORT || (useStaticExport ? "3005" : "3000");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: "html",
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: useStaticExport ? "node scripts/serve.mjs" : "npm run dev",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI && !useStaticExport,
    env: {
      PORT: String(port),
    },
  },
});

