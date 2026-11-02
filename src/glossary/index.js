// Публічний інтерфейс модуля glossary (архітектура §5, UX §5.1): тексти 6 підказок і компонент TermHint.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури не змінюються, реалізацію дає хвиля 2.
import "../ui/index.js";

/** @typedef {'marketCap' | 'change7d' | 'ticker' | 'rank' | 'stablecoin' | 'volatility'} TermKey */

/** @type {TermKey[]} */
export const TERM_KEYS = ["marketCap", "change7d", "ticker", "rank", "stablecoin", "volatility"];

/** Назви термінів — дослівно UX §5.1, стовпець «Термін». @type {Record<TermKey, string>} */
export const TERM_LABELS = {
  marketCap: "Капіталізація",
  change7d: "Зміна за 7 днів",
  ticker: "Тікер",
  rank: "Місце в рейтингу",
  stablecoin: "Стейблкоїн",
  volatility: "Волатильність",
};

/** Тексти підказок — дослівно UX §5.1, ключі `hint.*`. @type {Record<TermKey, string>} */
export const HINT_TEXTS = {
  marketCap:
    "Скільки коштують усі монети цього виду разом: ціна однієї монети, помножена на кількість монет в обігу. Чим більша капіталізація, тим вище монета в рейтингу.",
  change7d:
    "На скільки відсотків ціна монети зараз вища (+) або нижча (−), ніж рівно тиждень тому.",
  ticker:
    "Коротке позначення монети з кількох латинських літер, як у акцій на біржі. Наприклад, BTC — це Bitcoin.",
  rank: "Номер монети серед усіх криптовалют за капіталізацією. Bitcoin має місце 1, бо він найбільший.",
  stablecoin:
    "Монета, ціна якої прив'язана до звичайної валюти, найчастіше до долара США. Тому її ціна майже не змінюється — близько $1.",
  volatility:
    "Наскільки сильно й часто стрибає ціна. Що більше різких злетів і падінь на графіку, то вища волатильність і ризик.",
};

/**
 * Кнопка «?» з підказкою до терміна (TermHintButton модуля ui з текстами цього модуля).
 * @param {{term: TermKey}} props
 * @returns {import('react').ReactElement | null}
 */
export function TermHint(props) {
  void props;
  return null;
}
