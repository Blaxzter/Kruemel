import { defineConfig, devices } from '@playwright/test'

// PORT lets parallel runs (other checkouts, agents) use their own preview server.
const PORT = Number(process.env.PORT ?? 4173)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    trace: 'on-first-retry',
    serviceWorkers: 'block',
  },
  // Phone frame of the design mockups (390x844) on a touch Chromium device profile.
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    // Serves dist/ as built: `pnpm test:e2e` builds first. A running server is only reused when
    // asked for (E2E_REUSE_SERVER=1), so a preview of some other build is never tested by accident.
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    timeout: 120_000,
  },
})
