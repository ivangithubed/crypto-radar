import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import top50 from "../../test/fixtures/markets-top50.json";
import stablecoins from "../../test/fixtures/stablecoins.json";
import { MarketDataProvider } from "../../market-data/index.js";
import { CoinPage } from "./index.js";

const FAVORITES_KEY = "crypto-radar:favorites";
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const norm = (text) => text.replace(/[\u00a0\u202f]/g, " ");

function freshMarkets(mutate = (coins) => coins) {
  const updated = new Date(Date.now() - 60000).toISOString();
  return mutate(top50.map((coin) => ({ ...coin, last_updated: updated })));
}

function stubFetch({ markets = freshMarkets(), top } = {}) {
  const mock = vi.fn(async (url) => {
    if (String(url).includes("category=stablecoins")) return ok(stablecoins);
    return top ? top() : ok(markets);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function renderPage(id = "bitcoin") {
  return render(
    <MarketDataProvider>
      <MemoryRouter initialEntries={[`/coin/${id}`]}>
        <Routes>
          <Route path="/coin/:id" element={<CoinPage />} />
          <Route path="/" element={<p>Список</p>} />
        </Routes>
      </MemoryRouter>
    </MarketDataProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CoinPage", () => {
  it("Data: заголовок, ціна, час цін, текстова альтернатива графіка й список даних", async () => {
    const fetchMock = stubFetch();
    const { container } = renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Bitcoin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← До списку монет" })).toHaveAttribute("href", "/");
    expect(norm(container.textContent)).toContain("$76 768,00");
    expect(screen.getByText(/^Ціни на \d\d:\d\d$/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /^Графік за 7 днів/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Ціна за 7 днів: на початку/)).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(container.querySelector("img")).toHaveAttribute("width", "40");
    const list = container.querySelector("dl");
    expect(within(list).getByText("1")).toBeInTheDocument();
    expect(within(list).getByText("BTC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Що означає «Волатильність»?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Що означає «Капіталізація»?" })).toBeInTheDocument();
    expect(screen.queryByText("Стейблкоїн")).toBeNull();
    // NFR-3: сторінка не робить запитів понад знімок топ-50 і стейблкоїни.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("Data: зміна за 7 днів має текст для зчитувача", async () => {
    stubFetch();
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Bitcoin" });
    expect(screen.getAllByText(/^(зростання на|падіння на|без змін)/).length).toBeGreaterThan(0);
  });

  it("стейблкоїн: мітка «Стейблкоїн» і підказка", async () => {
    stubFetch();
    renderPage("tether");
    await screen.findByRole("heading", { level: 1, name: "Tether" });
    await waitFor(() => expect(screen.getByText("Стейблкоїн")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Що означає «Стейблкоїн»?" })).toBeInTheDocument();
  });

  it("поза топ-50: h1, пояснення, без цін і кнопки «Додати…»", async () => {
    stubFetch();
    const { container } = renderPage("moneta-51");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Монета зараз поза топ-50" }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("$");
    expect(screen.queryByText("Графік за 7 днів")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^Додати в обрані/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /^Прибрати з обраних/ })).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Відкрити топ-50" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Монета поза топ-50 — Крипто-Радар");
  });

  it("поза топ-50 в обраних: лише «Прибрати з обраних: {id}», дія прибирає з обраних", async () => {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(["moneta-51"]));
    stubFetch();
    renderPage("moneta-51");
    await screen.findByRole("heading", { level: 1, name: "Монета зараз поза топ-50" });
    const button = screen.getByRole("button", { name: "Прибрати з обраних: moneta-51" });
    fireEvent.click(button);
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_KEY))).toEqual([]);
    expect(screen.queryAllByRole("button", { name: /обран/ })).toHaveLength(0);
    expect(screen.getByText("moneta-51 прибрано з обраних")).toBeInTheDocument();
  });

  it("порожній sparkline: блок помилки замість цін і графіка (AC-8.7), повтор запитує знімок", async () => {
    const markets = freshMarkets((coins) =>
      coins.map((coin) =>
        coin.id === "bitcoin" ? { ...coin, sparkline_in_7d: { price: [] } } : coin,
      ),
    );
    const fetchMock = stubFetch({ markets });
    const { container } = renderPage();
    const alert = await screen.findByRole("alert");
    expect(screen.getByRole("heading", { level: 1, name: "Bitcoin" })).toBeInTheDocument();
    expect(container.textContent).not.toContain("$");
    expect(screen.queryByText(/Ціна за 7 днів: на початку/)).toBeNull();
    const before = fetchMock.mock.calls.length;
    fireEvent.click(within(alert).getByRole("button", { name: "Спробувати ще раз" }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(before));
  });

  it("помилка джерела: h1 «Дані монети недоступні» й блок помилки без цін", async () => {
    stubFetch({ top: () => ({ ok: false, status: 429, json: async () => ({}) }) });
    const { container } = renderPage();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Дані монети недоступні" }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("$");
  });

  it("★ додає монету в localStorage й оголошує статус", async () => {
    stubFetch();
    renderPage("ethereum");
    await screen.findByRole("heading", { level: 1, name: "Ethereum" });
    fireEvent.click(screen.getByRole("button", { name: "Додати в обрані: Ethereum" }));
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_KEY))).toEqual(["ethereum"]);
    expect(
      screen.getByRole("button", { name: "Прибрати з обраних: Ethereum" }),
    ).not.toHaveAttribute("aria-pressed");
    expect(screen.getByText("Ethereum додано в обрані")).toBeInTheDocument();
    expect(document.title).toBe("Ethereum (ETH) — Крипто-Радар");
  });

  it("loading: скелетон і статус без цін", () => {
    stubFetch({ top: () => new Promise(() => {}) });
    const { container } = renderPage();
    expect(screen.getByText("Завантажуємо дані монети…")).toBeInTheDocument();
    expect(container.textContent).not.toContain("$");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
