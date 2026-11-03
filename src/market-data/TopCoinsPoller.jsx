import { useQuery } from "@tanstack/react-query";
import { REFRESH_MS, shouldAutoRefresh, topCoinsQuery } from "./topCoinsQuery.js";

/**
 * Невидимий постійний спостерігач топ-50: тримає 60-секундний цикл (P-6) і оновлення при поверненні у вкладку,
 * щоб переходи між екранами не скидали таймер і не породжували зайвих запитів (NFR-3).
 * @returns {null}
 */
export function TopCoinsPoller() {
  useQuery({
    ...topCoinsQuery,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: shouldAutoRefresh,
    refetchOnReconnect: shouldAutoRefresh,
    notifyOnChangeProps: [],
  });
  return null;
}
