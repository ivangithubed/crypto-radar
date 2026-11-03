import { HashRouter, Route, Routes } from "react-router";
import { CoinListPage } from "../features/coin-list/index.js";
import { CoinPage } from "../features/coin-page/index.js";
import { FavoritesPage } from "../features/favorites-view/index.js";
import { MarketDataProvider } from "../market-data/index.js";
import { AppErrorBoundary } from "./AppErrorBoundary.jsx";
import { Layout } from "./Layout.jsx";
import { NotFoundPage } from "./NotFoundPage.jsx";

// Корінь застосунку (архітектура §5, UX §1): дані → маршрути `HashRouter` → спільний каркас → екран.
// Межа помилок S-5 стоїть усередині <main>, тож шапка, дисклеймер і атрибуція лишаються й під час збою.
export default function App() {
  return (
    <MarketDataProvider>
      <HashRouter>
        <Layout>
          <AppErrorBoundary>
            <Routes>
              <Route path="/" element={<CoinListPage />} />
              <Route path="/coin/:id" element={<CoinPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppErrorBoundary>
        </Layout>
      </HashRouter>
    </MarketDataProvider>
  );
}
