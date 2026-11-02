import { useCallback, useSyncExternalStore } from "react";

function getMql(query) {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;
}

/**
 * Чи відповідає вікно медіазапиту; початкове значення синхронне з `matchMedia` (без CLS, P-3).
 * @param {string} query
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mql = getMql(query);
      mql?.addEventListener?.("change", onChange);
      return () => mql?.removeEventListener?.("change", onChange);
    },
    [query],
  );
  const getSnapshot = () => getMql(query)?.matches ?? false;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
