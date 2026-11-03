import { ErrorBlock, Skeleton } from "../../ui/index.js";
import { pluralCoins } from "../../lib/index.js";
import { useFavorites } from "../../favorites/index.js";

/**
 * Скелетон списку в розмір справжнього вмісту (CLS): рядок термінів, 6 карток або 10 рядків.
 * @param {{wide: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function ListSkeleton({ wide }) {
  const rows = wide ? 10 : 6;
  return (
    <div aria-hidden="true" className="grid gap-2">
      <Skeleton className="h-5 w-3/5" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={wide ? "h-14 rounded-md" : "h-26 rounded-md"} />
      ))}
    </div>
  );
}

/**
 * Помилка даних: блок помилки без цін і рядок «Ваші обрані збережені» (AC-8.6).
 * @param {{kind: 'src' | 'net' | 'stale', onRetry: () => void, retrying: boolean, retryFailed: boolean}} props
 * @returns {import('react').ReactElement}
 */
export function ListError({ kind, onRetry, retrying, retryFailed }) {
  const count = useFavorites().ids.length;
  const kept =
    count === 0
      ? "Ваші обрані збережені й нікуди не зникли."
      : `Ваші обрані збережені: ${pluralCoins(count, "nom")}.`;
  return (
    <>
      <ErrorBlock kind={kind} onRetry={onRetry} retrying={retrying} retryFailed={retryFailed} />
      <p className="text-sm leading-5 text-ink-muted">{kept}</p>
    </>
  );
}
