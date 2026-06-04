import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env file
dotenv.config();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],

  globalSetup: './tests/global-setup.ts', // faz login uma vez, salva sessão

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    // Projetos de setup (login por role)
    { name: 'setup:admin',      testMatch: /global-setup\.ts/, use: { storageState: 'tests/.auth/admin.json' } },
    { name: 'setup:agency',     testMatch: /global-setup\.ts/, use: { storageState: 'tests/.auth/agency.json' } },
    { name: 'setup:post_sales', testMatch: /global-setup\.ts/, use: { storageState: 'tests/.auth/post_sales.json' } },

    // Suite principal
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup:admin', 'setup:agency', 'setup:post_sales'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '5173'
    }
  },
});
