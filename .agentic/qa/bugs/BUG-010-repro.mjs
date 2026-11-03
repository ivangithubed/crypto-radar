// BUG-010: відтворення. Передумова: `pnpm build && pnpm preview --port 4174` у корені репозиторію.
// Запуск з кореня: node .agentic/qa/bugs/BUG-010-repro.mjs. Пауза 1,5 с — лише дати застосунку спожити preload; це сценарій відтворення, не тест набору.
import { chromium, firefox, webkit } from "@playwright/test";
import { topMarkets } from "../../../e2e/support/coingecko.js";
const TOP = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d";
const out = {};
for (const [name, bt] of Object.entries({ chromium, webkit, firefox })) {
  const b = await bt.launch();
  const p = await b.newPage();
  let hits = 0;
  await p.route("https://api.coingecko.com/**", async (r) => {
    const u = new URL(r.request().url());
    if (u.searchParams.get("category")) return r.fulfill({ json: [], headers: { "access-control-allow-origin": "*" } });
    hits += 1;
    if (hits === 1) return r.fulfill({ status: 503, json: {}, headers: { "access-control-allow-origin": "*" } });
    return r.fulfill({ json: topMarkets(), headers: { "access-control-allow-origin": "*" } });
  });
  await p.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  await p.goto("http://localhost:4174/crypto-radar/#/");
  await p.waitForTimeout(1500);
  const before = hits;
  const statuses = await p.evaluate(async (u) => {
    const a = await fetch(u); const b2 = await fetch(u);
    return [a.status, b2.status];
  }, TOP);
  out[name] = { routeHitsAfterLoad: before, manualFetchStatuses: statuses, routeHitsAfterManual: hits };
  await b.close();
}
console.log(JSON.stringify(out, null, 1));
