import { Link } from "react-router";
import { CoinHeader } from "./CoinHeader.jsx";
import { FavoriteStatus } from "./FavoriteStatus.jsx";
import { FavoriteToggle } from "./FavoriteToggle.jsx";

/**
 * Стан «Поза топ-50» (UX §3 S-2, `coin.out.*`, AC-4.3, AC-5.5): без цін і графіка; кнопки «Додати…» немає,
 * лише «Прибрати з обраних», якщо монета в обраних (ім'я — з id, P-1).
 * @param {{id: string, favorite: ReturnType<typeof import('./useCoinFavorite.js').useCoinFavorite>,
 *   h1Ref: import('react').RefObject<HTMLHeadingElement | null>}} props
 * @returns {import('react').ReactElement}
 */
export function OutOfTop({ id, favorite, h1Ref }) {
  const remove = () => {
    favorite.toggle();
    // Кнопка зникає після прибирання — фокус переходить на заголовок.
    h1Ref.current?.focus();
  };
  return (
    <>
      <CoinHeader name="Монета зараз поза топ-50" h1Ref={h1Ref} />
      <section className="grid gap-3 rounded-md border border-line bg-surface-raised p-4">
        <div role="status" className="grid gap-3">
          <h2 className="m-0 font-sans text-lg leading-6 font-semibold">
            Даних про цю монету немає
          </h2>
          <p className="m-0">
            Крипто-Радар показує лише 50 найбільших монет за капіталізацією. Ця монета зараз нижче
            50-го місця, тому ціни й графіка тут немає.
          </p>
          <p className="m-0 text-sm text-ink-muted">
            Якщо вона в обраних, ви можете її прибрати. Додати її в обрані зараз не можна.
          </p>
        </div>
        {favorite.isFav ? (
          <div>
            <FavoriteToggle isFav name={id} onToggle={remove} alwaysText />
          </div>
        ) : null}
      </section>
      <FavoriteStatus status={favorite.status} writeFailed={favorite.writeFailed} />
      <Link
        to="/"
        className="inline-flex min-h-11 items-center justify-center self-start rounded-sm bg-brand px-4 py-2.5 font-sans text-base leading-6 font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Відкрити топ-50
      </Link>
    </>
  );
}
