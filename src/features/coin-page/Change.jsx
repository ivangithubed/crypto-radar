import { formatChange } from "../../lib/index.js";

const ARROWS = { up: "▲ ", down: "▼ ", flat: "" };
const COLORS = { up: "text-up", down: "text-down", flat: "text-ink-muted" };

/**
 * Зміна за 7 днів: видимий текст зі стрілкою (`aria-hidden`) і текст для зчитувача (UX §5.2 `change.*`).
 * @param {{pct: number | null, suffix?: string}} props `suffix` дописується до тексту для зчитувача
 * @returns {import('react').ReactElement}
 */
export function Change({ pct, suffix = "" }) {
  const { text, direction, spoken } = formatChange(pct);
  return (
    <span className={`font-medium whitespace-nowrap tabular-nums ${COLORS[direction]}`}>
      <span aria-hidden="true">
        {ARROWS[direction]}
        {text}
      </span>
      <span className="sr-only">
        {spoken}
        {suffix}
      </span>
    </span>
  );
}
