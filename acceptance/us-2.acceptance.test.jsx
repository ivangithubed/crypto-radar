import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "../src/app/App.jsx";
import {
  chooseSort,
  coinLinks,
  coinNames,
  main,
  norm,
  openApp,
  search,
  waitForError,
  waitForList,
} from "./support/app.jsx";

const PRICE = "Ціна: від найдорожчої";
const GAIN = "Зміна за 7 днів: найбільше зростання";
const LOSS = "Зміна за 7 днів: найбільше падіння";
const CAP = "Капіталізація: від найбільшої";

const position = (name) => coinNames().indexOf(name);
const selectedSort = () =>
  norm(screen.getByLabelText("Сортування").selectedOptions[0].textContent).trim();

describe("US-2: Сортування списку", () => {
  test("AC-2.1 типове сортування за ціною від найдорожчої", async () => {
    openApp("#/");
    await waitForList();
    expect(selectedSort()).toBe(PRICE);
    expect(position("Bitcoin")).toBeLessThan(position("Ethereum"));
    expect(position("Ethereum")).toBeLessThan(position("Solana"));
  });

  test.each([
    { sort: GAIN, first: "Solana", last: "Ethereum" },
    { sort: LOSS, first: "Ethereum", last: "Solana" },
    { sort: CAP, first: "Bitcoin", last: "Solana" },
  ])("AC-2.2 відвідувач змінює сортування: $sort", async ({ sort, first, last }) => {
    openApp("#/");
    await waitForList();
    chooseSort(sort);
    // Після зміни сортування видно 25 монет (AC-2.3); щоб порівняти всі три, показуємо 50.
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    const three = ["Bitcoin", "Ethereum", "Solana"].sort((a, b) => position(a) - position(b));
    expect(three[0]).toBe(first);
    expect(three[2]).toBe(last);
    expect(three.every((name) => position(name) >= 0)).toBe(true);
  });

  test("AC-2.3 сортування охоплює весь топ-50 і повертає до перших 25", async () => {
    openApp("#/");
    await waitForList();
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    chooseSort(GAIN);
    expect(coinNames()[0]).toBe("Монета-48");
    expect(coinLinks()).toHaveLength(25);
  });

  test("AC-2.4 монети з однаковою зміною впорядковані за місцем у рейтингу", async () => {
    openApp("#/");
    await waitForList();
    chooseSort(GAIN);
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(position("Tether")).toBeGreaterThanOrEqual(0);
    expect(position("Tether")).toBeLessThan(position("USD Coin"));
  });

  test("AC-2.5 новий візит повертає типове сортування", async () => {
    openApp("#/");
    await waitForList();
    chooseSort(CAP);
    expect(selectedSort()).toBe(CAP);
    cleanup();
    window.location.hash = "#/";
    render(<App />);
    await waitForList();
    expect(selectedSort()).toBe(PRICE);
  });

  test("AC-2.6 сортування недоступне під час помилки даних", async () => {
    openApp("#/", { mode: "429" });
    await waitForError();
    expect(screen.queryByLabelText("Сортування")).toBeNull();
    expect(coinLinks()).toHaveLength(0);
    expect(norm(main().textContent)).not.toContain("$");
  });

  test("AC-2.7 сортування результатів пошуку без збігів", async () => {
    openApp("#/");
    await waitForList();
    search("zzzz");
    expect(await screen.findByText("Нічого не знайдено")).toBeInTheDocument();
    chooseSort(CAP);
    expect(screen.getByText("Нічого не знайдено")).toBeInTheDocument();
  });

  test("AC-2.8 результати пошуку впорядковані за обраним сортуванням", async () => {
    openApp("#/");
    await waitForList();
    chooseSort(GAIN);
    search("o");
    await screen.findByRole("link", { name: "Solana" });
    expect(position("Solana")).toBeLessThan(position("Bitcoin"));
    expect(coinNames()).not.toContain("Ethereum");
  });
});
