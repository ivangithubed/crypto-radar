import { Button } from "../../ui/index.js";
import { pluralCoins } from "../../lib/index.js";

/**
 * Блок Empty (пошук): заголовок, пояснення й «Очистити пошук» (M-Search-Empty).
 * @param {{onClear: () => void}} props
 * @returns {import('react').ReactElement}
 */
function EmptySearch({ onClear }) {
  return (
    <section className="grid justify-items-start gap-2 rounded-md border border-line bg-surface-raised p-6">
      <h2 className="font-sans text-lg leading-6 font-semibold text-ink">Нічого не знайдено</h2>
      <p className="text-ink">
        Шукаємо лише серед топ-50 монет за назвою латиницею (Bitcoin) або тікером (BTC).
      </p>
      <Button variant="secondary" onClick={onClear}>
        Очистити пошук
      </Button>
    </section>
  );
}

/**
 * Постійна жива область пошуку: «Знайдено N …» (після паузи, прихована) або блок Empty (одразу).
 * @param {{empty: boolean, foundCount: number | null, onClear: () => void}} props
 * @returns {import('react').ReactElement}
 */
export function SearchStatus({ empty, foundCount, onClear }) {
  let content = null;
  if (empty) content = <EmptySearch onClear={onClear} />;
  else if (foundCount !== null)
    content = <span className="sr-only">Знайдено {pluralCoins(foundCount, "acc")}</span>;
  return <div role="status">{content}</div>;
}
