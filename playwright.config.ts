import { defineConfig, devices } from "@playwright/test";

// Needs the local stack: `npm run db:start` (fresh `npm run db:reset` recommended) and seeded admins.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000/id", reuseExistingServer: true, timeout: 120_000 },
});
