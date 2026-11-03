// Спільне сховище обраних (архітектура §6, §7.2, NFR-10, NFR-11): один стан на вкладку, синхронний запис у localStorage.
import "../lib/index.js";

/** Ключ обраних: JSON-масив рядків-ідентифікаторів (NFR-10). */
export const FAVORITES_KEY = "crypto-radar:favorites";

/** Ключ «підказку Safari закрито»: значення "1" (ADR 0006). */
export const SAFARI_HINT_KEY = "crypto-radar:safari-hint-dismissed";

/** @typedef {{ids: string[], storeError: 'write' | 'read' | null}} FavoritesSnapshot */

/** @type {Set<() => void>} */
const listeners = new Set();
let writeError = false;
/** Запас у пам'яті вкладки після невдалого запису (E-STORE): діє, поки запис не вдасться знову. @type {string[] | null} */
let memIds = null;
/** @type {{raw: string | null, readError: boolean, writeError: boolean, mem: string[] | null, value: FavoritesSnapshot} | null} */
let cache = null;

/**
 * Лише JSON-масив рядків без дублів (порядок першої появи); усе інше — порожній список.
 * @param {string | null} raw
 * @returns {string[]}
 */
function parseIds(raw) {
  if (raw === null) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every((item) => typeof item === "string")) return [];
    return [...new Set(data)];
  } catch {
    return [];
  }
}

function readRaw() {
  try {
    return { raw: window.localStorage.getItem(FAVORITES_KEY), readError: false };
  } catch {
    return { raw: null, readError: true };
  }
}

/**
 * Стабільний знімок: той самий екземпляр, поки сирий рядок і прапорці помилок не змінилися.
 * @returns {FavoritesSnapshot}
 */
export function getSnapshot() {
  const { raw, readError } = readRaw();
  if (
    cache &&
    cache.raw === raw &&
    cache.readError === readError &&
    cache.writeError === writeError &&
    cache.mem === memIds
  ) {
    return cache.value;
  }
  let storeError = null;
  if (readError) storeError = "read";
  else if (writeError) storeError = "write";
  const value = { ids: memIds ?? parseIds(raw), storeError };
  cache = { raw, readError, writeError, mem: memIds, value };
  return value;
}

function emit() {
  for (const listener of [...listeners]) listener();
}

/** @param {() => void} listener */
export function subscribe(listener) {
  if (listeners.size === 0) {
    writeError = memIds !== null;
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** C-TAB: зміна з іншої вкладки; остання дія перемагає. */
function onStorage(event) {
  if (event.key !== null && event.key !== FAVORITES_KEY) return;
  memIds = null;
  writeError = false;
  emit();
}

/** @param {string[]} ids @returns {boolean} */
function write(ids) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    writeError = false;
    memIds = null;
    emit();
    return true;
  } catch {
    writeError = true;
    memIds = ids;
    emit();
    return false;
  }
}

/**
 * @param {string} id
 * @param {{has: (id: string) => boolean}} top50Ids
 * @returns {boolean}
 */
export function addFavorite(id, top50Ids) {
  const { ids } = getSnapshot();
  if (!top50Ids.has(id) || ids.includes(id)) return false;
  return write([...ids, id]);
}

/** @param {string} id */
export function removeFavorite(id) {
  const { ids } = getSnapshot();
  if (!ids.includes(id)) return;
  write(ids.filter((item) => item !== id));
}
