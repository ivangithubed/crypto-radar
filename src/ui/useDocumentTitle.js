import { useEffect } from "react";

/**
 * Заголовок вкладки браузера (UX §1).
 * @param {string} title
 * @returns {void}
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
