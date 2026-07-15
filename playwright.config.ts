import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e — smoke de la golden path (spec 0014 Fase C, post-migración).
 *
 * Arranca el front (Next dev en :5500) automáticamente y reusa el que ya esté
 * corriendo. El smoke de login NO necesita backend ni auth. El smoke de
 * /promotion sí: requiere el backend Express en :3000 + un token (ver e2e/README.md);
 * si no se proveen las envs E2E_TOKEN/E2E_PROMO_ID, ese test se salta (test.skip).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5500',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:5500',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
