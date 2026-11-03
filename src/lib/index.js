// Публічний інтерфейс модуля lib (архітектура §5): чисті функції без залежностей.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури й константи не змінюються, реалізацію дає хвиля 1.

/**
 * Монета з топ-50 (архітектура §6, мапінг полів CoinGecko — там само).
 * @typedef {object} Coin
 * @property {string} id ідентифікатор CoinGecko (`bitcoin`)
 * @property {string} name назва як у джерелі
 * @property {string} symbol тікер у верхньому регістрі (`BTC`)
 * @property {number} rank місце в рейтингу, 1–50
 * @property {number} priceUsd ціна, $
 * @property {number | null} change7dPct зміна за 7 днів, %; `null` — джерело не дало значення (показується «—»)
 * @property {number} marketCapUsd капіталізація, $
 * @property {string} imageUrl логотип лише з https://coin-images.coingecko.com/…, інакше порожній рядок
 * @property {number[]} sparkline7d погодинні ціни за 7 днів (до 168 точок)
 * @property {Date} lastUpdated час ціни в джерелі
 * @property {boolean} isStablecoin id є у відповіді category=stablecoins (обчислює фіча)
 */

/** @typedef {'price' | 'gain' | 'loss' | 'cap'} SortKey */

/**
 * Стан знімка топ-50 для екранів (повертає `useTopCoins` модуля market-data).
 * @typedef {object} TopCoinsState
 * @property {'loading' | 'fresh' | 'error'} status
 * @property {'src' | 'net' | 'stale' | null} errorKind src — E-SRC, E-429, E-SHAPE; net — E-NET; stale — E-STALE
 * @property {Coin[]} coins монети лише в стані fresh, інакше порожній масив (NFR-1)
 * @property {Date | null} pricesAt найстаріший lastUpdated серед 50 монет (P-9)
 * @property {() => void} retry «Спробувати ще раз»
 * @property {boolean} retrying повтор триває
 * @property {boolean} retryFailed останній повтор завершився помилкою
 */

/** Ключі сортування в порядку опцій select (UX §5.2, `sort.*`). @type {SortKey[]} */
export const SORT_KEYS = ["price", "gain", "loss", "cap"];

/** Тексти опцій сортування — дослівно UX §5.2 (US-2 правило 2). @type {Record<SortKey, string>} */
export const SORT_LABELS = {
  price: "Ціна: від найдорожчої",
  gain: "Зміна за 7 днів: найбільше зростання",
  loss: "Зміна за 7 днів: найбільше падіння",
  cap: "Капіталізація: від найбільшої",
};

/** NFR-1: ціни видно лише при давності ≤ 300 с. */
export const FRESHNESS_LIMIT_MS = 300000;

/** AC-3.6: найдовший запит пошуку. */
export const QUERY_MAX_LENGTH = 50;

/** US-1: монет на першому показі й за натиск «Показати більше». */
export const PAGE_SIZE = 25;

export { formatPrice, formatChange, formatMarketCap, formatPriceTime } from "./format.js";
export { sortCoins } from "./sort.js";
export { pluralCoins } from "./plural.js";

/**
 * Запит пошуку для порівняння: обрізані пробіли, нижній регістр, не довше QUERY_MAX_LENGTH (US-3).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeQuery(raw) {
  return raw.trim().toLocaleLowerCase("uk").slice(0, QUERY_MAX_LENGTH);
}

/**
 * Монети, назва або тікер яких містить нормалізований запит (US-3); порядок вхідного масиву зберігається.
 * @param {Coin[]} coins
 * @param {string} query
 * @returns {Coin[]}
 */
export function searchCoins(coins, query) {
  const needle = normalizeQuery(query);
  if (needle === "") return [...coins];
  return coins.filter(
    (coin) =>
      coin.name.toLocaleLowerCase("uk").includes(needle) ||
      coin.symbol.toLocaleLowerCase("uk").includes(needle),
  );
}

/**
 * NFR-1: давність `now − oldestLastUpdated` ≤ FRESHNESS_LIMIT_MS.
 * @param {Date} oldestLastUpdated
 * @param {Date} now
 * @returns {boolean}
 */
export function isFresh(oldestLastUpdated, now) {
  return now.getTime() - oldestLastUpdated.getTime() <= FRESHNESS_LIMIT_MS;
}
