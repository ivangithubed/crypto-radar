import { useEffect, useRef } from "react";
import { useFavorites } from "../../favorites/index.js";
import { TermHint } from "../../glossary/index.js";
import { PAGE_SIZE, SORT_LABELS, normalizeQuery, searchCoins } from "../../lib/index.js";
import { useStablecoinIds } from "../../market-data/index.js";
import { Button, StatusMessage } from "../../ui/index.js";
import { CoinCards } from "./CoinCards.jsx";
import { CoinTable } from "./CoinTable.jsx";
import { SearchStatus } from "./SearchStatus.jsx";
import { useDebounced } from "./useCoinListView.js";

const STORE_ERROR =
  "Не вдалося зберегти обрані: браузер не дозволяє зберігати дані сайту (наприклад, у приватному режимі). Обрані діятимуть до закриття вкладки.";

const TERMS = [
  ["rank", "Місце"],
  ["ticker", "Тікер"],
  ["change7d", "Зміна за 7 днів"],
  ["marketCap", "Капіталізація"],
];

function TermsRow() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
      {TERMS.map(([term, label]) => (
        <span key={term} className="inline-flex items-center gap-1">
          {label} <TermHint term={term} />
        </span>
      ))}
    </div>
  );
}

/** Після «Показати більше» фокус іде на посилання першої нової монети. */
function useFocusAfterMore(pendingRef, shownCount) {
  useEffect(() => {
    const id = pendingRef.current;
    if (id === null) return;
    pendingRef.current = null;
    document.querySelector(`a[data-coin-id="${CSS.escape(id)}"]`)?.focus();
  }, [pendingRef, shownCount]);
}

/**
 * Стан Data екрана S-1: список (картки або таблиця), «Показати більше», живі області.
 * Панель пошуку й сортування та стан перегляду живуть у `CoinListPage` (спільні з Loading).
 * @param {{coins: import('../../lib/index.js').Coin[], wide: boolean, view: ReturnType<typeof import('./useCoinListView.js').useCoinListView>, announce: string, onAnnounce: (text: string) => void}} props
 * @returns {import('react').ReactElement}
 */
export function LoadedList({ coins, wide, view, announce, onAnnounce }) {
  const stableIds = useStablecoinIds();
  const favorites = useFavorites();
  const pendingFocus = useRef(null);
  const settled = useDebounced(view.query);
  useFocusAfterMore(pendingFocus, view.items.length);

  const foundCount = normalizeQuery(settled) === "" ? null : searchCoins(coins, settled).length;
  const top50Ids = new Set(coins.map((coin) => coin.id));
  const toggle = (coin) => {
    if (favorites.has(coin.id)) {
      favorites.remove(coin.id);
      onAnnounce(`${coin.name} прибрано з обраних`);
    } else {
      favorites.add(coin.id, top50Ids);
      onAnnounce(`${coin.name} додано в обрані`);
    }
  };
  const more = () => {
    pendingFocus.current = view.nextFocusId;
    onAnnounce(`Показано ${view.items.length + PAGE_SIZE} з ${view.total}`);
    view.showMore();
  };

  const status = view.searching
    ? `Знайдено ${view.matches}`
    : `Показано ${view.items.length} з ${view.total}`;
  const shared = { coins: view.items, stableIds, isFavorite: favorites.has, onToggle: toggle };
  return (
    <>
      <SearchStatus
        empty={view.searching && view.matches === 0}
        foundCount={foundCount}
        onClear={() => view.changeQuery("")}
      />
      {view.items.length === 0 ? null : (
        <>
          {wide ? null : <TermsRow />}
          {wide ? (
            <CoinTable
              {...shared}
              caption={`Топ-50 монет, упорядковано: ${SORT_LABELS[view.sort].toLocaleLowerCase("uk")}. ${status}.`}
            />
          ) : (
            <CoinCards {...shared} label={`Монети, ${view.items.length} з ${view.total}`} />
          )}
        </>
      )}
      {view.canShowMore ? (
        <Button variant="secondary" className="w-full md:mx-auto md:w-auto" onClick={more}>
          Показати більше
        </Button>
      ) : null}
      <StatusMessage className="sr-only">{announce}</StatusMessage>
      <StatusMessage className="text-sm leading-5 text-ink">
        {favorites.storeError === null ? null : STORE_ERROR}
      </StatusMessage>
    </>
  );
}
