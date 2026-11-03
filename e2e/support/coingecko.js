// Підміна CoinGecko для E2E: дані з «Передумов» Gherkin (02-requirements.md) і лічильник запитів (NFR-3).
// Жодного запиту до справжнього API: ліміт джерела не витрачається, результат відтворюваний.

/** Момент «зараз» для сценаріїв; годинник сторінки фіксує `openApp` (page.clock.setFixedTime). */
export const NOW = new Date("2026-11-02T12:32:00.000Z");

const SPARKLINE_POINTS = 168;

// Прозорий PNG 1×1 замість логотипів coin-images.coingecko.com.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const CORS = { "access-control-allow-origin": "*" };

function sparkline(first, last) {
  const step = (last - first) / (SPARKLINE_POINTS - 1);
  return Array.from({ length: SPARKLINE_POINTS }, (_, i) => first + step * i);
}

function genericCoin(rank) {
  const price = 100 - rank;
  return {
    id: `moneta-${rank}`,
    name: `Монета-${rank}`,
    symbol: `m${rank}`,
    price,
    change: 1 + rank / 100,
    cap: 2e12 / (rank * rank),
  };
}

// Монети з Gherkin-сценаріїв вимог; решта місць — «Монета-N».
const NAMED = {
  1: { id: "bitcoin", name: "Bitcoin", symbol: "btc", price: 67250.1, change: 4.2, cap: 1.32e12 },
  2: { id: "ethereum", name: "Ethereum", symbol: "eth", price: 3120, change: -6.1 },
  3: { id: "tether", name: "Tether", symbol: "usdt", price: 1, change: 0 },
  5: { id: "solana", name: "Solana", symbol: "sol", price: 150.4, change: 12.8 },
  7: { id: "usd-coin", name: "USD Coin", symbol: "usdc", price: 1, change: 0 },
  30: { id: "bitcoin-cash", name: "Bitcoin Cash", symbol: "bch", price: 2.5, change: 1.5 },
  48: { change: 25 },
};

/**
 * Сирий об'єкт /coins/markets для місця `rank`.
 * @param {number} rank
 * @param {object} [overrides] заміни полів моделі (id, name, symbol, price, change, cap, sparkline)
 * @param {number} [ageSeconds] давність `last_updated` відносно NOW
 */
export function marketCoin(rank, overrides = {}, ageSeconds = 60) {
  const coin = { ...genericCoin(rank), ...NAMED[rank], ...overrides };
  const line = coin.sparkline ?? sparkline(coin.price * 0.96, coin.price);
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: `https://coin-images.coingecko.com/coins/images/${rank}/large/${coin.id}.png`,
    current_price: coin.price,
    market_cap: coin.cap,
    market_cap_rank: rank,
    last_updated: new Date(NOW.getTime() - ageSeconds * 1000).toISOString(),
    sparkline_in_7d: { price: line },
    price_change_percentage_7d_in_currency: coin.change,
  };
}

/**
 * Відповідь топ-50: місця 1–50 і Монета-51 (продукт сам відкидає місця > 50, AC-1.4).
 * @param {{overrides?: Record<number, object>, ageSeconds?: number}} [options]
 */
export function topMarkets({ overrides = {}, ageSeconds = 60 } = {}) {
  return Array.from({ length: 51 }, (_, i) => marketCoin(i + 1, overrides[i + 1], ageSeconds));
}

const STABLECOINS = [
  { id: "tether", symbol: "usdt", name: "Tether" },
  { id: "usd-coin", symbol: "usdc", name: "USD Coin" },
];

/**
 * Поведінка запиту топ-50:
 * - "ok" — `markets`;
 * - "429", "503", "500" — статус із CORS-заголовком (браузер бачить код);
 * - "abort" — обрив з'єднання при `navigator.onLine === true`: так браузер бачить 429 CoinGecko без CORS (L-008);
 * - "pending" — відповіді немає (стан Loading).
 * @typedef {"ok" | "429" | "503" | "500" | "abort" | "pending"} SourceMode
 */

/**
 * Підміняє CoinGecko в контексті сторінки. Поведінку можна міняти під час сценарію: `source.mode = "ok"`.
 * @param {import('@playwright/test').Page | import('@playwright/test').BrowserContext} target
 * @param {{mode?: SourceMode, markets?: object[]}} [options]
 */
export async function routeCoinGecko(target, { mode = "ok", markets = topMarkets() } = {}) {
  const source = {
    mode,
    markets,
    /** URL усіх запитів топ-50 (без стейблкоїнів), у порядку надходження. */
    topRequests: [],
    stableRequests: 0,
  };
  await target.route("https://api.coingecko.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("category") === "stablecoins") {
      source.stableRequests += 1;
      await route.fulfill({ json: STABLECOINS, headers: CORS });
      return;
    }
    source.topRequests.push(url.toString());
    if (source.mode === "pending") return;
    if (source.mode === "abort") {
      await route.abort("failed");
      return;
    }
    if (source.mode === "ok") {
      await route.fulfill({ json: source.markets, headers: CORS });
      return;
    }
    await route.fulfill({ status: Number(source.mode), json: {}, headers: CORS });
  });
  await target.route("https://coin-images.coingecko.com/**", (route) =>
    route.fulfill({ body: PIXEL, contentType: "image/png" }),
  );
  return source;
}
