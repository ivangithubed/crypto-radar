import { useQuery } from "@tanstack/react-query";
import { fetchStablecoinIds } from "./client.js";

const NONE = new Set();

/**
 * Ідентифікатори стейблкоїнів (раз за сесію); при помилці — порожня множина без стану помилки.
 * @returns {Set<string>}
 */
export function useStablecoinIds() {
  const { data } = useQuery({
    queryKey: ["stablecoins"],
    queryFn: ({ signal }) => fetchStablecoinIds({ signal }),
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  return data ?? NONE;
}
