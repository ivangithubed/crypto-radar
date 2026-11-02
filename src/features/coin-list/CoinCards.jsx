import { formatMarketCap, formatPrice } from "../../lib/index.js";
import { CoinIdentity } from "./CoinIdentity.jsx";
import { ChangeValue, FavoriteStar } from "./CoinParts.jsx";

/**
 * Картки монет `<ol>` для вузьких екранів (< 768 px).
 * @param {{coins: import('../../lib/index.js').Coin[], label: string, stableIds: Set<string>,
 *   isFavorite: (id: string) => boolean, onToggle: (coin: import('../../lib/index.js').Coin) => void}} props
 * @returns {import('react').ReactElement}
 */
export function CoinCards({ coins, label, stableIds, isFavorite, onToggle }) {
  return (
    <ol aria-label={label} className="m-0 grid list-none gap-2 p-0">
      {coins.map((coin, index) => (
        <li
          key={coin.id}
          className="grid gap-1 rounded-md border border-line bg-surface-raised px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-5 text-sm text-ink-muted tabular-nums">{coin.rank}</span>
            <CoinIdentity coin={coin} index={index} isStable={stableIds.has(coin.id)} />
            <span className="ml-auto">
              <FavoriteStar
                name={coin.name}
                isFavorite={isFavorite(coin.id)}
                onToggle={() => onToggle(coin)}
              />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium whitespace-nowrap text-ink tabular-nums">
              {formatPrice(coin.priceUsd)}
            </span>
            <ChangeValue pct={coin.change7dPct} />
          </div>
          <div className="text-sm text-ink-muted">
            Капіталізація{" "}
            <span className="font-medium text-ink tabular-nums">
              {formatMarketCap(coin.marketCapUsd)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
