import { Skeleton, StatusMessage } from "../../ui/index.js";

/**
 * Стан Loading (UX §3 S-2): скелетон у розмір сторінки (CLS) і `role="status"` `loading.coin`; цін немає.
 * @returns {import('react').ReactElement}
 */
export function CoinLoading() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-[30px] w-48" />
      </div>
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-6">
        <div className="grid gap-2 rounded-md border border-line bg-surface-raised p-4">
          <Skeleton className="h-[34px] w-40 md:h-[38px]" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="aspect-[5/2] w-full" />
        </div>
        <Skeleton className="h-52 w-full" />
      </div>
      <StatusMessage className="m-0 text-ink-muted">Завантажуємо дані монети…</StatusMessage>
    </div>
  );
}
