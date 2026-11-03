const EDGE = 16;

/**
 * Зсув панелі відносно лівого краю кнопки, щоб вона лишалась у [EDGE, viewportWidth − EDGE].
 * @param {number} buttonLeft ліва межа кнопки у вікні
 * @param {number} panelWidth ширина панелі
 * @param {number} viewportWidth ширина вікна
 * @returns {number}
 */
export function computeHintOffset(buttonLeft, panelWidth, viewportWidth) {
  const maxLeft = viewportWidth - EDGE - panelWidth;
  const left = Math.max(EDGE, Math.min(buttonLeft, maxLeft));
  return left - buttonLeft;
}

/**
 * Реальна ширина сторінки без переповнення (на телефоні innerWidth і 100vw розширюються разом із ним).
 * @returns {number}
 */
export function getPageWidth() {
  return document.documentElement.clientWidth || window.innerWidth;
}

/**
 * Максимальна ширина панелі в пікселях: min(320, ширина сторінки − 2 × 16).
 * @param {number} pageWidth ширина сторінки
 * @returns {number}
 */
export function computeHintMaxWidth(pageWidth) {
  return Math.min(320, pageWidth - 2 * EDGE);
}
