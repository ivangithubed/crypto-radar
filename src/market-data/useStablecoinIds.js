import { useQuery } from "@tanstack/react-query";
import { fetchStablecoinIds } from "./client.js";
import { topCoinsQuery } from "./topCoinsQuery.js";

const NONE = new Set();

/**
 * Ідентифікатори стейблкоїнів (раз за сесію); при помилці — порожня множина без стану помилки.
 * @returns {Set<string>}
 */
export function useStablecoinIds() {
  // Стартує лише після першої відповіді топ-50 (успіх чи помилка): не ділить вузький канал з ним.
  // Спостерігач з enabled:false сам нічого не запитує; queryFn у нього той самий (без нього query-core
  // підміняє опції запиту, і призупинений fetch після reconnect падає з «немає queryFn»). Прапор «відповідь була» монотонний
  // (за часовими мітками, а не за status, який при ручному retry повертається в pending): перемикання
  // enabled false → true повторно запустило б запит після помилки (NFR-3: один запит за сесію).
  const { dataUpdatedAt, errorUpdatedAt } = useQuery({
    ...topCoinsQuery,
    enabled: false,
  });
  const { data } = useQuery({
    enabled: dataUpdatedAt > 0 || errorUpdatedAt > 0,
    queryKey: ["stablecoins"],
    // Сигнал query-core навмисно не читаємо (RT-6): інакше зняття останнього спостерігача (перехід між
    // екранами, StrictMode) скасовує запит, а новий монтуваний спостерігач запускає другий. Таймаут 10 с — у клієнті.
    queryFn: () => fetchStablecoinIds(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
  });
  return data ?? NONE;
}
