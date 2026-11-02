// Чисті функції екрана «Обрані»: розбиття id на «у топ-50» і «вибулі», тексти (UX §5.2).

/**
 * Обрані в топ-50 за місцем у рейтингу (AC-6.7) і вибулі в порядку додавання (P-1).
 * @param {string[]} ids
 * @param {import('../../lib/index.js').Coin[]} coins
 * @returns {{ranked: import('../../lib/index.js').Coin[], out: string[]}}
 */
export function splitFavorites(ids, coins) {
  const byId = new Map(coins.map((coin) => [coin.id, coin]));
  const ranked = ids
    .filter((id) => byId.has(id))
    .map((id) => byId.get(id))
    .sort((a, b) => a.rank - b.rank);
  const out = ids.filter((id) => !byId.has(id));
  return { ranked, out };
}

export const TEXTS = {
  title: "Обрані",
  emptyTitle: "Тут поки порожньо",
  emptyText:
    "Натисніть кнопку «Додати в обрані» (☆) біля монети у списку або на її сторінці — монета з'явиться тут. Акаунт не потрібен: обрані зберігаються в цьому браузері.",
  emptyCta: "Перейти до топ-50",
  outOfTop: "Зараз поза топ-50 — ціни не показуємо",
  loading: "Завантажуємо ціни…",
  writeFail:
    "Не вдалося зберегти обрані: браузер не дозволяє зберігати дані сайту (наприклад, у приватному режимі). Обрані діятимуть до закриття вкладки.",
  readFail: "Не вдалося прочитати обрані: браузер не дозволяє зберігати дані сайту.",
  safariTitle: "Щоб обрані не зникли в Safari",
  safariText:
    "Safari стирає дані сайту, якщо ви не відкривали його 7 днів. Додайте Крипто-Радар на головний екран: Поділитися → «На початковий екран». Обрані, додані тут у Safari, на головний екран не переносяться — додайте їх там заново.",
  safariClose: "Закрити пораду",
};

/** @param {string} label */
export const removeLabel = (label) => `Прибрати з обраних: ${label}`;
