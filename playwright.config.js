import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173/spray-net-portfolio/', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'tablet-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1180, height: 820 },
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'ipad-webkit',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'webkit',
        viewport: { width: 834, height: 1194 },
      },
    },
  ],
  webServer: {
    command: 'node scripts/serve-built.mjs',
    url: 'http://127.0.0.1:4173/spray-net-portfolio/',
    reuseExistingServer: !process.env.CI,
  },
});
