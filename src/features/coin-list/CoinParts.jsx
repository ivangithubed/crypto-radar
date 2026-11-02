import { TermHint } from "../../glossary/index.js";
import { formatChange } from "../../lib/index.js";

const TONES = { up: "text-up", down: "text-down", flat: "text-ink-muted" };
const ARROWS = { up: "▲ ", down: "▼ ", flat: "" };
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Зміна за 7 днів: стрілка (лише для ока) + текст + прихований текст для зчитувача (AC-1.5).
 * @param {{pct: number}} props
 * @returns {import('react').ReactElement}
 */
export function ChangeValue({ pct }) {
  const { text, direction, spoken } = formatChange(pct);
  return (
    <span className={`font-medium whitespace-nowrap tabular-nums ${TONES[direction]}`}>
      <span aria-hidden="true">{ARROWS[direction]}</span>
      {text}
      <span className="sr-only"> {spoken}</span>
    </span>
  );
}

/**
 * Кнопка ★ / ☆ без `aria-pressed`: ім'я змінюється разом з дією (UX §3.1, WCAG 2.5.3).
 * @param {{name: string, isFavorite: boolean, onToggle: () => void}} props
 * @returns {import('react').ReactElement}
 */
export function FavoriteStar({ name, isFavorite, onToggle }) {
  const label = isFavorite ? `Прибрати з обраних: ${name}` : `Додати в обрані: ${name}`;
  const tone = isFavorite ? "text-brand" : "text-ink-muted";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl ${tone} ${FOCUS_RING}`}
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
    </button>
  );
}

/**
 * Мітка «Стейблкоїн» з підказкою.
 * @returns {import('react').ReactElement}
 */
export function StableTag() {
  return (
    <span className="inline-flex items-center gap-1 text-sm leading-5 text-brand">
      Стейблкоїн <TermHint term="stablecoin" />
    </span>
  );
}

/**
 * Логотип 24×24 лише з непорожнім `imageUrl` (декоративний, `alt=""`); з 7-ї монети `loading="lazy"`.
 * @param {{url: string, lazy: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function CoinLogo({ url, lazy }) {
  if (url === "") {
    return <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-brand-soft" />;
  }
  return (
    <img
      src={url}
      alt=""
      width="24"
      height="24"
      loading={lazy ? "lazy" : undefined}
      className="size-6 shrink-0 rounded-full"
    />
  );
}
