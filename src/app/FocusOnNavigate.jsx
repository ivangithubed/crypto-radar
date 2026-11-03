import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

const LIST_PATH = "/";
const COIN_PATH = "/coin/";

/** Елемент у межах екрана після прокрутки (межа — `clientHeight`, L-007). */
function inViewport(element) {
  const { top, bottom } = element.getBoundingClientRect();
  return top >= 0 && bottom <= document.documentElement.clientHeight;
}

/**
 * Фокус без прокрутки: прокрутку задає FocusOnNavigate, а не focus(), інакше повернення до списку стрибає.
 * Після повернення до списку — на посилання монети, з якої повернулись, якщо воно на екрані (TD-023, TD-025), інакше на h1.
 * @param {string} fromCoinId монета, з якої повернулись, або ""
 */
function focusTarget(fromCoinId) {
  const href = `#${COIN_PATH}${fromCoinId}`;
  const link =
    fromCoinId &&
    [...document.querySelectorAll("#main a")].find((a) => a.getAttribute("href") === href);
  const target = link && inViewport(link) ? link : document.querySelector("#main h1");
  if (!target) return false;
  target.focus({ preventScroll: true });
  return true;
}

/** Маршрут з адреси: під час переходу адреса вже нова, тож прокрутка, що його супроводжує, списку не перезапише. */
function currentPath() {
  return window.location.hash.slice(1) || LIST_PATH;
}

/** Остання позиція прокрутки списку (у межах вкладки, як стан списку BUG-002). */
function useListScroll() {
  const listScroll = useRef(0);
  useEffect(() => {
    // Прокрутку після переходу задаємо самі: відновлення браузера на «Назад» могло б перезаписати позицію списку.
    window.history.scrollRestoration = "manual";
    const onScroll = () => {
      if (currentPath() === LIST_PATH) listScroll.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return listScroll;
}

/**
 * Після зміни маршруту фокус на h1 нового екрана (UX §6, 2.4.3) без прокрутки до нього, а після повернення
 * зі сторінки монети до списку — на посилання цієї монети, якщо воно на екрані (TD-023, TD-025); список повертається на збережену позицію,
 * інші екрани — на початок. Перше відкриття сторінки фокус не забирає.
 * Якщо h1 ще немає (скелетон S-2), чекаємо його появи, але не відбираємо фокус, який відвідувач уже поставив.
 */
export function FocusOnNavigate() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  const listScroll = useListScroll();
  useEffect(() => {
    if (previous.current === pathname) return undefined;
    // Лише повернення до списку (рішення власника 2026-11-04, TD-023); інші екрани — фокус на h1.
    const fromCoinId =
      pathname === LIST_PATH && previous.current.startsWith(COIN_PATH)
        ? previous.current.slice(COIN_PATH.length)
        : "";
    previous.current = pathname;
    window.scrollTo(0, pathname === LIST_PATH ? listScroll.current : 0);
    if (focusTarget(fromCoinId)) return undefined;
    const main = document.getElementById("main");
    if (!main) return undefined;
    const observer = new MutationObserver(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        observer.disconnect();
      } else if (focusTarget(fromCoinId)) {
        observer.disconnect();
      }
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, listScroll]);
  return null;
}
