import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTopCoins } from "../../market-data/index.js";

/** @typedef {'loading' | 'error' | 'noChart' | 'out' | 'data'} CoinViewKind */

/**
 * @param {ReturnType<typeof useTopCoins>} top
 * @param {import('../../lib/index.js').Coin | undefined} coin
 * @returns {CoinViewKind}
 */
function pickView(top, coin) {
  if (top.status === "loading") return "loading";
  if (top.status === "error") return "error";
  if (!coin) return "out";
  // P-8: порожній sparkline (< 2 точок) — помилка джерела лише на сторінці монети.
  return coin.sparkline7d.length < 2 ? "noChart" : "data";
}

/** Повтор, що завершився тим самим дефектом даних (P-8), теж має повідомити про невдачу. */
function useRetry(top, view) {
  const [retried, setRetried] = useState(false);
  const retry = useCallback(() => {
    setRetried(true);
    top.retry();
  }, [top]);
  const retryFailed = top.retryFailed || (retried && !top.retrying && view === "noChart");
  return { retry, retryFailed };
}

/** Після успішного повтору (Error → Data / «Поза топ-50») фокус на h1 (UX §3 S-2). */
function useFocusOnRecovery(view) {
  const h1Ref = useRef(null);
  const prev = useRef(view);
  useEffect(() => {
    const recovered =
      (prev.current === "error" || prev.current === "noChart") &&
      (view === "data" || view === "out");
    if (recovered) h1Ref.current?.focus();
    prev.current = view;
  }, [view]);
  return h1Ref;
}

/**
 * Дані сторінки монети з єдиного знімка `useTopCoins` (NFR-3: додаткових запитів немає).
 * @param {string} id
 */
export function useCoinView(id) {
  const top = useTopCoins();
  const coin = useMemo(() => top.coins.find((item) => item.id === id), [top.coins, id]);
  const top50Ids = useMemo(() => new Set(top.coins.map((item) => item.id)), [top.coins]);
  const view = pickView(top, coin);
  const { retry, retryFailed } = useRetry(top, view);
  const h1Ref = useFocusOnRecovery(view);
  return { top, coin, top50Ids, view, retry, retryFailed, h1Ref };
}
