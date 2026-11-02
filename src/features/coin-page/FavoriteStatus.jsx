import { StatusMessage } from "../../ui/index.js";

const WRITE_FAIL =
  "Не вдалося зберегти обрані: браузер не дозволяє зберігати дані сайту (наприклад, у приватному режимі). Обрані діятимуть до закриття вкладки.";

/**
 * Статус дії ★ (`fav.added` / `fav.removed`) і помилка сховища `store.writeFail` у `role="status"`.
 * @param {{status: string, writeFailed: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function FavoriteStatus({ status, writeFailed }) {
  return (
    <StatusMessage className="m-0 text-ink-muted empty:hidden">
      {status}
      {writeFailed ? ` ${WRITE_FAIL}` : null}
    </StatusMessage>
  );
}
