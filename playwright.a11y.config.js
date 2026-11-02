// debt_commands.accessibility (NFR-6): axe-core на зібраному застосунку через `vite preview`.
// Етап 8.b поширює перевірку на всі екрани у власному наборі e2e/.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "a11y",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}/crypto-radar/`,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/crypto-radar/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
