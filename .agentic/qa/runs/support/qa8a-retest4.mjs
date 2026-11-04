// Revise 8.a (2026-11-04): ретест BUG-010 і BUG-011 на коміті етапу 7 8c68680. Передумова: `pnpm build` і preview :4173.
// Запуск з кореня: node .agentic/qa/runs/support/qa8a-retest4.mjs. Вивід — JSON і рядки OK / FAIL; код 1 при розбіжності.
import { chromium, firefox, webkit } from "@playwright/test";
import { topMarkets } from "../../../../e2e/support/coingecko.js";

const BASE = "http://localhost:4173/crypto-radar/";
const TOP =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d";
const SAFARI_TEXT =
  "Safari стирає дані сайту, якщо 7 днів ви нічого на ньому не натискали. Додайте Крипто-Радар на головний екран: Поділитися → «На початковий екран». Обрані, додані тут у Safari, на головний екран не переносяться — додайте їх там заново.";
const CORS = { "access-control-allow-origin": "*" };
// Свіжі дані: last_updated фікстури E2E (2026-11-02) замінено на «хвилину тому», інакше застосунок показує E-STALE.
const fresh = () => topMarkets().map((c) => ({ ...c, last_updated: new Date(Date.now() - 60_000).toISOString() }));
const out = {};
const checks = [];

for (const [name, bt] of Object.entries({ chromium, webkit, firefox })) {
  const b = await bt.launch();
  // BUG-010: перший запит топ-50 — 503, далі 200; без preload повтори й ручні fetch мають іти в мережу.
  const c = await b.newContext();
  const p = await c.newPage();
  let hits = 0;
  await p.route("https://api.coingecko.com/**", async (r) => {
    if (new URL(r.request().url()).searchParams.get("category")) return r.fulfill({ json: [], headers: CORS });
    hits += 1;
    if (hits === 1) return r.fulfill({ status: 503, json: {}, headers: CORS });
    return r.fulfill({ json: fresh(), headers: CORS });
  });
  await p.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  await p.goto(BASE + "#/");
  // Перший 503 і повтор через 2 с → список (P-4: 5xx — до 2 повторів).
  await p.locator("main a[data-coin-id]").first().waitFor({ timeout: 15_000 });
  const afterRetry = hits;
  const statuses = await p.evaluate(async (u) => {
    const a = await fetch(u);
    const b2 = await fetch(u);
    return [a.status, b2.status];
  }, TOP);
  const preload = await p.evaluate(() => document.querySelectorAll('link[rel="preload"]').length);
  out[name] = { preload, hitsUntilList: afterRetry, manualFetchStatuses: statuses, hitsAfterManual: hits };
  checks.push([`${name} BUG-010: preload 0`, preload === 0]);
  checks.push([`${name} BUG-010: 503 → повтор → список (2 запити)`, afterRetry === 2]);
  checks.push([`${name} BUG-010: ручні fetch — 200, 200 і 2 нові запити`, statuses.join() === "200,200" && hits === afterRetry + 2]);
  await c.close();

  // BUG-011: порада Safari на «Обраних» — дослівно UX §5.2 у WebKit, у інших рушіях поради немає.
  const c2 = await b.newContext();
  await c2.route("https://api.coingecko.com/**", (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.get("category") ? [] : fresh(), headers: CORS }),
  );
  await c2.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  await c2.addInitScript(() => localStorage.setItem("crypto-radar:favorites", JSON.stringify(["bitcoin"])));
  const p2 = await c2.newPage();
  await p2.goto(BASE + "#/favorites");
  await p2.getByRole("heading", { level: 1, name: "Обрані" }).waitFor();
  await p2.waitForTimeout(500);
  const hint = await p2.evaluate(() => {
    const h = [...document.querySelectorAll("main h2")].find((e) => e.textContent.includes("Safari"));
    return h ? { title: h.textContent, text: h.closest("section")?.querySelector("p")?.textContent ?? null } : null;
  });
  out[name].safariHint = hint;
  if (name === "webkit") {
    checks.push(["webkit BUG-011: заголовок поради", hint?.title === "Щоб обрані не зникли в Safari"]);
    checks.push(["webkit BUG-011: текст дослівно UX §5.2", hint?.text === SAFARI_TEXT]);
  } else {
    checks.push([`${name}: поради Safari немає`, hint === null]);
  }
  await c2.close();
  await b.close();
}

console.log(JSON.stringify(out, null, 1));
for (const [n, ok] of checks) console.log(`${ok ? "OK  " : "FAIL"} ${n}`);
const failed = checks.filter(([, ok]) => !ok).length;
console.log(`CHECKS ${checks.length - failed}/${checks.length}`);
process.exit(failed ? 1 : 0);
