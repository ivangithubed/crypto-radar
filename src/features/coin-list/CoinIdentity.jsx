import { Link } from "react-router";
import { CoinLogo, StableTag } from "./CoinParts.jsx";

/**
 * Логотип, назва-посилання на сторінку монети, тікер і мітка стейблкоїна (спільне для картки й рядка).
 * @param {{coin: import('../../lib/index.js').Coin, index: number, isStable: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function CoinIdentity({ coin, index, isStable }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <CoinLogo url={coin.imageUrl} lazy={index >= 6} />
      <Link
        to={`/coin/${coin.id}`}
        data-coin-id={coin.id}
        className="font-semibold text-ink hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {coin.name}
      </Link>
      <span className="text-sm text-ink-muted">{coin.symbol}</span>
      {isStable ? <StableTag /> : null}
    </span>
  );
}
