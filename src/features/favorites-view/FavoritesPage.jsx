import { useEffect, useRef, useState } from "react";
import { useFavorites, useSafariHint } from "../../favorites/index.js";
import { formatPriceTime, pluralCoins } from "../../lib/index.js";
import { useTopCoins } from "../../market-data/index.js";
import { ErrorBlock, StatusMessage, useDocumentTitle } from "../../ui/index.js";
import { FavoriteCard, OutOfTopCard } from "./FavoriteCard.jsx";
import { EmptyBlock, LoadingCards, SafariHintBlock } from "./FavoritesBlocks.jsx";
import { splitFavorites, TEXTS } from "./model.js";

/** Фокус після прибирання: ★ наступної (інакше попередньої) монети або h1 (UX S-3 Data). */
function focusAfterRemove(list, id) {
  const stars = Array.from(list?.querySelectorAll("[data-star-id]") ?? []);
  const index = stars.findIndex((star) => star.dataset.starId === id);
  const next = stars[index + 1] ?? stars[index - 1];
  return next ? next.dataset.starId : null;
}

function statusText({ removed, storeError, loading }) {
  if (loading) return TEXTS.loading;
  return storeError === "write" ? TEXTS.writeFail : removed;
}

function keptText(count) {
  return count > 0
    ? `Ваші обрані збережені: ${pluralCoins(count, "nom")}.`
    : "Ваші обрані збережені й нікуди не зникли.";
}

/** Фокус і статус дій: фокус на h1 після успішного повтору, після прибирання — за `focusAfterRemove`. */
function useRemoveAndRetry({ top, ids, remove, headingRef, listRef }) {
  const retried = useRef(false);
  const pendingFocus = useRef(undefined);
  const [removed, setRemoved] = useState("");

  useEffect(() => {
    if (top.status === "fresh" && retried.current) {
      retried.current = false;
      headingRef.current?.focus();
    }
  }, [top.status, headingRef]);

  useEffect(() => {
    if (pendingFocus.current === undefined) return;
    const target = pendingFocus.current;
    pendingFocus.current = undefined;
    const star = target && listRef.current?.querySelector(`[data-star-id="${CSS.escape(target)}"]`);
    (star || headingRef.current)?.focus();
  }, [ids, headingRef, listRef]);

  const onRemove = (id) => {
    const coin = top.coins.find((item) => item.id === id);
    pendingFocus.current = focusAfterRemove(listRef.current, id);
    setRemoved(`${coin?.name ?? id} прибрано з обраних`);
    remove(id);
  };
  const onRetry = () => {
    retried.current = true;
    top.retry();
  };
  return { removed, onRemove, onRetry };
}

function PricesTime({ top }) {
  if (top.status !== "fresh" || !top.pricesAt) return null;
  return <p className="m-0 text-sm text-ink-muted">Ціни на {formatPriceTime(top.pricesAt)}</p>;
}

function ErrorWithKept({ top, count, onRetry }) {
  return (
    <>
      <ErrorBlock
        kind={top.errorKind}
        onRetry={onRetry}
        retrying={top.retrying}
        retryFailed={top.retryFailed}
      />
      <p className="m-0 text-ink">{keptText(count)}</p>
    </>
  );
}

/** @returns {import('react').ReactElement} */
export function FavoritesPage() {
  useDocumentTitle("Обрані — Крипто-Радар");
  const { ids, remove, storeError } = useFavorites();
  const top = useTopCoins();
  const hint = useSafariHint();
  const headingRef = useRef(null);
  const listRef = useRef(null);
  const {
    removed,
    onRemove: handleRemove,
    onRetry: handleRetry,
  } = useRemoveAndRetry({
    top,
    ids,
    remove,
    headingRef,
    listRef,
  });

  const empty = ids.length === 0;
  const loading = !empty && top.status === "loading";
  const status = statusText({ removed, storeError, loading });
  const { ranked, out } = splitFavorites(ids, top.coins);

  return (
    <div className="grid gap-4" aria-busy={loading ? "true" : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="m-0 font-display text-xl leading-[26px] font-semibold"
        >
          {TEXTS.title}
        </h1>
        {empty ? null : <PricesTime top={top} />}
      </div>
      {hint.visible && !empty ? <SafariHintBlock onDismiss={hint.dismiss} /> : null}
      {empty ? <EmptyBlock readFailed={storeError === "read"} /> : null}
      {hint.visible && empty ? <SafariHintBlock onDismiss={hint.dismiss} /> : null}
      {loading ? <LoadingCards count={ids.length} /> : null}
      {!empty && top.status === "error" ? (
        <ErrorWithKept top={top} count={ids.length} onRetry={handleRetry} />
      ) : null}
      {!empty && top.status === "fresh" ? (
        <ol
          ref={listRef}
          aria-label={`Обрані монети, ${ids.length}`}
          className="m-0 grid list-none gap-2 p-0"
        >
          {ranked.map((coin) => (
            <FavoriteCard key={coin.id} coin={coin} onRemove={handleRemove} />
          ))}
          {out.map((id) => (
            <OutOfTopCard key={id} id={id} onRemove={handleRemove} />
          ))}
        </ol>
      ) : null}
      <StatusMessage className="text-ink">{status}</StatusMessage>
    </div>
  );
}
