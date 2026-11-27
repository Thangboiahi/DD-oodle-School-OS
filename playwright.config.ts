import { defineConfig, devices } from "@playwright/test";

const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "true";
const port = Number(process.env.E2E_PORT ?? "3000");
const defaultBaseUrl = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? defaultBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: `pnpm exec next start -H 127.0.0.1 -p ${port}`,
        url: `${defaultBaseUrl}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
