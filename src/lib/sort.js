// Сортування монет (US-2): нова копія; рівними вважаються значення, однакові у відвідувача на екрані
// (округлені як у format.js), вони впорядковуються за місцем у рейтингу.
import { shownChange, shownMarketCap, shownPrice } from "./format.js";

/** Монети без зміни за 7 днів (`null`, BUG-003) — у кінці за обох напрямів. */
function byChange(direction) {
  return (a, b) => {
    if (a.change7dPct === null || b.change7dPct === null) {
      return Number(a.change7dPct === null) - Number(b.change7dPct === null);
    }
    return direction * (shownChange(b.change7dPct) - shownChange(a.change7dPct));
  };
}

const COMPARATORS = {
  price: (a, b) => shownPrice(b.priceUsd) - shownPrice(a.priceUsd),
  cap: (a, b) => shownMarketCap(b.marketCapUsd) - shownMarketCap(a.marketCapUsd),
  gain: byChange(1),
  loss: byChange(-1),
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
