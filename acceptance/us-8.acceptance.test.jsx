import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { NOW, topMarkets } from "./support/fake-coingecko.js";
import {
  LONG_WAIT,
  coinLinks,
  coinNames,
  coinItem,
  main,
  norm,
  openApp,
  waitForError,
  waitForList,
} from "./support/app.jsx";

const RETRY = "Спробувати ще раз";

function expectNoPrices() {
  const text = norm(main().textContent);
  expect(text).not.toContain("$");
  expect(text).not.toMatch(/\d+,\d %/);
  expect(text).not.toMatch(/трлн|млрд|млн/);
}

describe("US-8: Недоступні або застарілі дані", () => {
  test("AC-8.1 джерело даних недоступне", async () => {
    openApp("#/", { mode: "503" });
    const alert = await waitForError();
    expect(within(alert).getByRole("button", { name: RETRY })).toBeInTheDocument();
    expect(coinLinks()).toHaveLength(0);
    expectNoPrices();
  });

  test("AC-8.2 спробувати ще раз після відновлення джерела", async () => {
    const { source } = openApp("#/", { mode: "429" });
    await waitForError();
    source.mode = "ok";
    fireEvent.click(screen.getByRole("button", { name: RETRY }));
    await waitForList();
    expect(coinLinks()).toHaveLength(25);
    expect(norm(coinItem("Bitcoin").textContent)).toContain("$67 250,10");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("AC-8.3 спроба ще раз, коли джерело все ще недоступне", async () => {
    const { source } = openApp("#/", { mode: "429" });
    await waitForError();
    const callsBefore = source.calls.length;
    fireEvent.click(screen.getByRole("button", { name: RETRY }));
    await waitFor(
      () => expect(screen.getByText(/Не вдалося оновити ціни/)).toBeInTheDocument(),
      LONG_WAIT,
    );
    expect(source.calls.length).toBeGreaterThan(callsBefore);
    const alert = screen.getByRole("alert");
    const retry = within(alert).getByRole("button", { name: RETRY });
    expect(retry).not.toHaveAttribute("aria-disabled", "true");
    expectNoPrices();
  });

  test.each([
    { age: 299, label: "4 хв 59 с" },
    { age: 300, label: "5 хв 0 с" },
  ])("AC-8.4 межа свіжості: дані $label тому → список монет із цінами", async ({ age }) => {
    openApp("#/", { markets: topMarkets({ ageSeconds: age }) });
    await waitForList();
    expect(norm(coinItem("Bitcoin").textContent)).toContain("$67 250,10");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("AC-8.4 межа свіжості: дані 5 хв 1 с тому → помилка даних без цін", async () => {
    openApp("#/", { markets: topMarkets({ ageSeconds: 301 }) });
    const alert = await waitForError();
    expect(norm(alert.textContent)).toContain("Ціни застаріли");
    expectNoPrices();
  });

  test("AC-8.5 дані застаріли, поки екран відкритий", async () => {
    const { source } = openApp("#/");
    await waitForList();
    source.mode = "503";
    vi.setSystemTime(new Date(NOW.getTime() + 301 * 1000));
    await waitForError();
    expect(coinLinks()).toHaveLength(0);
    expectNoPrices();
  });

  test("AC-8.6 обрані не втрачаються під час помилки даних", async () => {
    const { source } = openApp("#/favorites", { mode: "429", favorites: ["bitcoin", "ethereum"] });
    await waitForError();
    expectNoPrices();
    source.mode = "ok";
    fireEvent.click(screen.getByRole("button", { name: RETRY }));
    await waitFor(() => expect(coinNames()).toEqual(["Bitcoin", "Ethereum"]), LONG_WAIT);
    expect(norm(coinItem("Bitcoin").textContent)).toContain("$67 250,10");
    expect(JSON.parse(window.localStorage.getItem("crypto-radar:favorites"))).toEqual([
      "bitcoin",
      "ethereum",
    ]);
  });

  test("AC-8.7 графік недоступний на сторінці монети", async () => {
    openApp("#/coin/bitcoin", { markets: topMarkets({ overrides: { 1: { sparkline: [] } } }) });
    const alert = await waitForError();
    expect(within(alert).getByRole("button", { name: RETRY })).toBeInTheDocument();
    expect(screen.queryByText(/Ціна за 7 днів: на початку/)).toBeNull();
    expect(norm(main().textContent)).not.toContain("$");
  });

  test("AC-8.8 завантаження даних", async () => {
    openApp("#/", { mode: "pending" });
    expect(await screen.findByText("Завантажуємо ціни…", {}, LONG_WAIT)).toBeInTheDocument();
    expect(coinLinks()).toHaveLength(0);
  });
});
