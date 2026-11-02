import { useEffect, useRef, useState } from "react";
import { formatPriceTime } from "../../lib/index.js";
import { useTopCoins } from "../../market-data/index.js";
import { StatusMessage, useDocumentTitle, useMediaQuery } from "../../ui/index.js";
import { ListError, ListSkeleton } from "./ListStates.jsx";
import { LoadedList } from "./LoadedList.jsx";

/** Після успішного «Спробувати ще раз» фокус повертається на h1 (UX §3 S-1 Error → Data). */
function useFocusAfterRecovery(status, ref) {
  const previous = useRef(status);
  useEffect(() => {
    if (previous.current === "error" && status === "fresh") ref.current?.focus();
    previous.current = status;
  }, [status, ref]);
}

function PricesMeta({ status, pricesAt, wide }) {
  if (status === "loading") {
    return (
      <StatusMessage className="text-sm leading-5 text-ink-muted">Завантажуємо ціни…</StatusMessage>
    );
  }
  if (status !== "fresh" || pricesAt === null) return null;
  const refresh = wide ? " · оновлюються щохвилини" : "";
  return (
    <p className="text-sm leading-5 text-ink-muted">
      Ціни на {formatPriceTime(pricesAt)}
      {refresh}
    </p>
  );
}

/**
 * Під час ручного повтору хук віддає `loading`: блок помилки лишається (кнопка «Завантажуємо…»), а не скелетон.
 * @param {import('../../lib/index.js').TopCoinsState} top
 */
function useScreenState(top) {
  const [lastKind, setLastKind] = useState("src");
  if (top.errorKind !== null && top.errorKind !== lastKind) setLastKind(top.errorKind);
  const retryingError = top.status === "loading" && top.retrying;
  return { status: retryingError ? "error" : top.status, kind: top.errorKind ?? lastKind };
}

/**
 * Екран S-1 «Список монет» (`#/`): стани Loading, Data, Empty (пошук), Error, Partial, Error (сховище).
 * Рендерить лише вміст усередині `<main>`, починаючи з `<h1>`.
 * @returns {import('react').ReactElement}
 */
export function CoinListPage() {
  useDocumentTitle("Топ-50 монет — Крипто-Радар");
  const top = useTopCoins();
  const wide = useMediaQuery("(min-width: 768px)");
  const h1Ref = useRef(null);
  const { status, kind } = useScreenState(top);
  useFocusAfterRecovery(status, h1Ref);

  return (
    <div className="flex flex-col gap-4" aria-busy={status === "loading" ? "true" : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="font-display text-xl leading-6.5 font-semibold text-ink outline-none"
        >
          Топ-50 монет
        </h1>
        <PricesMeta status={status} pricesAt={top.pricesAt} wide={wide} />
      </div>
      {status === "loading" ? <ListSkeleton wide={wide} /> : null}
      {status === "error" ? (
        <ListError
          kind={kind}
          onRetry={top.retry}
          retrying={top.retrying}
          retryFailed={top.retryFailed}
        />
      ) : null}
      {status === "fresh" ? <LoadedList coins={top.coins} wide={wide} /> : null}
    </div>
  );
}
