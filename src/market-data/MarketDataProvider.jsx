import { useState } from "react";
import { TopCoinsPoller } from "./TopCoinsPoller.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Єдине джерело правди NFR-3: усі неявні тригери query-core вимкнено. Запити топ-50 ініціюють лише
 * старт, інтервал і фокус / reconnect TopCoinsPoller (з умовою) та ручний retry().
 */
const NO_IMPLICIT_FETCH = {
  // 'always': стану paused немає. Офлайн fetch кидає мережеву помилку (E-NET «Немає з'єднання»), а не висить
  // у «Завантажуємо…», і reconnect не відновлює призупинений запит поза умовою shouldAutoRefresh.
  networkMode: "always",
  retry: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retryOnMount: false,
};

/**
 * Провайдер даних: власний QueryClient у useState, `retry: false` (P-4 — повтори робить клієнт).
 * @param {{children?: import('react').ReactNode}} props
 * @returns {import('react').ReactNode}
 */
export function MarketDataProvider({ children }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: NO_IMPLICIT_FETCH } }),
  );
  return (
    <QueryClientProvider client={client}>
      <TopCoinsPoller />
      {children}
    </QueryClientProvider>
  );
}
