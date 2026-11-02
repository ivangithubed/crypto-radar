import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TOP_IDS } from "./support/fake-coingecko.js";
import {
  LONG_WAIT,
  coinLinks,
  coinNames,
  main,
  openApp,
  openFavoritesTab,
  storedFavorites,
  waitForList,
} from "./support/app.jsx";

const addButton = (name) => screen.queryByRole("button", { name: `Додати в обрані: ${name}` });
const removeButton = (name) =>
  screen.queryByRole("button", { name: `Прибрати з обраних: ${name}` });

describe("US-5: Додавання й прибирання обраних", () => {
  test("AC-5.1 додавання монети в обрані зі списку", async () => {
    openApp("#/");
    await waitForList();
    fireEvent.click(addButton("Bitcoin"));
    expect(removeButton("Bitcoin")).toBeInTheDocument();
    expect(storedFavorites()).toEqual(["bitcoin"]);
    await openFavoritesTab();
    await waitFor(() => expect(coinNames()).toContain("Bitcoin"));
    expect(screen.queryByText(/увійти|увійдіть|зареєстр|вхід|пароль/i)).toBeNull();
  });

  test("AC-5.2 додавання монети в обрані зі сторінки монети", async () => {
    openApp("#/coin/ethereum");
    await screen.findByRole("heading", { level: 1, name: "Ethereum" }, LONG_WAIT);
    fireEvent.click(addButton("Ethereum"));
    expect(storedFavorites()).toEqual(["ethereum"]);
    await openFavoritesTab();
    await waitFor(() => expect(coinNames()).toContain("Ethereum"));
  });

  test("AC-5.3 прибирання монети з обраних", async () => {
    openApp("#/", { favorites: ["bitcoin"] });
    await waitForList();
    fireEvent.click(removeButton("Bitcoin"));
    expect(addButton("Bitcoin")).toBeInTheDocument();
    expect(storedFavorites()).toEqual([]);
    await openFavoritesTab();
    expect(coinNames()).not.toContain("Bitcoin");
  });

  test("AC-5.4 монету не можна додати в обрані вдруге", async () => {
    openApp("#/", { favorites: ["bitcoin"] });
    await waitForList();
    expect(addButton("Bitcoin")).toBeNull();
    expect(removeButton("Bitcoin")).toBeInTheDocument();
    expect(storedFavorites().filter((id) => id === "bitcoin")).toHaveLength(1);
  });

  test("AC-5.5 монету поза топ-50 не можна додати в обрані", async () => {
    openApp("#/coin/moneta-51");
    await screen.findByRole("heading", { level: 1, name: "Монета зараз поза топ-50" }, LONG_WAIT);
    expect(within(main()).queryAllByRole("button", { name: /^Додати в обрані/ })).toHaveLength(0);
  });

  test.each([
    { before: 0, after: 1 },
    { before: 1, after: 2 },
    { before: 49, after: 50 },
  ])("AC-5.6 кількість обраних: було $before → стало $after", async ({ before, after }) => {
    const seeded = TOP_IDS.filter((id) => id !== "bitcoin").slice(0, before);
    openApp("#/", { favorites: seeded });
    await waitForList();
    fireEvent.click(addButton("Bitcoin"));
    expect(storedFavorites()).toHaveLength(after);
    await openFavoritesTab();
    await waitFor(() => expect(coinLinks()).toHaveLength(after));
  });

  test("AC-5.7 коли в обраних усі 50 монет, додавати більше нічого", async () => {
    openApp("#/", { favorites: TOP_IDS });
    await waitForList();
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(coinLinks()).toHaveLength(50);
    const content = within(main());
    expect(content.queryAllByRole("button", { name: /^Додати в обрані/ })).toHaveLength(0);
    expect(content.getAllByRole("button", { name: /^Прибрати з обраних/ })).toHaveLength(50);
  });
});
