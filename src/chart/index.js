// Публічний інтерфейс модуля chart (архітектура §5, UX §3 S-2): графік ціни за 7 днів.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатура не змінюється, реалізацію дає хвиля 2.
import "../lib/index.js";

/**
 * SVG-лінія з `viewBox` і `aria-hidden="true"` плюс `<p>` з текстовою альтернативою `coin.chart.alt` (UX §5.2):
 * ціна на початку й у кінці періоду, мінімум і максимум (NFR-6).
 * @param {{prices: number[]}} props щонайменше 2 точки (P-8)
 * @returns {import('react').ReactElement | null}
 */
export function PriceChart7d(props) {
  void props;
  return null;
}
