import { vi } from "vitest";

// Момент «зараз» для всіх сценаріїв: годинник пристрою заморожено (vi.useFakeTimers({toFake: ["Date"]})).
export const NOW = new Date("2026-11-02T12:32:00.000Z");

const SPARKLINE_POINTS = 168;

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
    sparkline: sparkline(price * 0.95, price),
  };
}

// Монети з Gherkin-сценаріїв вимог (US-1 – US-8); решта місць — «Монета-N».
const NAMED = {
  1: {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "btc",
    price: 67250.1,
    change: 4.2,
    cap: 1.32e12,
    sparkline: sparkline(64540, 67250.1),
  },
  2: { id: "ethereum", name: "Ethereum", symbol: "eth", price: 3120, change: -6.1 },
  3: { id: "tether", name: "Tether", symbol: "usdt", price: 1, change: 0 },
  5: { id: "solana", name: "Solana", symbol: "sol", price: 150.4, change: 12.8 },
  7: { id: "usd-coin", name: "USD Coin", symbol: "usdc", price: 1, change: 0 },
  30: { id: "bitcoin-cash", name: "Bitcoin Cash", symbol: "bch", price: 2.5, change: 1.5 },
  48: { change: 25 },
};

/** Сирий об'єкт /coins/markets для місця rank з необов'язковими замінами полів. */
export function marketCoin(rank, overrides = {}, ageSeconds = 60) {
  const coin = { ...genericCoin(rank), ...NAMED[rank], ...overrides };
  const line = coin.sparkline ?? sparkline(coin.price * 0.95, coin.price);
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
 * Відповідь топ-50: місця 1–50 і ще Монета-51 (продукт сам відкидає місця > 50, AC-1.4).
 * @param {{overrides?: Record<number, object>, ageSeconds?: number}} [options]
 */
export function topMarkets({ overrides = {}, ageSeconds = 60 } = {}) {
  return Array.from({ length: 51 }, (_, i) => marketCoin(i + 1, overrides[i + 1], ageSeconds));
}

export const TOP_IDS = topMarkets()
  .slice(0, 50)
  .map((coin) => coin.id);

const STABLECOINS = [
  { id: "tether", symbol: "usdt", name: "Tether" },
  { id: "usd-coin", symbol: "usdc", name: "USD Coin" },
];

function jsonResponse(data) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function errorResponse(status) {
  return { ok: false, status, statusText: "Error", json: async () => ({}), text: async () => "" };
}

/**
 * Підміняє fetch фальшивим CoinGecko.
 * mode: "ok" | "429" | "503" | "pending" — поведінка запиту топ-50; стейблкоїни відповідають завжди.
 */
export function installFakeCoinGecko({ mode = "ok", markets = topMarkets() } = {}) {
  const source = { mode, markets, calls: [] };
  const fetchMock = vi.fn(async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    source.calls.push(url.toString());
    if (url.searchParams.get("category") === "stablecoins") {
      return jsonResponse(STABLECOINS);
    }
    if (source.mode === "pending") {
      return new Promise(() => {});
    }
    if (source.mode === "429") {
      return errorResponse(429);
    }
    if (source.mode === "503") {
      return errorResponse(503);
    }
    return jsonResponse(source.markets);
  });
  vi.stubGlobal("fetch", fetchMock);
  return source;
}

/** Заморожує годинник пристрою на NOW; таймери лишаються справжніми. */
export function freezeClock(at = NOW) {
  vi.useFakeTimers({ toFake: ["Date"], now: at });
}
