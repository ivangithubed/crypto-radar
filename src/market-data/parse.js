// Перевірка форми відповіді /coins/markets і мапінг у Coin (архітектура §6, §8.2; P-7, P-8).

/** @typedef {import('../lib/index.js').Coin} Coin */

/** Відповідь джерела має неочікувану форму (E-SHAPE, P-7). */
export class ShapeError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "ShapeError";
  }
}

const TOP_SIZE = 50;
const IMAGE_HOST = "coin-images.coingecko.com";
const FUTURE_TOLERANCE_MS = 60000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(raw, field) {
  if (typeof raw[field] !== "string" || raw[field] === "") {
    throw new ShapeError(`Поле ${field} має бути непорожнім рядком`);
  }
  return raw[field];
}

function finite(raw, field) {
  const value = raw[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ShapeError(`Поле ${field} має бути скінченним числом`);
  }
  return value;
}

function safeImage(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === IMAGE_HOST ? value : "";
  } catch {
    return "";
  }
}

function sparkline(raw) {
  const line = isRecord(raw.sparkline_in_7d) ? raw.sparkline_in_7d.price : undefined;
  if (!Array.isArray(line) || !line.every((p) => typeof p === "number" && Number.isFinite(p))) {
    throw new ShapeError("Поле sparkline_in_7d.price має бути масивом чисел");
  }
  return line;
}

function updatedAt(raw) {
  const value = raw.last_updated;
  const date = typeof value === "string" ? new Date(value) : null;
  if (date === null || Number.isNaN(date.getTime())) {
    throw new ShapeError("Поле last_updated має бути датою");
  }
  if (date.getTime() - Date.now() > FUTURE_TOLERANCE_MS) {
    console.warn(`last_updated з майбутнього: ${value}`);
  }
  return date;
}

function rankOf(raw) {
  const rank = raw.market_cap_rank;
  if (typeof rank !== "number" || !Number.isInteger(rank)) {
    throw new ShapeError("Поле market_cap_rank має бути цілим числом");
  }
  return rank;
}

function toCoin(raw, rank) {
  return {
    id: text(raw, "id"),
    name: text(raw, "name"),
    symbol: text(raw, "symbol").toUpperCase(),
    rank,
    priceUsd: finite(raw, "current_price"),
    change7dPct: finite(raw, "price_change_percentage_7d_in_currency"),
    marketCapUsd: finite(raw, "market_cap"),
    imageUrl: safeImage(raw.image),
    sparkline7d: sparkline(raw),
    lastUpdated: updatedAt(raw),
    isStablecoin: false,
  };
}

/**
 * Перевіряє форму відповіді /coins/markets і мапить у Coin: фільтр 1 ≤ rank ≤ 50,
 * рівно 50 коректних монет з унікальними рангами, інакше ShapeError (P-7).
 * @param {unknown} json
 * @returns {Coin[]}
 */
export function parseMarkets(json) {
  if (!Array.isArray(json)) throw new ShapeError("Відповідь має бути масивом");
  const coins = [];
  for (const raw of json) {
    if (!isRecord(raw)) throw new ShapeError("Елемент відповіді має бути об'єктом");
    const rank = rankOf(raw);
    if (rank >= 1 && rank <= TOP_SIZE) coins.push(toCoin(raw, rank));
  }
  if (coins.length !== TOP_SIZE || new Set(coins.map((c) => c.rank)).size !== TOP_SIZE) {
    throw new ShapeError(`Очікувано ${TOP_SIZE} монет з унікальними рангами`);
  }
  return coins.sort((a, b) => a.rank - b.rank);
}
