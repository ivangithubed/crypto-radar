import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import stablecoins from "../test/fixtures/stablecoins.json";
import { fetchStablecoinIds, fetchTopCoins } from "./index.js";
import { errorKindOf, HttpError, NetworkError, TimeoutError } from "./client.js";
import { ShapeError } from "./parse.js";

const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });

/** Перетворює відхилення на значення, щоб не було необроблених відхилень. */
const settle = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  );

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-02T22:12:00.000Z") });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchTopCoins: запит", () => {
  it("викликає fetch з точним URL і без власних заголовків", async () => {
    const fetchMock = vi.fn(async () => ok(top50));
    vi.stubGlobal("fetch", fetchMock);
    const coins = await fetchTopCoins({});
    expect(coins).toHaveLength(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d",
    );
    expect(Object.keys(init)).toEqual(["signal"]);
  });
});

describe("fetchTopCoins: політика повторів P-4", () => {
  it("429 — один запит, без повторів", async () => {
    const fetchMock = vi.fn(async () => fail(429));
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("вкладку сховали під час паузи повтору — наступної спроби немає", async () => {
    const fetchMock = vi.fn(async () => fail(503));
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const spy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await vi.advanceTimersByTimeAsync(20000);
    spy.mockRestore();
    expect(await result).toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("інший 4xx — без повторів", async () => {
    const fetchMock = vi.fn(async () => fail(404));
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("503 — 3 запити з паузами 2 с і 4 с", async () => {
    const fetchMock = vi.fn(async () => fail(503));
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await result).toMatchObject({ status: 503 });
  });

  it("офлайн — 3 запити, потім NetworkError з offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(6000);
    const error = await result;
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.offline).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("повтор після збою може вдатися", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(fail(500)).mockResolvedValue(ok(top50));
    vi.stubGlobal("fetch", fetchMock);
    const promise = fetchTopCoins({});
    await vi.advanceTimersByTimeAsync(2000);
    expect(await promise).toHaveLength(50);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("таймаут 10 с перериває запит; усього 3 спроби", async () => {
    const fetchMock = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1 + 2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10000 + 4000 + 10000);
    expect(await result).toBeInstanceOf(TimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("скасування зовнішнім signal не повторюється", async () => {
    const fetchMock = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const result = settle(fetchTopCoins({ signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("скасування під час паузи між повторами зупиняє повтори", async () => {
    const fetchMock = vi.fn(async () => fail(503));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const result = settle(fetchTopCoins({ signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("тригер × стан → kind і кількість запитів (BUG-001)", () => {
  const hang = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
    });
  const throwType = async () => {
    throw new TypeError("Failed to fetch");
  };
  const badJson = async () => ({ ok: true, json: () => Promise.reject(new SyntaxError("x")) });
  const cases = [
    ["TypeError, onLine=true", true, throwType, 6000, NetworkError, "src", 1],
    ["TypeError, onLine=false", false, throwType, 6000, NetworkError, "net", 3],
    ["TimeoutError", true, hang, 40000, TimeoutError, "src", 3],
    ["HTTP 500", true, async () => fail(500), 6000, HttpError, "src", 3],
    ["HTTP 429", true, async () => fail(429), 6000, HttpError, "src", 1],
    ["HTTP 404", true, async () => fail(404), 6000, HttpError, "src", 1],
    ["невалідний JSON", true, badJson, 6000, ShapeError, "src", 1],
  ];

  it.each(cases)("%s", async (_name, online, impl, advance, ErrorClass, kind, calls) => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
    const fetchMock = vi.fn(impl);
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchTopCoins({}));
    await vi.advanceTimersByTimeAsync(advance);
    const error = await result;
    expect(error).toBeInstanceOf(ErrorClass);
    expect(errorKindOf(error)).toBe(kind);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it("зовнішній abort → AbortError, 1 запит", async () => {
    const fetchMock = vi.fn(hang);
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const result = settle(fetchTopCoins({ signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("fetchStablecoinIds", () => {
  it("повертає множину id з точного URL без повторів", async () => {
    const fetchMock = vi.fn(async () => ok(stablecoins));
    vi.stubGlobal("fetch", fetchMock);
    const ids = await fetchStablecoinIds({});
    expect(ids).toBeInstanceOf(Set);
    expect(ids.has("tether")).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=stablecoins&per_page=250",
    );
  });

  it("5xx — без повторів", async () => {
    const fetchMock = vi.fn(async () => fail(503));
    vi.stubGlobal("fetch", fetchMock);
    const result = settle(fetchStablecoinIds({}));
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
