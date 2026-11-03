import { act, render } from "@testing-library/react";
import { focusManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import { MarketDataProvider } from "./index.js";

const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });
const topCalls = (mock) => mock.mock.calls.filter(([u]) => !String(u).includes("stablecoins"));

function stub(topResponse) {
  const mock = vi.fn(async (url) =>
    String(url).includes("stablecoins") ? fail(500) : topResponse(),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}
const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));
const blur = () => act(async () => focusManager.setFocused(false));
const focus = () => act(async () => focusManager.setFocused(true));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-02T22:12:00.000Z") });
  focusManager.setFocused(true);
});

afterEach(() => {
  focusManager.setFocused(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function away(ms) {
  await blur();
  await wait(ms);
  await focus();
  await wait(50);
}

describe("NFR-3: фокус вкладки не дає запитів поза 60-секундним циклом", () => {
  it("429 на старті: 3 повернення за 30 с — 0 додаткових; після 60 с від спроби — рівно 1", async () => {
    const mock = stub(() => fail(429));
    render(<MarketDataProvider />);
    await wait(100);
    expect(topCalls(mock)).toHaveLength(1);
    for (let i = 0; i < 3; i++) await away(5000);
    expect(topCalls(mock)).toHaveLength(1);
    await wait(40000);
    await away(10000);
    expect(topCalls(mock)).toHaveLength(2);
  });

  it("успіх, вкладка прихована 61 с, повернення — рівно 1 запит", async () => {
    const mock = stub(() => ok(top50));
    render(<MarketDataProvider />);
    await wait(100);
    expect(topCalls(mock)).toHaveLength(1);
    await away(61000);
    expect(topCalls(mock)).toHaveLength(2);
  });

  it("успіх, потім 429 у циклі: повернення за <60 с від невдалої спроби — 0 запитів", async () => {
    let calls = 0;
    const mock = stub(() => (++calls === 1 ? ok(top50) : fail(429)));
    render(<MarketDataProvider />);
    await wait(60100);
    expect(topCalls(mock)).toHaveLength(2);
    for (let i = 0; i < 3; i++) await away(5000);
    expect(topCalls(mock)).toHaveLength(2);
  });

  it("вкладка прихована: 0 запитів за 3 хв", async () => {
    const mock = stub(() => ok(top50));
    render(<MarketDataProvider />);
    await wait(100);
    await blur();
    await wait(180000);
    expect(topCalls(mock)).toHaveLength(1);
  });

  it("503: повернення до 60 с від останньої спроби не запускає нового ланцюга", async () => {
    const mock = stub(() => fail(503));
    render(<MarketDataProvider />);
    await wait(7000);
    expect(topCalls(mock)).toHaveLength(3);
    for (let i = 0; i < 3; i++) await away(5000);
    await wait(7000);
    expect(topCalls(mock)).toHaveLength(3);
  });
});
