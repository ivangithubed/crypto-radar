import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import stablecoins from "../test/fixtures/stablecoins.json";
import App from "./App.jsx";

const UPDATED = new Date("2026-11-02T22:11:56.000Z");
const ok = (data) => ({ ok: true, status: 200, json: async () => data });

beforeEach(() => {
  window.matchMedia = (query) => ({
    matches: true,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
  window.localStorage.clear();
  window.location.hash = "#/";
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(UPDATED.getTime() + 60000) });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => ok(String(url).includes("category=stablecoins") ? stablecoins : top50)),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.location.hash = "";
  window.localStorage.clear();
});

const heading = (name) => screen.findByRole("heading", { level: 1, name });
const rows = () =>
  screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.includes("/coin/"));

describe("BUG-002: стан списку в межах вкладки", () => {
  it("повернення зі сторінки монети відновлює сортування, пошук і кількість; новий App — типове", async () => {
    render(<App />);
    await screen.findByRole("link", { name: "Bitcoin" });
    fireEvent.change(screen.getByLabelText("Сортування"), { target: { value: "cap" } });
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(rows()).toHaveLength(50);

    fireEvent.click(screen.getByRole("link", { name: "Bitcoin" }));
    fireEvent.click(await screen.findByRole("link", { name: "← До списку монет" }));
    await screen.findByLabelText("Сортування");
    expect(screen.getByLabelText("Сортування")).toHaveValue("cap");
    expect(rows()).toHaveLength(50);

    fireEvent.change(screen.getByLabelText("Пошук монети"), { target: { value: "sol" } });
    fireEvent.click(screen.getByRole("link", { name: "Solana" }));
    await heading("Solana");
    window.history.back();
    await waitFor(() => expect(screen.getByLabelText("Пошук монети")).toHaveValue("sol"));
    expect(screen.getByLabelText("Сортування")).toHaveValue("cap");

    cleanup();
    window.location.hash = "#/";
    render(<App />);
    await screen.findByRole("link", { name: "Bitcoin" });
    expect(screen.getByLabelText("Сортування")).toHaveValue("price");
    expect(screen.getByLabelText("Пошук монети")).toHaveValue("");
    expect(rows()).toHaveLength(25);
  });
});

describe("BUG-005: фокус на h1 після зміни маршруту", () => {
  it("перше відкриття фокус не забирає, перехід ставить його на h1 нового екрана", async () => {
    render(<App />);
    await heading("Топ-50 монет");
    await screen.findByRole("link", { name: "Bitcoin" });
    expect(document.body).toHaveFocus();

    fireEvent.click(screen.getByRole("link", { name: "Bitcoin" }));
    expect(await heading("Bitcoin")).toHaveFocus();

    fireEvent.click(screen.getByRole("link", { name: "← До списку монет" }));
    await heading("Топ-50 монет");
    expect(await screen.findByRole("link", { name: "Bitcoin" })).toHaveFocus();

    fireEvent.click(screen.getByRole("link", { name: /^Обрані/ }));
    expect(await heading("Обрані")).toHaveFocus();
  });
});

