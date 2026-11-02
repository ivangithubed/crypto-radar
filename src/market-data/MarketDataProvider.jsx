import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Провайдер даних: власний QueryClient у useState, `retry: false` (P-4 — повтори робить клієнт).
 * @param {{children?: import('react').ReactNode}} props
 * @returns {import('react').ReactNode}
 */
export function MarketDataProvider({ children }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
