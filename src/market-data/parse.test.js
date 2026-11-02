import { afterEach, describe, expect, it, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import { ShapeError, parseMarkets } from "./index.js";

const clone = () => structuredClone(top50);

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("parseMarkets", () => {
  it("мапить 50 монет із записаної відповіді, упорядкованих за рангом", () => {
    const coins = parseMarkets(top50);
    expect(coins).toHaveLength(50);
    expect(coins.map((c) => c.rank)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    const [btc] = coins;
    expect(btc).toMatchObject({
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      priceUsd: 76768,
      marketCapUsd: 1543449392724,
      isStablecoin: false,
    });
    expect(btc.change7dPct).toBe(top50[0].price_change_percentage_7d_in_currency);
    expect(btc.imageUrl.startsWith("https://coin-images.coingecko.com/")).toBe(true);
    expect(btc.lastUpdated).toEqual(new Date("2026-11-02T22:11:56.000Z"));
    expect(btc.sparkline7d.length).toBeGreaterThan(100);
  });

  it("відкидає 51-шу монету і лишає рівно 50", () => {
    const json = clone();
    json.push({ ...json[0], id: "extra", market_cap_rank: 51 });
    expect(parseMarkets(json)).toHaveLength(50);
  });

  it("менше 50 монет — ShapeError", () => {
    expect(() => parseMarkets(clone().slice(0, 49))).toThrow(ShapeError);
  });

  it("дубль рангу — ShapeError", () => {
    const json = clone();
    json[1].market_cap_rank = 1;
    expect(() => parseMarkets(json)).toThrow(ShapeError);
  });

  it("не масив — ShapeError", () => {
    expect(() => parseMarkets({})).toThrow(ShapeError);
  });

  it("current_price: null — ShapeError", () => {
    const json = clone();
    json[3].current_price = null;
    expect(() => parseMarkets(json)).toThrow(ShapeError);
  });

  it("порожній sparkline — не помилка", () => {
    const json = clone();
    json[0].sparkline_in_7d.price = [];
    expect(parseMarkets(json)[0].sparkline7d).toEqual([]);
  });

  it("логотип з чужого хоста чи не https дає порожній рядок", () => {
    const json = clone();
    json[0].image = "https://evil.example/logo.png";
    json[1].image = "http://coin-images.coingecko.com/x.png";
    json[2].image = "<img src=x onerror=alert(1)>";
    const coins = parseMarkets(json);
    expect(coins.slice(0, 3).map((c) => c.imageUrl)).toEqual(["", "", ""]);
  });

  it("last_updated із майбутнього більш ніж на 60 с — console.warn, ціна лишається", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-02T22:00:00.000Z") });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const coins = parseMarkets(top50);
    expect(warn).toHaveBeenCalled();
    expect(coins[0].priceUsd).toBe(76768);
  });

  it("свіжі дані не дають console.warn", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-02T22:12:00.000Z") });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseMarkets(top50);
    expect(warn).not.toHaveBeenCalled();
  });
});
