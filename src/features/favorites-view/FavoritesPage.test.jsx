import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_KEY, SAFARI_HINT_KEY } from "../../favorites/index.js";
import { MarketDataProvider } from "../../market-data/index.js";
import top50 from "../../test/fixtures/markets-top50.json";
import stablecoins from "../../test/fixtures/stablecoins.json";
import { FavoritesPage } from "./index.js";

const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function stubFetch(status = 200) {
  const fresh = top50.map((coin) => ({
    ...coin,
    last_updated: new Date(Date.now() - 60000).toISOString(),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (String(url).includes("category=stablecoins")) return ok(stablecoins);
      return status === 200 ? ok(fresh) : { ok: false, status, json: async () => ({}) };
    }),
  );
}

function renderPage(favorites) {
  if (favorites) window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return render(
    <MemoryRouter>
      <MarketDataProvider>
        <FavoritesPage />
      </MarketDataProvider>
    </MemoryRouter>,
  );
}

const stored = () => JSON.parse(window.localStorage.getItem(FAVORITES_KEY));

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("FavoritesPage", () => {
  it("Empty: заголовок, пояснення й посилання на топ-50", async () => {
    stubFetch();
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Обрані" })).toBeInTheDocument();
    expect(screen.getByText("Тут поки порожньо")).toBeInTheDocument();
    expect(screen.getByText(/Натисніть кнопку «Додати в обрані»/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти до топ-50" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Обрані — Крипто-Радар");
  });

  it("Data: порядок за місцем у рейтингу, ціни й час", async () => {
    stubFetch();
    renderPage(["solana", "bitcoin"]);
    const list = await screen.findByRole("list", { name: "Обрані монети, 2" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Bitcoin");
    expect(items[1]).toHaveTextContent("Solana");
    expect(items[0]).toHaveTextContent("$");
    expect(screen.getByText(/^Ціни на \d\d:\d\d$/)).toBeInTheDocument();
    expect(within(items[0]).getByRole("link", { name: "Bitcoin" })).toHaveAttribute(
      "href",
      "/coin/bitcoin",
    );
  });

  it("вибула монета внизу без $ і з ★ за id", async () => {
    stubFetch();
    renderPage(["moneta-x", "bitcoin"]);
    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    const last = items[items.length - 1];
    expect(last).toHaveTextContent("moneta-x");
    expect(last).toHaveTextContent("Зараз поза топ-50 — ціни не показуємо");
    expect(last.textContent).not.toContain("$");
    expect(
      within(last).getByRole("button", { name: "Прибрати з обраних: moneta-x" }),
    ).toBeInTheDocument();
    expect(items[0]).toHaveTextContent("Bitcoin");
  });

  it("прибрати: картка зникає, localStorage оновлено, є статус", async () => {
    stubFetch();
    renderPage(["bitcoin", "ethereum"]);
    fireEvent.click(await screen.findByRole("button", { name: "Прибрати з обраних: Bitcoin" }));
    expect(screen.queryByRole("link", { name: "Bitcoin" })).toBeNull();
    expect(stored()).toEqual(["ethereum"]);
    expect(screen.getByRole("status")).toHaveTextContent("Bitcoin прибрано з обраних");
    expect(screen.getByRole("button", { name: "Прибрати з обраних: Ethereum" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Прибрати з обраних: Ethereum" }));
    expect(screen.getByText("Тут поки порожньо")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("Error: блок помилки, fav.kept, жодних цін; повтор веде в Data", async () => {
    stubFetch(429);
    renderPage(["bitcoin", "ethereum"]);
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Ваші обрані збережені: 2 монети.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("$");
    expect(stored()).toEqual(["bitcoin", "ethereum"]);
    stubFetch();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    });
    expect(await screen.findByRole("link", { name: "Bitcoin" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("порада Safari: показується й закривається", async () => {
    stubFetch();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(SAFARI_UA);
    renderPage();
    expect(screen.getByText("Щоб обрані не зникли в Safari")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрити пораду" }));
    expect(screen.queryByText("Щоб обрані не зникли в Safari")).toBeNull();
    expect(window.localStorage.getItem(SAFARI_HINT_KEY)).toBe("1");
    vi.restoreAllMocks();
  });

  it("Loading: скелетон і статус, поки цін немає", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    renderPage(["bitcoin"]);
    expect(screen.getByRole("status")).toHaveTextContent("Завантажуємо ціни…");
    expect(screen.queryByRole("list")).toBeNull();
  });
});
