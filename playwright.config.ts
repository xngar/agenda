import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright corre contra el servidor de producción (`next start`), no
 * contra el dev server: lo que se prueba es el build real.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3111",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-CL",
    timezoneId: "America/Santiago",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
