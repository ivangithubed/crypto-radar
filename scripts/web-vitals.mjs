// debt_commands.web_vitals (NFR-4): Lighthouse, мобільний профіль за замовчуванням
// (емуляція повільного 4G і CPU ×4) на зібраному застосунку через `vite preview`.
// Поріг — медіана з 3 прогонів: LCP ≤ 2500 мс, CLS ≤ 0,1, TBT ≤ 200 мс. Перевищення → код 1.
// Запускати після `pnpm build` (скрипт `pnpm vitals` робить обидва кроки).
// TD-002: CoinGecko підмінено записаним прикладом — Playwright під'єднується до того самого Chrome через CDP
// і ставить маршрути на типовий контекст, тож вкладка Lighthouse отримує фікстуру; у бандл продукту нічого не додано.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { routeCoinGecko } from "../a11y/support/fake-coingecko.js";

const PORT = 4174;
const URL = `http://localhost:${PORT}/crypto-radar/`;
const RUNS = 3;
const REPORT_DIR = ".lighthouse";
const BUDGETS = [
  { id: "largest-contentful-paint", label: "LCP", max: 2500, unit: "мс" },
  { id: "cumulative-layout-shift", label: "CLS", max: 0.1, unit: "" },
  { id: "total-blocking-time", label: "TBT", max: 200, unit: "мс" },
];

function startPreview() {
  // detached на Linux/macOS — власна група процесів, щоб зупинити і pnpm, і vite.
  return spawn(`pnpm preview --port ${PORT} --strictPort`, {
    shell: true,
    stdio: "ignore",
    detached: process.platform !== "win32",
  });
}

// Синхронно, щоб сервер точно зупинився до process.exit.
function stopPreview(server) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    process.kill(-server.pid, "SIGTERM");
  }
}

// Чекаємо, доки preview відповість 200 (вивід Vite кольоровий, тож його не розбираємо).
async function waitForPreview(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(URL);
      if (response.ok) return;
    } catch {
      // сервер ще не слухає порт
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`vite preview не відповів на ${URL} за ${timeoutMs / 1000} с`);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const server = startPreview();
let chrome;
let driver;
let failed = false;
try {
  await waitForPreview();
  chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    // У CI (одноразовий раннер) пісочницю Chromium вимикаємо так само, як це робить Playwright.
    chromeFlags: ["--headless=new", ...(process.env.CI ? ["--no-sandbox"] : [])],
  });
  driver = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
  await routeCoinGecko(driver.contexts()[0]);

  const samples = Object.fromEntries(BUDGETS.map((budget) => [budget.id, []]));
  mkdirSync(REPORT_DIR, { recursive: true });
  for (let run = 1; run <= RUNS; run += 1) {
    const result = await lighthouse(URL, {
      port: chrome.port,
      output: "html",
      onlyCategories: ["performance"],
      logLevel: "error",
    });
    writeFileSync(`${REPORT_DIR}/run-${run}.html`, result.report);
    for (const budget of BUDGETS) {
      samples[budget.id].push(result.lhr.audits[budget.id].numericValue);
    }
  }

  for (const budget of BUDGETS) {
    const value = median(samples[budget.id]);
    const ok = value <= budget.max;
    failed ||= !ok;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${budget.label}: медіана ${value.toFixed(3)} ${budget.unit} (поріг ≤ ${budget.max} ${budget.unit}; прогони: ${samples[budget.id].map((v) => v.toFixed(3)).join(", ")})`,
    );
  }
} finally {
  await driver?.close();
  await chrome?.kill();
  stopPreview(server);
}

if (failed) {
  console.error("NFR-4: поріг Web Vitals перевищено");
  process.exit(1);
}
