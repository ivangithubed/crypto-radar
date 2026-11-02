// Спільний стан підказок: на сторінці відкрита щонайбільше одна (id відкритої панелі або null).
let openId = null;
const listeners = new Set();

export function subscribeHint(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOpenHintId() {
  return openId;
}

export function setOpenHintId(id) {
  if (openId === id) return;
  openId = id;
  for (const listener of [...listeners]) listener();
}
