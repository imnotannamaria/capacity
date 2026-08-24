import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  // Every spec's beforeEach reseeds the same live Postgres database (no
  // per-worker isolation) — two workers reseeding at once is a genuine
  // race, not a flaky test. One worker keeps every spec file serialized.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Tall enough to fit a full day column (1440px + the header)
        // with no scrolling — has to come after the devices spread
        // above, which brings its own 720px-tall viewport that would
        // otherwise win. Without this, dragging a job scheduled late in
        // the day silently no-ops: page.mouse targets a point below the
        // fold, which boundingBox() measures correctly but nothing can
        // actually click, so dnd-kit never sees a pointerdown at all.
        viewport: { width: 1280, height: 1600 },
      },
    },
  ],
  webServer: [
    {
      command: "uv run flask --app app run --port 5001",
      cwd: "../api",
      url: "http://localhost:5001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
