// Спільні параметри запиту топ-50 для сторінкових спостерігачів і постійного TopCoinsPoller.
import { focusManager } from "@tanstack/react-query";
import { errorKindOf, fetchTopCoins } from "./client.js";

export const REFRESH_MS = 60000;

/**
 * Вид останньої помилки топ-50 за QueryClient: query-core скидає `error` у null на початку нової спроби,
 * якщо даних немає (TD-016), а екран має лишатися в стані помилки.
 * @type {WeakMap<object, 'src' | 'net'>}
 */
export const lastErrorKinds = new WeakMap();

export const topCoinsQuery = {
  queryKey: ["top-coins"],
  // Сигнал query-core навмисно не читаємо: інакше StrictMode (розмонтування між двома монтуваннями)
  // скасовує перший запит і стартує другий, а NFR-3 дозволяє на старті один. Таймаут 10 с — у клієнті.
  queryFn: async ({ client }) => {
    try {
      return await fetchTopCoins();
    } catch (error) {
      lastErrorKinds.set(client, errorKindOf(error));
      throw error;
    }
  },
  staleTime: REFRESH_MS,
};

/**
 * Чи минуло ≥ 60 с від останньої спроби (успішної чи невдалої): лише тоді фокус / відновлення мережі
 * можуть оновити дані. Невдала спроба теж рахується в хвилинний ліміт (NFR-3, ADR 0005).
 * @param {{state: {dataUpdatedAt: number, errorUpdatedAt: number}}} query
 * @returns {boolean}
 */
function isAttemptDue(query) {
  const last = Math.max(query.state.dataUpdatedAt, query.state.errorUpdatedAt);
  return Date.now() - last >= REFRESH_MS;
}

/**
 * Єдина умова неявного оновлення топ-50 (фокус, відновлення мережі): вкладка видима
 * і від останньої спроби минуло ≥ 60 с (NFR-2, NFR-3). У прихованій вкладці — завжди false.
 * @param {{state: {dataUpdatedAt: number, errorUpdatedAt: number}}} query
 * @returns {boolean}
 */
export function shouldAutoRefresh(query) {
  return focusManager.isFocused() && isAttemptDue(query);
}
