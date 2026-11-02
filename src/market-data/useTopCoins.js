// Знімок топ-50: перше завантаження, оновлення 60 с (P-6), свіжість щосекунди (P-5, NFR-1).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isFresh } from "../lib/index.js";
import { errorKindOf, fetchTopCoins } from "./client.js";

/** @typedef {import('../lib/index.js').TopCoinsState} TopCoinsState */

const REFRESH_MS = 60000;
/** @type {never[]} */
const EMPTY = [];

function oldestUpdate(coins) {
  if (!coins) return null;
  return new Date(Math.min(...coins.map((coin) => coin.lastUpdated.getTime())));
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
    refetch().then((result) => {
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
  const query = useQuery({
    queryKey: ["top-coins"],
    queryFn: ({ signal }) => fetchTopCoins({ signal }),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const { data, error } = query;
  const { retry, retrying, retryFailed } = useManualRetry(query.refetch);
  const now = useNow(Boolean(data), data);

  const pricesAt = useMemo(() => oldestUpdate(data), [data]);
  const fresh = pricesAt !== null && isFresh(pricesAt, now);
  let status = "loading";
  let errorKind = null;
  if (data) {
    status = fresh ? "fresh" : "error";
    errorKind = fresh ? null : "stale";
  } else if (query.isError) {
    status = "error";
    errorKind = errorKindOf(error);
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
