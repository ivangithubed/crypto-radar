// Публічний інтерфейс модуля market-data (архітектура §5, §7.1): клієнт CoinGecko, знімок топ-50, свіжість NFR-1.
// Контракт Wave 0 етапу 7 (план етапу 6, розділ 5): сигнатури не змінюються.
export { ShapeError, parseMarkets } from "./parse.js";
export { fetchTopCoins, fetchStablecoinIds } from "./client.js";
export { useTopCoins } from "./useTopCoins.js";
export { useStablecoinIds } from "./useStablecoinIds.js";
export { MarketDataProvider } from "./MarketDataProvider.jsx";
