import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

function focusHeading() {
  const heading = document.querySelector("#main h1");
  if (!heading) return false;
  heading.focus();
  return true;
}

/**
 * Після зміни маршруту фокус на h1 нового екрана (UX §4, 2.4.3). Перше відкриття сторінки фокус не забирає.
 * Якщо h1 ще немає (скелетон S-2), чекаємо його появи, але не відбираємо фокус, який відвідувач уже поставив.
 */
export function FocusOnNavigate() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return undefined;
    previous.current = pathname;
    if (focusHeading()) return undefined;
    const main = document.getElementById("main");
    if (!main) return undefined;
    const observer = new MutationObserver(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        observer.disconnect();
      } else if (focusHeading()) {
        observer.disconnect();
      }
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
