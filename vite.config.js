import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// NFR-8: CSP для статичного хостингу (GitHub Pages не дає заголовків, тому <meta>).
// Лише у збірці: dev-сервер Vite вставляє inline-скрипти, які ця політика заблокувала б.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https://coin-images.coingecko.com data:",
  "connect-src https://api.coingecko.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function contentSecurityPolicy() {
  return {
    name: "crypto-radar:csp",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // ADR 0003: GitHub Pages публікує сайт за шляхом /crypto-radar/.
  base: "/crypto-radar/",
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  build: {
    // Шрифти завжди окремими файлами: data:-URI для дрібних підмножин @fontsource блокує CSP
    // (font-src не задано → default-src 'self'), решта асетів — типове правило Vite (≤ 4 КБ inline).
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
