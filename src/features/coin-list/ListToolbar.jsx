import { useRef } from "react";
import { QUERY_MAX_LENGTH, SORT_KEYS, SORT_LABELS } from "../../lib/index.js";

const FIELD = "flex min-w-0 flex-[1_1_220px] flex-col gap-1";
const LABEL = "text-sm leading-5 text-ink-muted";
const CONTROL =
  "min-h-11 w-full rounded-sm border border-line-strong bg-surface-raised py-2 pl-3 text-base leading-6 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Панель пошуку (`type="search"`, × «Очистити пошук») і сортування (нативний select).
 * @param {{query: string, onQuery: (value: string) => void, sort: string, onSort: (key: string) => void}} props
 * @returns {import('react').ReactElement}
 */
export function ListToolbar({ query, onQuery, sort, onSort }) {
  const inputRef = useRef(null);
  return (
    <div className="flex max-w-190 flex-wrap gap-x-4 gap-y-3">
      <div className={FIELD}>
        <label htmlFor="coin-search" className={LABEL}>
          Пошук монети
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="coin-search"
            type="search"
            maxLength={QUERY_MAX_LENGTH}
            autoComplete="off"
            placeholder="Назва або тікер, напр. btc"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            className={`${CONTROL} pr-10`}
          />
          {query === "" ? null : (
            <button
              type="button"
              aria-label="Очистити пошук"
              onClick={() => {
                onQuery("");
                inputRef.current?.focus();
              }}
              className="absolute top-1.5 right-1.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-xl text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      </div>
      <div className={FIELD}>
        <label htmlFor="coin-sort" className={LABEL}>
          Сортування
        </label>
        <select
          id="coin-sort"
          value={sort}
          onChange={(event) => onSort(event.target.value)}
          className={`${CONTROL} pr-3`}
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
