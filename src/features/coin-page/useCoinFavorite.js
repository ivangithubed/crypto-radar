import { useCallback, useState } from "react";
import { useFavorites } from "../../favorites/index.js";

/**
 * ★ на сторінці монети: стан обраного, дія та текст статусу `fav.added` / `fav.removed` (UX §5.2).
 * @param {string} id ідентифікатор монети
 * @param {string} name назва для оголошень (поза топ-50 — сам id, P-1)
 * @param {Set<string>} top50Ids монети топ-50 (AC-5.5: додати можна лише їх)
 * @returns {{isFav: boolean, toggle: () => void, status: string, writeFailed: boolean}}
 */
export function useCoinFavorite(id, name, top50Ids) {
  const { add, remove, has, storeError } = useFavorites();
  const [status, setStatus] = useState("");
  const isFav = has(id);
  const toggle = useCallback(() => {
    if (isFav) {
      remove(id);
      setStatus(`${name} прибрано з обраних`);
    } else {
      add(id, top50Ids);
      setStatus(`${name} додано в обрані`);
    }
  }, [isFav, id, name, add, remove, top50Ids]);
  return { isFav, toggle, status, writeFailed: storeError === "write" };
}
