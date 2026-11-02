import { CoinListPage } from "../features/coin-list/index.js";
import { CoinPage } from "../features/coin-page/index.js";
import { FavoritesPage } from "../features/favorites-view/index.js";
import { MarketDataProvider } from "../market-data/index.js";

// Оболонка застосунку (каркас етапу 5): орієнтири сторінки й один h1.
// Wave 0 етапу 7 лише з'єднує заглушки екранів; маршрути, макет і стани S-4, S-5 — хвиля 4 (план етапу 6).
export default function App() {
  return (
    <MarketDataProvider>
      <div className="flex min-h-dvh flex-col bg-surface font-sans text-ink">
        <header className="border-b border-line bg-surface-raised px-4 py-3">
          <p className="font-display text-lg font-semibold">Крипто-Радар</p>
        </header>
        <main className="flex-1 px-4 py-6">
          <h1 className="font-display text-2xl font-semibold">Крипто-Радар</h1>
          <p className="mt-2 text-ink-muted">
            Каркас застосунку. Екрани з&apos;являться на етапі реалізації.
          </p>
          <CoinListPage />
          <CoinPage />
          <FavoritesPage />
        </main>
        <footer className="border-t border-line px-4 py-3 text-sm text-ink-muted">
          <p>Крипто-Радар</p>
        </footer>
      </div>
    </MarketDataProvider>
  );
}
