// Знімок топ-50: перше завантаження, оновлення 60 с (P-6), свіжість щосекунди (P-5, NFR-1).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isFresh } from "../lib/index.js";
import { errorKindOf } from "./client.js";
import { lastErrorKinds, topCoinsQuery } from "./topCoinsQuery.js";

/** @typedef {import('../lib/index.js').TopCoinsState} TopCoinsState */

/** @type {never[]} */
const EMPTY = [];

/**
 * Медіана lastUpdated (NFR-1, P-9): рідко оновлювана монета (наприклад, figure-heloc) не ховає список.
 * При парній кількості — старіша з двох середніх.
 * @param {import('../lib/index.js').Coin[] | undefined} coins
 * @returns {Date | null}
 */
function medianUpdate(coins) {
  if (!coins || coins.length === 0) return null;
  const times = coins.map((coin) => coin.lastUpdated.getTime()).sort((a, b) => a - b);
  return new Date(times[(times.length - 1) >> 1]);
}

/** Годинник свіжості: поки є дані, оновлюється щосекунди (P-5). */
function useNow(active, dataVersion) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, dataVersion]);
  return now;
}

function useManualRetry(refetch) {
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const retry = useCallback(() => {
    setRetrying(true);
    setRetryFailed(false);
    // Якщо запит уже виконується (фоновий ланцюг повторів), приєднуємось до нього, а не скасовуємо (TD-017).
    refetch({ cancelRefetch: false }).then((result) => {
      setRetrying(false);
      setRetryFailed(result.status === "error");
    });
  }, [refetch]);
  return { retry, retrying, retryFailed };
}

/**
 * @returns {TopCoinsState}
 */
export function useTopCoins() {
  // Сторінковий спостерігач: неявні тригери вимкнено в defaultOptions провайдера; цикл 60 с, фокус і
  // reconnect веде лише TopCoinsPoller (NFR-3).
  const client = useQueryClient();
  const query = useQuery(topCoinsQuery);
  const { data, error } = query;
  const { retry, retrying, retryFailed } = useManualRetry(query.refetch);
  const now = useNow(Boolean(data), data);

  const pricesAt = useMemo(() => medianUpdate(data), [data]);
  const fresh = pricesAt !== null && isFresh(pricesAt, now);
  let status = "loading";
  let errorKind = null;
  if (data) {
    status = fresh ? "fresh" : "error";
    errorKind = fresh ? null : "stale";
  } else if (query.isError) {
    status = "error";
    errorKind = errorKindOf(error);
  } else if (query.errorUpdatedAt > 0) {
    // Фонова спроба після помилки без даних: query-core обнулив error, лишаємо стан помилки (TD-016).
    status = "error";
    errorKind = lastErrorKinds.get(client) ?? "src";
  }

  return useMemo(
    () => ({
      status,
      errorKind,
      coins: status === "fresh" ? data : EMPTY,
      pricesAt,
      retry,
      retrying,
      retryFailed,
    }),
    [status, errorKind, data, pricesAt, retry, retrying, retryFailed],
  );
}
