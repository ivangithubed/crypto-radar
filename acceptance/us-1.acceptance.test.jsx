import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { topMarkets } from "./support/fake-coingecko.js";
import {
  coinItem,
  coinLinks,
  coinNames,
  main,
  norm,
  openApp,
  rankElement,
  waitForList,
} from "./support/app.jsx";

describe("US-1: Перегляд списку топ-50", () => {
  test("AC-1.1 відвідувач бачить дані монет у списку", async () => {
    openApp("#/");
    await waitForList();
    const card = coinItem("Bitcoin");
    const text = norm(card.textContent);
    expect(text).toContain("BTC");
    expect(text).toContain("$67 250,10");
    expect(text).toContain("+4,2 %");
    expect(text).toContain("$1,32 трлн");
    expect(rankElement(card, 1)).toBeInTheDocument();
  });

  test("AC-1.2 список відкривається без входу й реєстрації", async () => {
    openApp("#/");
    await waitForList();
    expect(coinLinks().length).toBeGreaterThan(0);
    expect(screen.queryByText(/увійти|увійдіть|зареєстр|вхід|пароль/i)).toBeNull();
  });

  test("AC-1.3 «Показати більше»: 0 натискань → 25 монет і кнопку видно", async () => {
    openApp("#/");
    await waitForList();
    expect(coinLinks()).toHaveLength(25);
    expect(screen.getByRole("button", { name: "Показати більше" })).toBeInTheDocument();
  });

  test("AC-1.3 «Показати більше»: 1 натискання → 50 монет і кнопки не видно", async () => {
    openApp("#/");
    await waitForList();
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(coinLinks()).toHaveLength(50);
    expect(screen.queryByRole("button", { name: "Показати більше" })).toBeNull();
  });

  test.each([
    { name: "Bitcoin", rank: 1 },
    { name: "Монета-49", rank: 49 },
    { name: "Монета-50", rank: 50 },
  ])("AC-1.4 монета топ-50 є в списку: $name на місці $rank", async ({ name, rank }) => {
    openApp("#/");
    await waitForList();
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(rankElement(coinItem(name), rank)).toBeInTheDocument();
  });

  test("AC-1.4 монети з місцем 51 у списку немає: Монета-51", async () => {
    openApp("#/");
    await waitForList();
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    expect(coinLinks()).toHaveLength(50);
    expect(coinNames()).not.toContain("Монета-51");
    expect(within(main()).queryByText("Монета-51")).toBeNull();
  });

  test.each([
    { change: 4.2, shown: "+4,2 %", direction: "зростання" },
    { change: 0.06, shown: "+0,1 %", direction: "зростання" },
    { change: 0.05, shown: "+0,1 %", direction: "зростання" },
    { change: 0.04, shown: "0,0 %", direction: "без змін" },
    { change: 0, shown: "0,0 %", direction: "без змін" },
    { change: -0.04, shown: "0,0 %", direction: "без змін" },
    { change: -0.05, shown: "−0,1 %", direction: "падіння" },
    { change: -0.06, shown: "−0,1 %", direction: "падіння" },
    { change: -3.7, shown: "−3,7 %", direction: "падіння" },
  ])(
    "AC-1.5 знак зміни за 7 днів: $change → $shown ($direction)",
    async ({ change, shown, direction }) => {
      openApp("#/", { markets: topMarkets({ overrides: { 1: { change } } }) });
      await waitForList();
      const text = norm(coinItem("Bitcoin").textContent);
      expect(text).toContain(shown);
      expect(text).toContain(direction);
      // Округлене 0,0 % показується без знака.
      expect(text).not.toMatch(/[+−-]0,0 %/);
    },
  );
});
