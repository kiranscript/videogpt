import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.UI_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH },
    trace: "retain-on-failure",
  },
});
