// Етап 8.b: наскрізні приймальні сценарії US-1 – US-10 у Chromium, WebKit і Firefox (NFR-14).
// Збірка й `vite preview` на окремому порту, щоб не заважати a11y (4173) і dev-серверу (5173).
import { defineConfig, devices } from "@playwright/test";

const PORT = 4174;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.spec.js",
  fullyParallel: true,
  forbidOnly: CI,
  // Ретраї лише в CI: локально нестабільний тест має падати одразу (і ставати BUG).
  retries: CI ? 2 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "../test-results/e2e",
  use: {
    baseURL: `http://localhost:${PORT}/crypto-radar/`,
    trace: "on-first-retry",
    locale: "uk-UA",
    timezoneId: "Europe/Kyiv",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/crypto-radar/`,
    // Локально можна підняти `pnpm preview --port 4174` один раз для кількох запусків; у CI сервер завжди свій.
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
