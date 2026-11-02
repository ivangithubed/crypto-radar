// Публічний інтерфейс модуля favorites (архітектура §5, §6, ADR 0004, ADR 0006): обрані в localStorage.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури не змінюються, реалізацію дає хвиля 2.
import "../lib/index.js";

/** Ключ обраних: JSON-масив рядків-ідентифікаторів (NFR-10). */
export const FAVORITES_KEY = "crypto-radar:favorites";

/** Ключ «підказку Safari закрито»: значення "1" (ADR 0006). */
export const SAFARI_HINT_KEY = "crypto-radar:safari-hint-dismissed";

/**
 * Обрані монети: без дублів, додавання лише з топ-50, синхронізація вкладок подією `storage` (C-TAB).
 * `add` повертає false, якщо монети немає в `top50Ids` або запис не вдався.
 * @returns {{ids: string[], add: (id: string, top50Ids: Set<string>) => boolean, remove: (id: string) => void,
 *   has: (id: string) => boolean, storeError: 'write' | 'read' | null}}
 */
export function useFavorites() {
  throw new Error("not implemented: useFavorites");
}

/**
 * Порада Safari «Додайте на головний екран» (ADR 0006): видно лише в Safari / WebKit, поза режимом standalone
 * і поки не закрито.
 * @returns {{visible: boolean, dismiss: () => void}}
 */
export function useSafariHint() {
  throw new Error("not implemented: useSafariHint");
}
