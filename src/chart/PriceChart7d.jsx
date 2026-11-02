import { formatPrice } from "../lib/index.js";

const WIDTH = 600;
const HEIGHT = 240;
const PAD_X = 8;
const PAD_Y = 24;
const GRID_Y = [HEIGHT * 0.33, HEIGHT * 0.66];

/**
 * @param {number[]} prices
 * @param {number} min
 * @param {number} max
 * @returns {string[]} пари "x,y" для SVG
 */
function toPoints(prices, min, max) {
  const span = max - min;
  const stepX = (WIDTH - PAD_X * 2) / (prices.length - 1);
  return prices.map((price, i) => {
    const ratio = span === 0 ? 0.5 : (price - min) / span;
    const x = PAD_X + i * stepX;
    const y = HEIGHT - PAD_Y - ratio * (HEIGHT - PAD_Y * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
}

/**
 * Текстова альтернатива `coin.chart.alt` (UX §5.2, NFR-6).
 * @param {number[]} prices
 * @param {number} min
 * @param {number} max
 * @returns {string}
 */
function altText(prices, min, max) {
  const start = formatPrice(prices[0]);
  const end = formatPrice(prices[prices.length - 1]);
  return `Ціна за 7 днів: на початку ${start}, наприкінці ${end}, мінімум ${formatPrice(min)}, максимум ${formatPrice(max)}.`;
}

/**
 * Лінійний графік ціни за 7 днів (чистий SVG) з текстовою альтернативою.
 * @param {{prices: number[]}} props щонайменше 2 точки (P-8)
 * @returns {import('react').ReactElement | null}
 */
export function PriceChart7d({ prices }) {
  if (!Array.isArray(prices) || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const points = toPoints(prices, min, max);
  const last = points[points.length - 1].split(",");
  const first = points[0].split(",");
  const area = `${first[0]},${HEIGHT - PAD_Y} ${points.join(" ")} ${last[0]},${HEIGHT - PAD_Y}`;
  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden="true"
        focusable="false"
        className="block w-full h-auto"
      >
        {GRID_Y.map((y) => (
          <line
            key={y}
            x1="0"
            x2={WIDTH}
            y1={y}
            y2={y}
            className="stroke-line"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon points={area} className="fill-brand-soft" />
        <polyline
          points={points.join(" ")}
          fill="none"
          className="stroke-brand stroke-2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last[0]} cy={last[1]} r="4" className="fill-brand" />
      </svg>
      <p className="text-sm text-ink-muted">{altText(prices, min, max)}</p>
    </div>
  );
}
