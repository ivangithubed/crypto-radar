// Публічний інтерфейс модуля favorites (архітектура §5, §6, ADR 0004, ADR 0006): обрані в localStorage.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури не змінюються.
import { useCallback, useState, useSyncExternalStore } from "react";
import { persistDismissed, shouldShowHint } from "./safari.js";
import { addFavorite, getSnapshot, removeFavorite, subscribe } from "./store.js";

export { FAVORITES_KEY, SAFARI_HINT_KEY } from "./store.js";

/**
 * Обрані монети: без дублів, додавання лише з топ-50, синхронізація вкладок подією `storage` (C-TAB).
 * `add` повертає false, якщо монети немає в `top50Ids` або запис не вдався.
 * @returns {{ids: string[], add: (id: string, top50Ids: Set<string>) => boolean, remove: (id: string) => void,
 *   has: (id: string) => boolean, storeError: 'write' | 'read' | null}}
 */
export function useFavorites() {
  const { ids, storeError } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const has = useCallback((id) => ids.includes(id), [ids]);
  return { ids, add: addFavorite, remove: removeFavorite, has, storeError };
}

/**
 * Порада Safari «Додайте на головний екран» (ADR 0006): видно лише в Safari / WebKit, поза режимом standalone
 * і поки не закрито.
 * @returns {{visible: boolean, dismiss: () => void}}
 */
export function useSafariHint() {
  const [visible, setVisible] = useState(shouldShowHint);
  const dismiss = useCallback(() => {
    persistDismissed();
    setVisible(false);
  }, []);
  return { visible, dismiss };
}
