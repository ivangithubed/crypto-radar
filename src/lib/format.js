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
  return `$${formatNumber(usd, priceDigits(usd))}`;
}

function priceDigits(usd) {
  return usd > 0 && usd < SMALL_PRICE_LIMIT ? smallPriceDigits(usd) : 2;
}

/**
 * Ціна з точністю показу (для сортування за видимим значенням, US-2 правило 4).
 * @param {number} usd
 * @returns {number}
 */
export function shownPrice(usd) {
  return Number(usd.toFixed(priceDigits(usd)));
}

/** Десяті частки відсотка за модулем: округлення половиною від нуля. */
function changeTenths(pct) {
  return Math.round(Math.abs(pct) * 10);
}

/**
 * Зміна за 7 днів з точністю показу, 0,1 % (для сортування за видимим значенням); «0,0 %» → 0.
 * @param {number} pct не `null`: монети без зміни сортування ставить у кінець (sort.js)
 * @returns {number}
 */
export function shownChange(pct) {
  const tenths = changeTenths(pct);
  if (tenths === 0 || Number.isNaN(tenths)) return 0;
  return (Math.sign(pct) * tenths) / 10;
}

/**
 * Зміна за 7 днів: видимий текст, напрям і текст для зчитувача (UX §5.2 `change.*`, §5.3, AC-1.5);
 * `null` — «—» і «немає даних» (BUG-003).
 * @param {number | null} pct
 * @returns {{text: string, direction: 'up' | 'down' | 'flat', spoken: string}}
 */
export function formatChange(pct) {
  if (pct === null) return { text: "—", direction: "flat", spoken: "немає даних" };
  const tenths = changeTenths(pct);
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
 * Капіталізація з точністю показу (для сортування за видимим значенням).
 * @param {number} usd
 * @returns {number}
 */
export function shownMarketCap(usd) {
  const step = CAP_UNITS.find(({ from }) => usd >= from);
  if (!step) return Number(usd.toFixed(0));
  return Number((usd / step.from).toFixed(step.digits)) * step.from;
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