describe("TD-023: фокус після повернення зі сторінки монети", () => {
  it("стоїть на посиланні цієї монети без прокрутки до нього; «Назад» браузера — так само", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    try {
      render(<App />);
      fireEvent.click(await screen.findByRole("link", { name: "Ethereum" }));
      await heading("Ethereum");
      window.history.back();
      await waitFor(() => expect(screen.getByRole("link", { name: "Ethereum" })).toHaveFocus());
      const linkFocus = focus.mock.calls.filter((_, i) => focus.mock.instances[i]?.tagName === "A");
      expect(linkFocus.length).toBeGreaterThanOrEqual(1);
      expect(linkFocus.every(([options]) => options?.preventScroll === true)).toBe(true);
    } finally {
      focus.mockRestore();
    }
  });

  it("монети немає серед показаних у списку → фокус на h1", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    window.location.hash = "#/coin/shiba-inu";
    render(<App />);
    await heading("Shiba Inu");
    fireEvent.click(screen.getByRole("link", { name: "← До списку монет" }));
    expect(await heading("Топ-50 монет")).toHaveFocus();
    expect(rows().some((a) => a.textContent.includes("Shiba Inu"))).toBe(false);
  });

  it("TD-025: посилання монети поза екраном після повернення → фокус на h1, а не нижче екрана", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function () {
        const below = this.tagName === "A" && this.getAttribute("href") === "#/coin/ethereum";
        return {
          top: below ? 2000 : 0,
          bottom: below ? 2040 : 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
        };
      });
    try {
      render(<App />);
      fireEvent.click(await screen.findByRole("link", { name: "Ethereum" }));
      await heading("Ethereum");
      window.history.back();
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1, name: "Топ-50 монет" })).toHaveFocus(),
      );
    } finally {
      rect.mockRestore();
    }
  });

  it("зі сторінки монети на вкладку «Обрані» → фокус на h1, хоча картка цієї монети є", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    window.localStorage.setItem("crypto-radar:favorites", JSON.stringify(["bitcoin", "ethereum"]));
    window.location.hash = "#/coin/ethereum";
    render(<App />);
    await heading("Ethereum");
    fireEvent.click(screen.getByRole("link", { name: /^Обрані/ }));
    expect(await heading("Обрані")).toHaveFocus();
    expect(screen.getByRole("link", { name: "Ethereum" })).not.toHaveFocus();
  });
});

describe("Фокус без стрибка: прокрутка після переходу (рішення власника 2026-11-03)", () => {
  it("фокус (h1, посилання монети) без прокрутки до нього; список повертається на свою позицію, сторінка монети — на початок", async () => {
    const scrollTo = vi.fn((x, y) => {
      window.scrollY = y;
    });
    vi.stubGlobal("scrollTo", scrollTo);
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(<App />);
    await screen.findByRole("link", { name: "Bitcoin" });

    window.scrollY = 1240;
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("link", { name: "Bitcoin" }));
    expect(await heading("Bitcoin")).toHaveFocus();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("link", { name: "← До списку монет" }));
    await heading("Топ-50 монет");
    expect(await screen.findByRole("link", { name: "Bitcoin" })).toHaveFocus();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1240);
    const routeFocus = focus.mock.calls.filter((_, i) =>
      ["H1", "A"].includes(focus.mock.instances[i]?.tagName),
    );
    expect(routeFocus.length).toBeGreaterThanOrEqual(2);
    expect(routeFocus.every(([options]) => options?.preventScroll === true)).toBe(true);
    focus.mockRestore();
    window.scrollY = 0;
  });

  it("h1 з tabIndex=-1: рамки немає при фокусі мишею, є при :focus-visible (клавіатура)", async () => {
    vi.stubGlobal("scrollTo", vi.fn());
    for (const [hash, name] of [
      ["#/", "Топ-50 монет"],
      ["#/coin/bitcoin", "Bitcoin"],
      ["#/favorites", "Обрані"],
      ["#/abc", "Сторінку не знайдено"],
    ]) {
      window.location.hash = hash;
      render(<App />);
      const h1 = await heading(name);
      expect(h1).toHaveAttribute("tabindex", "-1");
      expect(h1).toHaveClass(
        "[&:focus:not(:focus-visible)]:outline-none",
        "focus-visible:outline-2",
      );
      cleanup();
    }
  });
});

describe("BUG-008: ім'я кнопки обраних", () => {
  it("дорівнює «Додати в обрані: Bitcoin» і змінюється на «Прибрати з обраних: Bitcoin»", async () => {
    window.location.hash = "#/coin/bitcoin";
    render(<App />);
    await heading("Bitcoin");
    fireEvent.click(screen.getByRole("button", { name: "Додати в обрані: Bitcoin" }));
    expect(screen.getByRole("button", { name: "Прибрати з обраних: Bitcoin" })).toBeInTheDocument();
  });
});
