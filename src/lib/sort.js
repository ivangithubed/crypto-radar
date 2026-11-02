// Сортування монет (US-2): нова копія, рівні значення — за місцем у рейтингу.

const COMPARATORS = {
  price: (a, b) => b.priceUsd - a.priceUsd,
  cap: (a, b) => b.marketCapUsd - a.marketCapUsd,
  gain: (a, b) => b.change7dPct - a.change7dPct,
  loss: (a, b) => a.change7dPct - b.change7dPct,
};

/**
 * Нова впорядкована копія за ключем; рівні значення — за місцем у рейтингу (US-2).
 * @param {import('./index.js').Coin[]} coins
 * @param {import('./index.js').SortKey} key
 * @returns {import('./index.js').Coin[]}
 */
export function sortCoins(coins, key) {
  const compare = COMPARATORS[key];
  return [...coins].sort((a, b) => compare(a, b) || a.rank - b.rank);
}
