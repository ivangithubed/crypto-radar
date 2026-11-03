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
    expect(await heading("Топ-50 монет")).toHaveFocus();

    fireEvent.click(screen.getByRole("link", { name: /^Обрані/ }));
    expect(await heading("Обрані")).toHaveFocus();
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
