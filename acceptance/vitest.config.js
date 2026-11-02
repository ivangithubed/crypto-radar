import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Оракул етапу 6: приймальні тести за Gherkin-сценаріями US-1 – US-9 (теги @AC-N.M).
// Змінюються лише через «Revise» етапу 6 (розділ 12 контракту sdd-delivery).
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js", "./acceptance/support/setup.js"],
    include: ["acceptance/**/*.acceptance.test.{js,jsx}"],
    testTimeout: 15000,
  },
});
