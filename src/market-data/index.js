// Публічний інтерфейс модуля market-data (архітектура §5, §7.1): клієнт CoinGecko, знімок топ-50, свіжість NFR-1.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури не змінюються, реалізацію дає хвиля 2.
import "../lib/index.js";

/** @typedef {import('../lib/index.js').Coin} Coin */
/** @typedef {import('../lib/index.js').TopCoinsState} TopCoinsState */

/** Відповідь джерела має неочікувану форму (E-SHAPE, P-7). */
export class ShapeError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "ShapeError";
  }
}

/**
 * Знімок топ-50 для екранів: перше завантаження, фонове оновлення 60 с (P-6), перевірка свіжості щосекунди (P-5).
 * @returns {TopCoinsState}
 */
export function useTopCoins() {
  throw new Error("not implemented: useTopCoins");
}

/**
 * Ідентифікатори стейблкоїнів (раз за сесію); при помилці — порожня множина без стану помилки.
 * @returns {Set<string>}
 */
export function useStablecoinIds() {
  throw new Error("not implemented: useStablecoinIds");
}

/**
 * Провайдер даних: власний QueryClient у useState, `retry: false` (P-4).
 * @param {{children?: import('react').ReactNode}} props
 * @returns {import('react').ReactNode}
 */
export function MarketDataProvider({ children }) {
  return children;
}

/**
 * GET /coins/markets топ-50 з таймаутом 10 с і політикою повторів P-4 (429 → 0, мережа / таймаут / 5xx → 2: 2 с, 4 с).
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<Coin[]>}
 */
export function fetchTopCoins(options) {
  throw new Error(`not implemented: fetchTopCoins(${typeof options})`);
}

/**
 * GET /coins/markets?category=stablecoins → множина id.
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<Set<string>>}
 */
export function fetchStablecoinIds(options) {
  throw new Error(`not implemented: fetchStablecoinIds(${typeof options})`);
}

/**
 * Перевіряє форму відповіді /coins/markets і мапить у Coin (архітектура §6): фільтр 1 ≤ rank ≤ 50,
 * рівно 50 коректних монет, інакше ShapeError (P-7).
 * @param {unknown} json
 * @returns {Coin[]}
 */
export function parseMarkets(json) {
  throw new Error(`not implemented: parseMarkets(${typeof json})`);
}
