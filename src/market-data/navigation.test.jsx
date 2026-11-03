import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import { MarketDataProvider, useStablecoinIds, useTopCoins } from "./index.js";

const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });
const topCalls = (mock) => mock.mock.calls.filter(([u]) => !String(u).includes("stablecoins"));
const stableCalls = (mock) => mock.mock.calls.filter(([u]) => String(u).includes("stablecoins"));

const nav = { go: () => {} };
function Nav() {
  const navigate = useNavigate();
  useEffect(() => {
    nav.go = navigate;
  }, [navigate]);
  return null;
}
function Screen({ name }) {
  const { status } = useTopCoins();
  useStablecoinIds();
  return <p>{`${name}:${status}`}</p>;
}

function app() {
  return render(
    <>
      <MarketDataProvider>
        <MemoryRouter initialEntries={["/a"]}>
          <Nav />
          <Routes>
            <Route path="/a" element={<Screen name="a" />} />
            <Route path="/b" element={<Screen name="b" />} />
          </Routes>
        </MemoryRouter>
      </MarketDataProvider>
    </>,
  );
}

async function navigate(path) {
  await act(async () => {
    nav.go(path);
    await vi.advanceTimersByTimeAsync(0);
  });
}

function stub(topResponse) {
  const mock = vi.fn(async (url) =>
    String(url).includes("stablecoins") ? fail(500) : topResponse(),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-02T22:12:00.000Z") });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("NFR-3: переходи між екранами не породжують запитів", () => {
  it("429: після першої помилки 3 переходи — запитів топ-50 не більше", async () => {
    const mock = stub(() => fail(429));
    app();
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(topCalls(mock)).toHaveLength(1);
    for (const path of ["/b", "/a", "/b"]) await navigate(path);
    expect(topCalls(mock)).toHaveLength(1);
  });

  it("503: ланцюг 3 запити, далі переходи нічого не додають", async () => {
    const mock = stub(() => fail(503));
    app();
    await act(() => vi.advanceTimersByTimeAsync(7000));
    expect(topCalls(mock)).toHaveLength(3);
    for (const path of ["/b", "/a", "/b"]) await navigate(path);
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(topCalls(mock)).toHaveLength(3);
  });

  it("стейблкоїни після помилки не повторюються при новому монтуванні", async () => {
    const mock = stub(() => fail(429));
    app();
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(stableCalls(mock)).toHaveLength(1);
    for (const path of ["/b", "/a"]) await navigate(path);
    expect(stableCalls(mock)).toHaveLength(1);
  });

  it("успіх: перехід на 30-й секунді не скидає інтервал — запит на 60-й", async () => {
    const mock = stub(() => ok(top50));
    app();
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(topCalls(mock)).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(29900));
    await navigate("/b");
    await act(() => vi.advanceTimersByTimeAsync(29000));
    expect(topCalls(mock)).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(topCalls(mock)).toHaveLength(2);
  });
});
