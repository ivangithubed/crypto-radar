import { PriceChart7d } from "../../chart/index.js";
import { TermHint } from "../../glossary/index.js";
import { formatPrice, formatPriceTime } from "../../lib/index.js";
import { Change } from "./Change.jsx";
import { CoinHeader } from "./CoinHeader.jsx";
import { CoinStats } from "./CoinStats.jsx";
import { FavoriteStatus } from "./FavoriteStatus.jsx";
import { FavoriteToggle } from "./FavoriteToggle.jsx";

/**
 * Стан Data сторінки монети (UX §3 S-2): заголовок, ціна, графік за 7 днів і список даних.
 * Від 768 px — два стовпці (графік 2/3, дані 1/3), у DOM вміст один.
 * @param {{coin: import('../../lib/index.js').Coin, isStable: boolean, pricesAt: Date | null,
 *   favorite: ReturnType<typeof import('./useCoinFavorite.js').useCoinFavorite>,
 *   h1Ref: import('react').Ref<HTMLHeadingElement>}} props
 * @returns {import('react').ReactElement}
 */
export function CoinView({ coin, isStable, pricesAt, favorite, h1Ref }) {
  return (
    <>
      <CoinHeader
        name={coin.name}
        symbol={coin.symbol}
        imageUrl={coin.imageUrl}
        isStable={isStable}
        h1Ref={h1Ref}
      >
        <FavoriteToggle isFav={favorite.isFav} name={coin.name} onToggle={favorite.toggle} />
      </CoinHeader>
      <FavoriteStatus status={favorite.status} writeFailed={favorite.writeFailed} />
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-6">
        <section
          aria-labelledby="coin-chart-title"
          className="grid gap-2 rounded-md border border-line bg-surface-raised p-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-[28px] leading-[34px] font-semibold tabular-nums md:text-[32px] md:leading-[38px]">
              {formatPrice(coin.priceUsd)}
            </span>
            <Change pct={coin.change7dPct} suffix=" за 7 днів" />
          </div>
          {pricesAt ? (
            <p className="m-0 text-sm text-ink-muted">Ціни на {formatPriceTime(pricesAt)}</p>
          ) : null}
          <h2
            id="coin-chart-title"
            className="m-0 inline-flex items-center gap-1 font-sans text-base leading-6 font-semibold"
          >
            Графік за 7 днів
            <TermHint term="volatility" />
          </h2>
          <PriceChart7d prices={coin.sparkline7d} end={coin.lastUpdated} />
        </section>
        <CoinStats coin={coin} />
      </div>
    </>
  );
}
