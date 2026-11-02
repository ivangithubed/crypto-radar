// Підказка Safari «Додайте на головний екран» (ADR 0004, ADR 0006).
import { SAFARI_HINT_KEY } from "./store.js";

const NOT_SAFARI = /Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|Android/;

/** Safari / WebKit на iOS або macOS (не Chromium-, Firefox-, Edge-оболонки й не Android). */
export function isSafari() {
  const ua = navigator.userAgent ?? "";
  return ua.includes("Safari") && ua.includes("AppleWebKit") && !NOT_SAFARI.test(ua);
}

/** Сайт відкрито з головного екрана; відсутній matchMedia — не standalone. */
export function isStandalone() {
  if (navigator.standalone === true) return true;
  try {
    return typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)").matches === true
      : false;
  } catch {
    return false;
  }
}

function isDismissed() {
  try {
    return window.localStorage.getItem(SAFARI_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldShowHint() {
  return isSafari() && !isStandalone() && !isDismissed();
}

export function persistDismissed() {
  try {
    window.localStorage.setItem(SAFARI_HINT_KEY, "1");
  } catch {
    // Сховище недоступне: підказка лишається закритою до кінця сеансу.
  }
}
