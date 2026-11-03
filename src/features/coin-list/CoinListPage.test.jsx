import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketDataProvider } from "../../market-data/index.js";
import top50 from "../../test/fixtures/markets-top50.json";
import stablecoins from "../../test/fixtures/stablecoins.json";
import { CoinListPage } from "./index.js";

const UPDATED = new Date("2026-11-02T22:11:56.000Z");
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });

function stubFetch(top = () => ok(top50)) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => (String(url).includes("category=stablecoins") ? ok(stablecoins) : top())),
  );
}

function stubMedia(matches) {
  window.matchMedia = (query) => ({
    matches,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

function renderPage() {
  return render(
    <MarketDataProvider>
      <MemoryRouter>
        <main id="main">
          <CoinListPage />
        </main>
      </MemoryRouter>
    </MarketDataProvider>,
  );
}

const coinLinks = () =>
  within(screen.getByRole("main"))
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/coin/"));
const names = () => coinLinks().map((link) => link.textContent);
const waitForList = () => screen.findByRole("link", { name: "Bitcoin" });

beforeEach(() => {
  stubMedia(false);
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(UPDATED.getTime() + 60000) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("CoinListPage", () => {
  it("Data: 25 монет, «Показати більше» → 50 і фокус на 26-й; час цін", async () => {
    stubFetch();
    renderPage();
    await waitForList();
    expect(screen.getByRole("heading", { level: 1, name: "Топ-50 монет" })).toBeInTheDocument();
    expect(document.title).toBe("Топ-50 монет — Крипто-Радар");
    expect(coinLinks()).toHaveLength(25);
    expect(screen.getByText(/^Ціни на \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Монети, 25 з 50" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(coinLinks()).toHaveLength(50);
    expect(document.activeElement).toBe(coinLinks()[25]);
    expect(screen.getByText("Показано 50 з 50")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Показати більше" })).toBeNull();
  });

  it("пошук «btc» → 1 монета без «Показати більше» і статус після паузи", async () => {
    stubFetch();
    renderPage();
    await waitForList();
    const input = screen.getByLabelText("Пошук монети");
    expect(input).toHaveAttribute("maxlength", "50");
    fireEvent.change(input, { target: { value: "btc" } });
    expect(names()).toEqual(["Bitcoin"]);
    expect(screen.queryByRole("button", { name: "Показати більше" })).toBeNull();
    expect(await screen.findByText("Знайдено 1 монету")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Очистити пошук" }));
    expect(coinLinks()).toHaveLength(25);
    expect(input).toHaveValue("");
  });

  it("Empty (пошук): блок з «Очистити пошук»", async () => {
    stubFetch();
    renderPage();
    await waitForList();
    fireEvent.change(screen.getByLabelText("Пошук монети"), { target: { value: "zzzz" } });
    expect(screen.getByText("Нічого не знайдено")).toBeInTheDocument();
    expect(coinLinks()).toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Очистити пошук" })[0]);
    expect(coinLinks()).toHaveLength(25);
    expect(screen.queryByText("Нічого не знайдено")).toBeNull();
  });

  it("сортування за капіталізацією: типове — ціна, статус «Упорядковано»", async () => {
    stubFetch();
    renderPage();
    await waitForList();
    const select = screen.getByLabelText("Сортування");
    expect(select.selectedOptions[0].textContent).toBe("Ціна: від найдорожчої");
    expect(names()[0]).toBe("Bitcoin");
    fireEvent.change(select, { target: { value: "cap" } });
    expect(select.selectedOptions[0].textContent).toBe("Капіталізація: від найбільшої");
    expect(screen.getByText("Упорядковано: Капіталізація: від найбільшої")).toBeInTheDocument();
    expect(names()[0]).toBe("Bitcoin");
    fireEvent.change(select, { target: { value: "loss" } });
    expect(coinLinks()).toHaveLength(25);
  });

  it("★ додає й прибирає з обраних, без aria-pressed, зі статусом", async () => {
    stubFetch();
    renderPage();
    await waitForList();
    const add = screen.getByRole("button", { name: "Додати в обрані: Bitcoin" });
    expect(add).not.toHaveAttribute("aria-pressed");
    fireEvent.click(add);
    expect(JSON.parse(window.localStorage.getItem("crypto-radar:favorites"))).toEqual(["bitcoin"]);
    expect(screen.getByText("Bitcoin додано в обрані")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Прибрати з обраних: Bitcoin" }));
    expect(JSON.parse(window.localStorage.getItem("crypto-radar:favorites"))).toEqual([]);
    expect(screen.getByText("Bitcoin прибрано з обраних")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Додати в обрані: Bitcoin" })).toBeInTheDocument();
  });

  it("картка: місце, зміна зі стрілкою й текстом для зчитувача, мітка стейблкоїна", async () => {
    stubFetch();
    renderPage();
    await waitForList();
    const card = screen.getByRole("link", { name: "Bitcoin" }).closest("li");
    expect(within(card).getByText("1")).toBeInTheDocument();
    expect(card.textContent).toMatch(/[▲▼]/);
    expect(card.querySelector(".sr-only").textContent).toMatch(/зростання|падіння|без змін/);
    expect(within(card).queryByText("Стейблкоїн", { exact: false })).toBeNull();
    fireEvent.change(screen.getByLabelText("Пошук монети"), { target: { value: "tether" } });
    const tether = screen.getByRole("link", { name: "Tether" }).closest("li");
    expect(
      within(tether).getByRole("button", { name: "Що означає «Стейблкоїн»?" }),
    ).toBeInTheDocument();
  });

  it("Loading: справжня панель, «Завантажуємо ціни…», без монет і статусу пошуку", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    renderPage();
    expect(screen.getByText("Завантажуємо ціни…")).toBeInTheDocument();
    expect(screen.getByLabelText("Пошук монети")).toHaveAttribute("maxlength", "50");
    expect(screen.getByLabelText("Сортування")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Пошук монети"), { target: { value: "btc" } });
    expect(screen.getByRole("button", { name: "Очистити пошук" })).toBeInTheDocument();
    expect(coinLinks()).toHaveLength(0);
    expect(screen.queryByText("Нічого не знайдено")).toBeNull();
    expect(screen.getByRole("main").textContent).not.toContain("$");
  });

  it("Loading → Data: те саме поле, фокус і введений запит зберігаються", async () => {
    let release;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("category=stablecoins")) return ok(stablecoins);
        await new Promise((resolve) => {
          release = resolve;
        });
        return ok(top50);
      }),
    );
    renderPage();
    const input = screen.getByLabelText("Пошук монети");
    input.focus();
    fireEvent.change(input, { target: { value: "btc" } });
    release();
    await waitForList();
    expect(screen.getByLabelText("Пошук монети")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("btc");
    expect(names()).toEqual(["Bitcoin"]);
  });

  it("Error: блок помилки, рядок про обрані, без цін; повтор повертає список і фокус на h1", async () => {
    window.localStorage.setItem("crypto-radar:favorites", JSON.stringify(["bitcoin", "ethereum"]));
    let mode = 429;
    stubFetch(() => (mode === 429 ? fail(429) : ok(top50)));
    renderPage();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Ваші обрані збережені: 2 монети.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Сортування")).toBeNull();
    expect(screen.queryByLabelText("Пошук монети")).toBeNull();
    expect(screen.getByRole("main").textContent).not.toContain("$");
    mode = 200;
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    await waitForList();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 })),
    );
  });

  it("від 768 px: таблиця з caption і th scope=col, без списку карток", async () => {
    stubMedia(true);
    stubFetch();
    renderPage();
    await waitForList();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")[0]).toHaveAttribute("scope", "col");
    expect(table.querySelector("caption").textContent).toContain("Показано 25 з 50");
    expect(screen.queryByRole("list", { name: /Монети/ })).toBeNull();
    expect(screen.getByText(/оновлюються щохвилини/)).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(26);
  });
});
