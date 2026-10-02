// Screenshot tests for /components/. Baselines live next to the spec and are
// per platform (Playwright adds -linux, -darwin …). Chromium only.
//   npm run test:visual            compare with the baselines
//   npm run test:visual -- -u      accept the current look as the new baseline
// PW_CHROMIUM=/path/to/chrome uses a browser that is already installed.

import { defineConfig, devices } from '@playwright/test';

const launchOptions = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};

export default defineConfig({
  testDir: 'tests/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}-{platform}{ext}',
  fullyParallel: true,
  reporter: [['list']],
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.05, animations: 'disabled', caret: 'hide' } },
  use: { baseURL: 'http://localhost:8124', launchOptions },
  webServer: { command: 'python3 -m http.server 8124', url: 'http://localhost:8124/', reuseExistingServer: true, stdout: 'ignore', stderr: 'ignore' },
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 }, colorScheme: 'light' } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 }, colorScheme: 'dark' } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, colorScheme: 'light' } },
  ],
});
