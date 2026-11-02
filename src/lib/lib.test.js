import { describe, expect, test } from "vitest";
import {
  FRESHNESS_LIMIT_MS,
  QUERY_MAX_LENGTH,
  formatChange,
  formatMarketCap,
  formatPrice,
  formatPriceTime,
  isFresh,
  normalizeQuery,
  pluralCoins,
  searchCoins,
  sortCoins,
} from "./index.js";

const NB = " ";
const MINUS = "−";

describe("formatPrice", () => {
  test.each([
    [67250.1, `$67${NB}250,10`],
    [1, "$1,00"],
    [0.52, "$0,52"],
    [0.1, "$0,10"],
    [1234567.891, `$1${NB}234${NB}567,89`],
    [0.04512, "$0,04512"],
    [0.00001234, "$0,00001234"],
    [0, "$0,00"],
  ])("%s -> %s", (input, expected) => {
    expect(formatPrice(input)).toBe(expected);
  });
});

describe("formatChange", () => {
  test.each([
    [4.2, "+4,2 %", "up", "зростання на 4,2 %"],
    [-3.7, `${MINUS}3,7 %`, "down", "падіння на 3,7 %"],
    [0.05, "+0,1 %", "up", "зростання на 0,1 %"],
    [-0.05, `${MINUS}0,1 %`, "down", "падіння на 0,1 %"],
    [0.04, "0,0 %", "flat", "без змін"],
    [-0.04, "0,0 %", "flat", "без змін"],
    [0, "0,0 %", "flat", "без змін"],
    [1234.56, `+1${NB}234,6 %`, "up", `зростання на 1${NB}234,6 %`],
  ])("%s", (input, text, direction, spoken) => {
    expect(formatChange(input)).toEqual({ text, direction, spoken });
  });
});

describe("formatMarketCap", () => {
  test.each([
    [1.32e12, "$1,32 трлн"],
    [845.1e9, "$845,1 млрд"],
    [375e9, "$375,0 млрд"],
    [12.34e6, "$12,3 млн"],
    [5000, `$5${NB}000`],
  ])("%s -> %s", (input, expected) => {
    expect(formatMarketCap(input)).toBe(expected);
  });
});

describe("formatPriceTime", () => {
  test("24 години з нулем попереду, за часом пристрою", () => {
    expect(formatPriceTime(new Date(2026, 10, 3, 14, 32))).toBe("14:32");
    expect(formatPriceTime(new Date(2026, 10, 3, 5, 7))).toBe("05:07");
    expect(formatPriceTime(new Date(2026, 10, 3, 0, 0))).toBe("00:00");
  });
});

const coin = (rank, name, symbol, priceUsd, change7dPct, marketCapUsd) => ({
  id: name.toLowerCase(),
  name,
  symbol,
  rank,
  priceUsd,
  change7dPct,
  marketCapUsd,
  imageUrl: "",
  sparkline7d: [],
  lastUpdated: new Date(0),
  isStablecoin: false,
});

const coins = [
  coin(1, "Bitcoin", "BTC", 100, 1, 900),
  coin(2, "Ethereum", "ETH", 50, 5, 500),
  coin(3, "Tether", "USDT", 50, 5, 500),
  coin(4, "Solana", "SOL", 10, -2, 100),
];

describe("sortCoins", () => {
  test("price: за спаданням, рівні — за рангом", () => {
    expect(sortCoins(coins, "price").map((c) => c.rank)).toEqual([1, 2, 3, 4]);
    expect(sortCoins([coins[2], coins[1]], "price").map((c) => c.rank)).toEqual([2, 3]);
  });
  test("gain: найбільше зростання першим, тай-брейк за рангом", () => {
    expect(sortCoins([...coins].reverse(), "gain").map((c) => c.rank)).toEqual([2, 3, 1, 4]);
  });
  test("loss: найбільше падіння першим", () => {
    expect(sortCoins(coins, "loss").map((c) => c.rank)).toEqual([4, 1, 2, 3]);
  });
  test("cap: за спаданням, тай-брейк за рангом", () => {
    expect(sortCoins([...coins].reverse(), "cap").map((c) => c.rank)).toEqual([1, 2, 3, 4]);
  });
  test("не мутує вхід і повертає нову копію", () => {
    const input = [...coins].reverse();
    const snapshot = [...input];
    const result = sortCoins(input, "price");
    expect(input).toEqual(snapshot);
    expect(result).not.toBe(input);
  });
});

describe("normalizeQuery / searchCoins", () => {
  test("обрізає пробіли, нижній регістр, ≤ 50 символів", () => {
    expect(normalizeQuery("  BitCoin ")).toBe("bitcoin");
    expect(normalizeQuery("a".repeat(80))).toHaveLength(QUERY_MAX_LENGTH);
  });
  test("пошук за частиною назви й тікером без урахування регістру", () => {
    expect(searchCoins(coins, "COIN").map((c) => c.symbol)).toEqual(["BTC"]);
    expect(searchCoins(coins, "  eTH ").map((c) => c.symbol)).toEqual(["ETH", "USDT"]);
    expect(searchCoins(coins, "usdt").map((c) => c.name)).toEqual(["Tether"]);
    expect(searchCoins(coins, "zzz")).toEqual([]);
  });
  test("порожній запит повертає всі монети в тому ж порядку", () => {
    expect(searchCoins(coins, "   ")).toEqual(coins);
  });
  test("зберігає порядок вхідного масиву", () => {
    expect(searchCoins(coins, "t").map((c) => c.rank)).toEqual([1, 2, 3]);
  });
});

describe("isFresh", () => {
  const now = new Date(1_000_000_000);
  test.each([
    [299, true],
    [300, true],
    [301, false],
  ])("давність %s с -> %s", (seconds, expected) => {
    expect(isFresh(new Date(now.getTime() - seconds * 1000), now)).toBe(expected);
  });
  test("ліміт 300 000 мс", () => {
    expect(FRESHNESS_LIMIT_MS).toBe(300000);
  });
});

describe("pluralCoins", () => {
  test.each([
    [1, "1 монету", "1 монета"],
    [2, "2 монети", "2 монети"],
    [4, "4 монети", "4 монети"],
    [5, "5 монет", "5 монет"],
    [11, "11 монет", "11 монет"],
    [21, "21 монету", "21 монета"],
    [22, "22 монети", "22 монети"],
    [25, "25 монет", "25 монет"],
    [0, "0 монет", "0 монет"],
    [14, "14 монет", "14 монет"],
  ])("%s", (n, acc, nom) => {
    expect(pluralCoins(n, "acc")).toBe(acc);
    expect(pluralCoins(n, "nom")).toBe(nom);
  });
});
