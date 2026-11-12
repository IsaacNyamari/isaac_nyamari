import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://isaac:isaac_local_dev@localhost:5544/isaac_e2e";

/** Runs against the production build (`npm run build` first) with an isolated database. */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      SITE_URL: BASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      LOCAL_STORAGE_DIR: "./.data/e2e-uploads",
      EMAIL_DRIVER: "console",
      INTERNAL_SCHEDULER: "false",
      PORT: String(PORT),
    },
  },
});
