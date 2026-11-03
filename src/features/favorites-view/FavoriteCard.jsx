import { Link } from "react-router";
import { formatChange, formatMarketCap, formatPrice } from "../../lib/index.js";
import { CoinLogo } from "../../ui/index.js";
import { removeLabel, TEXTS } from "./model.js";

const CARD = "grid gap-1 rounded-md border border-line bg-surface-raised px-4 py-3";
const ARROWS = { up: "▲", down: "▼", flat: "" };
const TONES = { up: "text-up", down: "text-down", flat: "text-ink" };

/** @param {{id: string, label: string, onRemove: (id: string) => void}} props */
function Star({ id, label, onRemove }) {
  return (
    <button
      type="button"
      data-star-id={id}
      aria-label={removeLabel(label)}
      onClick={() => onRemove(id)}
      className="ml-auto h-8 w-8 flex-none cursor-pointer rounded-full text-xl text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span aria-hidden="true">★</span>
    </button>
  );
}

/** @param {{pct: number | null}} props */
function Change({ pct }) {
  const { text, direction, spoken } = formatChange(pct);
  return (
    <span className={`tabular-nums ${TONES[direction]}`}>
      <span aria-hidden="true">{ARROWS[direction]} </span>
      {text}
      <span className="sr-only">, {spoken}</span>
    </span>
  );
}

/**
 * Картка обраної монети з топ-50 (UX S-3 Data).
 * @param {{coin: import('../../lib/index.js').Coin, onRemove: (id: string) => void}} props
 */
export function FavoriteCard({ coin, onRemove }) {
  return (
    <li className={CARD}>
      <div className="flex items-center gap-2">
        <span className="min-w-5 text-sm text-ink-muted tabular-nums">{coin.rank}</span>
        <CoinLogo url={coin.imageUrl} name={coin.name} />
        <Link
          to={`/coin/${coin.id}`}
          className="font-semibold text-ink hover:text-brand hover:underline"
        >
          {coin.name}
        </Link>
        <span className="text-sm text-ink-muted">{coin.symbol}</span>
        <Star id={coin.id} label={coin.name} onRemove={onRemove} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular-nums">{formatPrice(coin.priceUsd)}</span>
        <Change pct={coin.change7dPct} />
      </div>
      <div className="text-sm text-ink-muted">
        Капіталізація{" "}
        <span className="text-ink tabular-nums">{formatMarketCap(coin.marketCapUsd)}</span>
      </div>
    </li>
  );
}

/**
 * Картка вибулої монети: показуємо `id` як є, без цін (AC-6.4, P-1).
 * @param {{id: string, onRemove: (id: string) => void}} props
 */
export function OutOfTopCard({ id, onRemove }) {
  return (
    <li className={CARD}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="min-w-5 text-sm text-ink-muted">
          —
        </span>
        <Link
          to={`/coin/${id}`}
          className="font-semibold text-ink hover:text-brand hover:underline"
        >
          {id}
        </Link>
        <Star id={id} label={id} onRemove={onRemove} />
      </div>
      <p className="m-0 text-sm text-ink-muted">{TEXTS.outOfTop}</p>
    </li>
  );
}
