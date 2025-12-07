import { defineConfig, devices } from "@playwright/test";
import { spawnSync } from "node:child_process";

const PORT = process.env.PLAYWRIGHT_PORT || "4173";
const HOST = process.env.PLAYWRIGHT_HOST || "127.0.0.1";
const baseURL = `http://${HOST}:${PORT}`;

const probe = spawnSync(
  process.execPath,
  [
    "-e",
    "require('http').createServer().listen(0,'127.0.0.1',()=>process.exit(0)).on('error',()=>process.exit(1));",
  ],
  { stdio: "ignore" }
);
const canBindPort = probe.status === 0;

export default defineConfig({
  testDir: "./__tests__/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60 * 1000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: (() => {
    const projects = [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
    ];

    if (process.env.PLAYWRIGHT_ALL_BROWSERS === "1") {
      projects.push(
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
        }
      );
    }

    return projects;
  })(),
  testIgnore: canBindPort ? [] : ["**/*"],
  webServer:
    process.env.PLAYWRIGHT_USE_EXISTING_SERVER === "1" || !canBindPort
      ? undefined
      : {
          command: `bun run dev -- --host ${HOST} --port ${PORT}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
});
