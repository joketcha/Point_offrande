import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout (navigateur). Lancer : `npm run build && npm run test:e2e`.
 * Dans l'environnement Claude Code, le Chromium préinstallé est utilisé via
 * PLAYWRIGHT_BROWSERS_PATH ; sinon `npx playwright install chromium` une fois.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // PW_CHROMIUM permet d'utiliser un Chromium déjà présent (ex. environnement Claude Code) ;
    // sinon Playwright utilise le sien après `npx playwright install chromium`.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
