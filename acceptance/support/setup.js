import { afterEach, beforeEach, vi } from "vitest";

// Телефон (< 768 px): matchMedia завжди повертає matches: false (план етапу 6, розділ 4, P-3).
function phoneMatchMedia(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  };
}

beforeEach(() => {
  window.matchMedia = phoneMatchMedia;
  Element.prototype.scrollIntoView = () => {};
  window.localStorage.clear();
  window.location.hash = "";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.location.hash = "";
});
