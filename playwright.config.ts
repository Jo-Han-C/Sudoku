import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PORT}/Sudoku/`,
    trace: 'off',
  },
  // Testerna körs mot produktionsbygget (npm run build först), med service worker.
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/Sudoku/`,
    reuseExistingServer: !process.env.CI,
  },
});
