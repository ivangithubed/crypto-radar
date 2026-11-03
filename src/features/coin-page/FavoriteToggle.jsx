import { Button } from "../../ui/index.js";

const COMPACT =
  "max-md:size-8 max-md:min-h-8 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-xl";

/**
 * Кнопка-дія ★ без `aria-pressed` (UX §3.1): ім'я починається з видимої дії, назва монети — для зчитувача.
 * На телефоні видно лише гліф, від 768 px — і текст (WCAG 2.5.3).
 * @param {{isFav: boolean, name: string, onToggle: () => void, alwaysText?: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function FavoriteToggle({ isFav, name, onToggle, alwaysText = false }) {
  const action = isFav ? "Прибрати з обраних" : "Додати в обрані";
  return (
    <Button
      variant="secondary"
      className={`gap-1.5 ${alwaysText ? "" : COMPACT}`}
      onClick={onToggle}
      aria-label={`${action}: ${name}`}
    >
      <span aria-hidden="true">{isFav ? "★" : "☆"}</span>
      <span className={alwaysText ? "" : "max-md:sr-only"}>{action}</span>
    </Button>
  );
}
