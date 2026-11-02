// Публічний інтерфейс модуля ui (архітектура §5): доступні базові компоненти без залежностей від інших модулів.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури не змінюються, реалізацію дає хвиля 1.

/**
 * Кнопка дизайн-системи (UX §9.3). Решта props — атрибути `<button>`; `type` за замовчуванням "button".
 * `aria-disabled="true"` блокує дію, але лишає кнопку у фокусі (UX §3.1 «Спробувати ще раз»).
 * @param {{variant?: 'primary' | 'secondary' | 'ghost', children?: import('react').ReactNode} & Record<string, unknown>} props
 * @returns {import('react').ReactElement | null}
 */
export function Button(props) {
  void props;
  return null;
}

/**
 * Ввічлива жива область `role="status"`: присутня в DOM завжди, оголошує зміну `children` (WCAG 4.1.3).
 * @param {{children?: import('react').ReactNode, className?: string}} props
 * @returns {import('react').ReactElement | null}
 */
export function StatusMessage(props) {
  void props;
  return null;
}

/**
 * Блок помилки даних (UX §3, §5.2 `error.*`): `role="alert"`, заголовок і текст за `kind`,
 * кнопка «Спробувати ще раз» / «Завантажуємо…» (`aria-disabled`), після невдалого повтору — `error.retryFailed`
 * у `role="status"` і фокус на кнопці.
 * @param {{kind: 'src' | 'net' | 'stale', onRetry: () => void, retrying: boolean, retryFailed: boolean}} props
 * @returns {import('react').ReactElement | null}
 */
export function ErrorBlock(props) {
  void props;
  return null;
}

/**
 * Скелетон завантаження в розмір справжнього вмісту (CLS, NFR-4); прихований від зчитувача.
 * @param {{className?: string}} props
 * @returns {import('react').ReactElement | null}
 */
export function Skeleton(props) {
  void props;
  return null;
}

/**
 * Доступна підказка до терміна (UX §4, WCAG 1.4.13): `<button aria-expanded>` з ім'ям `Що означає «{term}»?`,
 * панель з `hintText` лише відкритою (закрита відсутня в DOM), Esc закриває з будь-якого місця й повертає фокус
 * на кнопку, одночасно відкрита одна підказка на сторінці.
 * @param {{term: string, hintText: string, id: string}} props term — видима назва терміна; id — id панелі
 * @returns {import('react').ReactElement | null}
 */
export function TermHintButton(props) {
  void props;
  return null;
}

/**
 * Чи відповідає вікно медіазапиту; початкове значення синхронне з `matchMedia` (без CLS, P-3).
 * @param {string} query
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  throw new Error(`not implemented: useMediaQuery(${query})`);
}

/**
 * Заголовок вкладки браузера (UX §1).
 * @param {string} title
 * @returns {void}
 */
export function useDocumentTitle(title) {
  throw new Error(`not implemented: useDocumentTitle(${title})`);
}
