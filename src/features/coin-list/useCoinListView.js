import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import {
  PAGE_SIZE,
  QUERY_MAX_LENGTH,
  normalizeQuery,
  searchCoins,
  sortCoins,
} from "../../lib/index.js";

const SEARCH_PAUSE_MS = 300;

function sameIds(a, b) {
  return a.length === b.length && a.every((coin, i) => coin.id === b[i].id);
}

/**
 * Значення, що наздоганяє `value` після паузи (UX §3 S-1: статус пошуку після 300 мс).
 * @param {string} value
 * @returns {string}
 */
export function useDebounced(value) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

const ViewStateContext = createContext(null);

function useViewState() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("price");
  const [shown, setShown] = useState(PAGE_SIZE);
  return { query, setQuery, sort, setSort, shown, setShown };
}

/**
 * Тримає запит, сортування й «показано» вище за екрани (UX §1 «Стан у межах вкладки»): повернення зі
 * сторінки монети відновлює список; новий візит (перезавантаження, новий App) починає з типового.
 * @param {{children?: import('react').ReactNode}} props
 */
export function CoinListViewProvider({ children }) {
  return createElement(ViewStateContext.Provider, { value: useViewState() }, children);
}

/**
 * Стан перегляду списку в пам'яті (AC-2.5: не зберігається між візитами): запит, сортування, показано.
 * Порядок рядків не змінюється при фоновому оновленні цін: перебудова лише при дії відвідувача
 * або зміні складу топ-50 (UX §3 S-1 «Data (фонове оновлення)»).
 * @param {import('../../lib/index.js').Coin[]} coins
 */
export function useCoinListView(coins) {
  const local = useViewState();
  const { query, setQuery, sort, setSort, shown, setShown } = useContext(ViewStateContext) ?? local;
  const [base, setBase] = useState(coins);
  if (base !== coins && !sameIds(base, coins)) setBase(coins);

  const ordered = useMemo(() => sortCoins(searchCoins(base, query), sort), [base, query, sort]);
  const all = useMemo(() => {
    const fresh = new Map(coins.map((coin) => [coin.id, coin]));
    return ordered.map((coin) => fresh.get(coin.id) ?? coin);
  }, [ordered, coins]);

  const searching = normalizeQuery(query) !== "";
  const items = searching ? all : all.slice(0, shown);

  const changeQuery = (value) => {
    setQuery(value.slice(0, QUERY_MAX_LENGTH));
    setShown(PAGE_SIZE);
    setBase(coins);
  };
  const changeSort = (key) => {
    setSort(key);
    setShown(PAGE_SIZE);
    setBase(coins);
  };
  const showMore = () => setShown((count) => count + PAGE_SIZE);

  return {
    query,
    sort,
    items,
    total: coins.length,
    matches: all.length,
    searching,
    canShowMore: !searching && shown < all.length,
    changeQuery,
    changeSort,
    showMore,
    nextFocusId: all[shown]?.id ?? null,
  };
}
