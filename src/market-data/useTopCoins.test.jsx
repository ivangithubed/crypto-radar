import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import stablecoins from "../test/fixtures/stablecoins.json";
import { MarketDataProvider, useStablecoinIds, useTopCoins } from "./index.js";

const UPDATED = new Date("2026-11-02T22:11:56.000Z");
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });

function stubFetch({ top = () => ok(top50), stable = () => ok(stablecoins) } = {}) {
  const mock = vi.fn(async (url) => {
    const isStable = String(url).includes("category=stablecoins");
    return isStable ? stable() : top();
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const topCalls = (mock) => mock.mock.calls.filter(([u]) => !String(u).includes("stablecoins"));

function wrapper({ children }) {
  return (
    <StrictMode>
      <MarketDataProvider>{children}</MarketDataProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(UPDATED.getTime() + 60000) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useTopCoins", () => {
  it("loading → fresh з 50 монетами і найстарішим pricesAt", async () => {
    stubFetch();
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    expect(result.current).toMatchObject({ status: "loading", errorKind: null, coins: [] });
    expect(result.current.pricesAt).toBeNull();
    await waitFor(() => expect(result.current.status).toBe("fresh"));
    expect(result.current.coins).toHaveLength(50);
    expect(result.current.errorKind).toBeNull();
    const oldest = Math.min(...top50.map((c) => Date.parse(c.last_updated)));
    expect(result.current.pricesAt.getTime()).toBe(oldest);
  });

  it("429 → error src без монет", async () => {
    stubFetch({ top: () => fail(429) });
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({ errorKind: "src", coins: [] });
  });

  it("помилка мережі → error net", async () => {
    vi.useFakeTimers({ now: new Date(UPDATED.getTime() + 60000) });
    stubFetch({
      top: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(7000));
    expect(result.current).toMatchObject({ status: "error", errorKind: "net", coins: [] });
  });

  it("некоректна форма → error src", async () => {
    stubFetch({ top: () => ok(top50.slice(0, 10)) });
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorKind).toBe("src");
  });

  it("застарілі дані (> 300 с) → error stale без монет", async () => {
    vi.setSystemTime(new Date(UPDATED.getTime() + 301000));
    stubFetch();
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toMatchObject({ errorKind: "stale", coins: [] });
    expect(result.current.pricesAt).toBeInstanceOf(Date);
  });

  it("давність рівно 300 с ще fresh", async () => {
    const oldest = Math.min(...top50.map((c) => Date.parse(c.last_updated)));
    vi.setSystemTime(new Date(oldest + 300000));
    stubFetch();
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("fresh"));
  });

  it("зсув годинника на 301 с переводить fresh у stale протягом 1 с", async () => {
    stubFetch();
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("fresh"));
    act(() => {
      vi.setSystemTime(new Date(UPDATED.getTime() + 400000));
    });
    await waitFor(() => expect(result.current.errorKind).toBe("stale"), { timeout: 1500 });
    expect(result.current.status).toBe("error");
    expect(result.current.coins).toEqual([]);
  });

  it("на старті не більше 2 запитів (топ-50 + стейблкоїни)", async () => {
    const mock = stubFetch();
    const { result } = renderHook(() => ({ top: useTopCoins(), stable: useStablecoinIds() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.top.status).toBe("fresh"));
    await waitFor(() => expect(result.current.stable.size).toBeGreaterThan(0));
    expect(mock.mock.calls.length).toBeLessThanOrEqual(2);
    expect(topCalls(mock)).toHaveLength(1);
  });

  it("retry: retrying → retryFailed при 429, потім успіх → fresh", async () => {
    let mode = "429";
    const mock = stubFetch({ top: () => (mode === "429" ? fail(429) : ok(top50)) });
    const { result } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.errorKind).toBe("src"));
    expect(result.current.retryFailed).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.retryFailed).toBe(true));
    expect(result.current.retrying).toBe(false);
    expect(topCalls(mock)).toHaveLength(2);

    mode = "ok";
    act(() => result.current.retry());
    expect(result.current.retrying).toBe(true);
    expect(result.current.retryFailed).toBe(false);
    await waitFor(() => expect(result.current.status).toBe("fresh"));
    expect(result.current.retrying).toBe(false);
    expect(result.current.retryFailed).toBe(false);
  });

  it("посилання на retry і coins стабільні між рендерами", async () => {
    stubFetch();
    const { result, rerender } = renderHook(() => useTopCoins(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("fresh"));
    const first = result.current;
    rerender();
    expect(result.current.retry).toBe(first.retry);
    expect(result.current.coins).toBe(first.coins);
  });
});

const useBoth = () => ({ top: useTopCoins(), stable: useStablecoinIds() });

describe("useStablecoinIds", () => {
  it("повертає множину id", async () => {
    stubFetch();
    const { result } = renderHook(useBoth, { wrapper });
    expect(result.current.stable.size).toBe(0);
    await waitFor(() => expect(result.current.stable.has("tether")).toBe(true));
  });

  it("при помилці — порожня множина (той самий екземпляр)", async () => {
    const mock = stubFetch({ stable: () => fail(500) });
    const { result } = renderHook(useBoth, { wrapper });
    const first = result.current.stable;
    await waitFor(() => expect(mock.mock.calls.length).toBe(2));
    await act(async () => {});
    expect(result.current.stable.size).toBe(0);
    expect(result.current.stable).toBe(first);
  });

  it("не запитується, поки топ-50 не відповів", async () => {
    const mock = stubFetch({ top: () => new Promise(() => {}) });
    renderHook(useBoth, { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(topCalls(mock)).toHaveLength(1);
  });

  it("після відповіді топ-50 запитується (разом 2 виклики)", async () => {
    const mock = stubFetch();
    const { result } = renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.stable.has("tether")).toBe(true));
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("після помилки топ-50 (429) запитується теж", async () => {
    const mock = stubFetch({ top: () => fail(429) });
    const { result } = renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.top.status).toBe("error"));
    await waitFor(() => expect(result.current.stable.has("tether")).toBe(true));
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
