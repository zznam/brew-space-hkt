import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  use: {
    baseURL: 'http://127.0.0.1:8081',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
  },
  webServer: {
    command: 'npm run web -- --port 8081',
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
