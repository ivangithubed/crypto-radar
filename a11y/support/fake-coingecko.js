// TD-002: підміна CoinGecko записаним прикладом для axe і Lighthouse (план етапу 6, розділ 12.1).
// Жодного запиту до справжнього API: виміри стабільні, ліміт джерела (NFR-3) не витрачається.
import { readFileSync } from "node:fs";

const FIXTURES = new URL("../../src/test/fixtures/", import.meta.url);
const MARKETS = JSON.parse(readFileSync(new URL("markets-top50.json", FIXTURES), "utf8"));
const STABLECOINS = JSON.parse(readFileSync(new URL("stablecoins.json", FIXTURES), "utf8"));

// Прозорий PNG 1×1 замість логотипів coin-images.coingecko.com.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** Записаний топ-50 зі свіжим `last_updated` (давність 60 с, NFR-1). */
function freshMarkets() {
  const updated = new Date(Date.now() - 60_000).toISOString();
  return MARKETS.map((coin) => ({ ...coin, last_updated: updated }));
}

// Без стиснення: Chrome не розпаковує тіло, віддане через route.fulfill, тож передача більша, ніж у CoinGecko (gzip).
// Вимір Lighthouse від цього лише песимістичніший.
function jsonResponse(data) {
  return { json: data, headers: { "access-control-allow-origin": "*" } };
}

/**
 * Підміняє CoinGecko в контексті Playwright.
 * @param {import('@playwright/test').BrowserContext | import('@playwright/test').Page} target
 * @param {{mode?: 'ok' | 'error' | 'pending'}} [options] error — 429 для топ-50; pending — відповіді немає
 */
export async function routeCoinGecko(target, { mode = "ok" } = {}) {
  await target.route("https://api.coingecko.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("category") === "stablecoins") {
      await route.fulfill(jsonResponse(STABLECOINS));
    } else if (mode === "error") {
      await route.fulfill({ status: 429, ...jsonResponse({}) });
    } else if (mode === "ok") {
      await route.fulfill(jsonResponse(freshMarkets()));
    }
    // pending: запит лишається без відповіді (стан Loading).
  });
  await target.route("https://coin-images.coingecko.com/**", (route) =>
    route.fulfill({ body: PIXEL, contentType: "image/png" }),
  );
}
