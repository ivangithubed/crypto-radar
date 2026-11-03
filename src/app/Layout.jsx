import { Link, NavLink } from "react-router";
import { useFavorites } from "../favorites/index.js";
import { pluralCoins } from "../lib/index.js";

const PRIVACY_COINGECKO = "https://www.coingecko.com/en/privacy";
const ATTRIBUTION = "https://www.coingecko.com/en/api";

/** «Перейти до вмісту» (UX §5.2 `nav.skip`, WCAG 2.4.1): у HashRouter `href="#main"` змінив би маршрут, тому фокус ставимо самі. */
function SkipLink() {
  const skip = (event) => {
    event.preventDefault();
    document.getElementById("main")?.focus();
  };
  return (
    <a
      href="#main"
      onClick={skip}
      className="sr-only rounded-sm bg-brand px-4 py-2 font-semibold text-on-brand focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      Перейти до вмісту
    </a>
  );
}

const TAB =
  "rounded-full px-4 py-2 font-semibold text-ink-muted no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-[current=page]:bg-brand aria-[current=page]:text-on-brand";

/** Вкладка «Обрані · N» (UX §5.2 `nav.favorites`): для зчитувача «Обрані, N монет(и)», при 0 — «Обрані». */
function FavoritesTab() {
  const { ids } = useFavorites();
  const count = ids.length;
  return (
    <NavLink to="/favorites" className={TAB}>
      Обрані
      {count > 0 && (
        <>
          <span aria-hidden="true"> · {count}</span>
          <span className="sr-only">, {pluralCoins(count, "nom")}</span>
        </>
      )}
    </NavLink>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-6 lg:px-12">
        <Link
          to="/"
          className="mr-auto font-display text-xl font-semibold tracking-tight text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:text-[28px] md:leading-[34px]"
        >
          Крипто-Радар
        </Link>
        <nav
          aria-label="Основна навігація"
          className="order-3 flex w-full gap-1 sm:order-none sm:w-auto"
        >
          <NavLink to="/" end className={TAB}>
            Монети
          </NavLink>
          <FavoritesTab />
        </nav>
      </div>
    </header>
  );
}

/** Футер кожного екрана й стану (US-9, NFR-16, UX §5.2 `footer.*`). */
function SiteFooter() {
  return (
    <footer className="mt-8 bg-surface-sunken text-sm text-ink-muted">
      <div className="mx-auto grid max-w-screen-xl gap-1 px-4 py-4 md:px-6 lg:px-12">
        <p>
          <strong className="font-semibold text-ink">Інформація не є інвестиційною порадою.</strong>
        </p>
        <p>
          <a
            href={ATTRIBUTION}
            className="text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span lang="en">Powered by CoinGecko</span>
          </a>
        </p>
        <p className="max-w-[72ch]">
          Без cookies, аналітики й реклами. Обрані й тема зберігаються лише у вашому браузері.
          GitHub (хостинг) і{" "}
          <a
            href={PRIVACY_COINGECKO}
            className="text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            CoinGecko
          </a>{" "}
          (ціни) бачать вашу IP-адресу.
        </p>
      </div>
    </footer>
  );
}

/**
 * Спільний каркас усіх екранів (UX §1): «Перейти до вмісту», шапка з навігацією, <main id="main">, футер.
 * @param {{children?: import('react').ReactNode}} props
 */
export function Layout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface font-sans text-ink">
      <SkipLink />
      <SiteHeader />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col gap-4 px-4 pt-6 focus:outline-none md:gap-6 md:px-6 md:pt-8 lg:px-12"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
