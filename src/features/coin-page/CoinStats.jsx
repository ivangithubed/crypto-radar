import { TermHint } from "../../glossary/index.js";
import { formatMarketCap } from "../../lib/index.js";
import { Change } from "./Change.jsx";

function Row({ term, label, children }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 first:border-t-0">
      <dt className="inline-flex items-center gap-1 text-sm text-ink-muted">
        {label}
        <TermHint term={term} />
      </dt>
      <dd className="m-0 font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * Список даних монети `<dl>`: місце, тікер, зміна за 7 днів, капіталізація (UX §3 S-2, вайрфрейм п. 6).
 * @param {{coin: import('../../lib/index.js').Coin}} props
 * @returns {import('react').ReactElement}
 */
export function CoinStats({ coin }) {
  return (
    <dl className="m-0 rounded-md border border-line bg-surface-raised">
      <Row term="rank" label="Місце в рейтингу">
        {coin.rank}
      </Row>
      <Row term="ticker" label="Тікер">
        {coin.symbol}
      </Row>
      <Row term="change7d" label="Зміна за 7 днів">
        <Change pct={coin.change7dPct} />
      </Row>
      <Row term="marketCap" label="Капіталізація">
        {formatMarketCap(coin.marketCapUsd)}
      </Row>
    </dl>
  );
}
