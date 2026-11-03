// Клієнт CoinGecko: таймаут 10 с і політика повторів P-4 (архітектура §7.1, NFR-3).
import { parseMarkets, ShapeError } from "./parse.js";

const BASE = "https://api.coingecko.com/api/v3/coins/markets";
const TOP_URL = `${BASE}?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d`;
const STABLECOINS_URL = `${BASE}?vs_currency=usd&category=stablecoins&per_page=250`;
const TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = [2000, 4000];

/**
 * fetch кинув виняток. Браузер так само відхиляє відповідь без CORS-заголовка (напр. 429 CoinGecko),
 * тому E-NET (`offline`) лише коли navigator.onLine === false у момент збою; інакше — E-SRC (BUG-001).
 */
export class NetworkError extends Error {
  /** @param {boolean} [offline] */
  constructor(offline = false) {
    super("Мережева помилка");
    this.name = "NetworkError";
    this.offline = offline;
  }
}

/** Запит не вклався в 10 с (E-SRC). */
export class TimeoutError extends Error {
  constructor() {
    super("Таймаут запиту");
    this.name = "TimeoutError";
  }
}

/** Відповідь зі статусом не 2xx (E-SRC, E-429). */
export class HttpError extends Error {
  /** @param {number} status */
  constructor(status) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * @param {unknown} error
 * @returns {'src' | 'net'}
 */
export function errorKindOf(error) {
  return error instanceof NetworkError && error.offline ? "net" : "src";
}

function isRetryable(error) {
  if (error instanceof HttpError) return error.status >= 500;
  if (error instanceof NetworkError) return error.offline;
  return error instanceof TimeoutError;
}

function abortError() {
  return new DOMException("Скасовано", "AbortError");
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function requestJson(url, external) {
  if (external?.aborted) throw abortError();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  external?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new HttpError(response.status);
    return await response.json();
  } catch (error) {
    if (external?.aborted) throw abortError();
    if (timedOut) throw new TimeoutError();
    if (error instanceof HttpError) throw error;
    if (error instanceof SyntaxError) throw new ShapeError("Відповідь не є JSON");
    throw new NetworkError(navigator.onLine === false);
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}

async function requestWithRetries(url, signal) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestJson(url, signal);
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !isRetryable(error)) throw error;
      await sleep(RETRY_DELAYS_MS[attempt], signal);
      // Вкладку сховали під час паузи: наступна спроба — у черговому циклі або при поверненні (NFR-3).
      if (document.visibilityState === "hidden") throw error;
    }
  }
}

/**
 * GET /coins/markets топ-50 з таймаутом 10 с і політикою повторів P-4 (4xx, виняток fetch онлайн → 0; офлайн / таймаут / 5xx → 2: 2 с, 4 с).
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<import('../lib/index.js').Coin[]>}
 */
export async function fetchTopCoins({ signal } = {}) {
  return parseMarkets(await requestWithRetries(TOP_URL, signal));
}

/**
 * GET /coins/markets?category=stablecoins → множина id, без повторів.
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<Set<string>>}
 */
export async function fetchStablecoinIds({ signal } = {}) {
  const json = await requestJson(STABLECOINS_URL, signal);
  if (!Array.isArray(json)) throw new ShapeError("Відповідь має бути масивом");
  return new Set(json.filter((item) => typeof item?.id === "string").map((item) => item.id));
}
