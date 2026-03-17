import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * Launches both FastAPI (:8000) and Next.js (:3000) before running tests.
 * Use `npx playwright test` from the frontend/ directory.
 *
 * If both servers are already running, set REUSE_SERVERS=1 to skip launch:
 *   REUSE_SERVERS=1 npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,       // sequential — single backend, avoid race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'dot' : 'list',
  timeout: 90_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: [
    {
      // FastAPI backend
      command: 'cd .. && uv run python run_api.py',
      url: 'http://localhost:8000/api/health',
      timeout: 30_000,
      reuseExistingServer: !!process.env.REUSE_SERVERS || !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // Next.js frontend
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 30_000,
      reuseExistingServer: !!process.env.REUSE_SERVERS || !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
