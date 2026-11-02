// Форматування чисел за UX §5.3. Тисячі розділяє U+00A0, десятковий роздільник — кома.

const NBSP = " ";
const MINUS = "−";
const SMALL_PRICE_LIMIT = 0.1;
const SIGNIFICANT_DIGITS = 4;
const MAX_FRACTION_DIGITS = 20;

/** @param {string} integerPart цифри без знака */
function groupThousands(integerPart) {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/**
 * @param {number} value невід'ємне число
 * @param {number} digits знаків після коми
 */
function formatNumber(value, digits) {
  const [integerPart, fraction] = value.toFixed(digits).split(".");
  const grouped = groupThousands(integerPart);
  return fraction ? `${grouped},${fraction}` : grouped;
}

/** Кількість знаків після коми для 4 значущих цифр числа < 0,1. */
function smallPriceDigits(usd) {
  const magnitude = Math.floor(Math.log10(usd));
  return Math.min(MAX_FRACTION_DIGITS, SIGNIFICANT_DIGITS - 1 - magnitude);
}

/**
 * Ціна в доларах за UX §5.3 (`$67 250,10`).
 * @param {number} usd
 * @returns {string}
 */
export function formatPrice(usd) {
  const digits = usd > 0 && usd < SMALL_PRICE_LIMIT ? smallPriceDigits(usd) : 2;
  return `$${formatNumber(usd, digits)}`;
}

/**
 * Зміна за 7 днів: видимий текст, напрям і текст для зчитувача (UX §5.2 `change.*`, §5.3, AC-1.5).
 * @param {number} pct
 * @returns {{text: string, direction: 'up' | 'down' | 'flat', spoken: string}}
 */
export function formatChange(pct) {
  // Округлення до 0,1 половиною від нуля; знак визначається після округлення.
  const tenths = Math.round(Math.abs(pct) * 10);
  const shown = formatNumber(tenths / 10, 1);
  if (tenths === 0 || Number.isNaN(tenths)) {
    return { text: "0,0 %", direction: "flat", spoken: "без змін" };
  }
  if (pct > 0) {
    return { text: `+${shown} %`, direction: "up", spoken: `зростання на ${shown} %` };
  }
  return { text: `${MINUS}${shown} %`, direction: "down", spoken: `падіння на ${shown} %` };
}

const CAP_UNITS = [
  { from: 1e12, digits: 2, unit: "трлн" },
  { from: 1e9, digits: 1, unit: "млрд" },
  { from: 1e6, digits: 1, unit: "млн" },
];

/**
 * Капіталізація за UX §5.3 (`$1,32 трлн`).
 * @param {number} usd
 * @returns {string}
 */
export function formatMarketCap(usd) {
  const step = CAP_UNITS.find(({ from }) => usd >= from);
  if (!step) return `$${formatNumber(usd, 0)}`;
  return `$${formatNumber(usd / step.from, step.digits)} ${step.unit}`;
}

/**
 * Час цін у 24-годинному форматі за часом пристрою (`14:32`, UX §5.2 `prices.time`).
 * @param {Date} date
 * @returns {string}
 */
export function formatPriceTime(date) {
  const two = (n) => String(n).padStart(2, "0");
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}
