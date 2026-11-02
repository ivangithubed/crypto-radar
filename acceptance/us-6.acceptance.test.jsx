import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TOP_IDS, topMarkets } from "./support/fake-coingecko.js";
import {
  LONG_WAIT,
  coinItem,
  coinLinks,
  coinNames,
  norm,
  openApp,
  rankElement,
} from "./support/app.jsx";

const EMPTY_TITLE = "Тут поки порожньо";
const OUT_OF_TOP = "Зараз поза топ-50";

async function openFavorites(favorites, sourceOptions = {}) {
  openApp("#/favorites", { favorites, ...sourceOptions });
  await screen.findByRole("heading", { level: 1, name: "Обрані" }, LONG_WAIT);
}

const favoritesList = () => screen.findByRole("list", { name: /^Обрані монети/ }, LONG_WAIT);

describe("US-6: Перегляд обраних при наступному візиті", () => {
  test("AC-6.1 обрані зберігаються між візитами на тому самому пристрої", async () => {
    await openFavorites(["bitcoin", "ethereum", "solana"]);
    await waitFor(() => expect(coinNames()).toEqual(["Bitcoin", "Ethereum", "Solana"]));
    expect(norm(coinItem("Bitcoin").textContent)).toContain("$67 250,10");
    expect(norm(coinItem("Solana").textContent)).toContain("$150,40");
  });

  test("AC-6.2 на іншому пристрої обрані окремі", async () => {
    await openFavorites(undefined);
    expect(await screen.findByText(EMPTY_TITLE, {}, LONG_WAIT)).toBeInTheDocument();
    expect(coinLinks()).toHaveLength(0);
  });

  test("AC-6.3 порожні обрані", async () => {
    await openFavorites([]);
    expect(await screen.findByText(EMPTY_TITLE, {}, LONG_WAIT)).toBeInTheDocument();
    expect(screen.getByText(/Натисніть кнопку «Додати в обрані»/)).toBeInTheDocument();
  });

  test("AC-6.4 монета, що вибула з топ-50, лишається в обраних з позначкою", async () => {
    await openFavorites(["moneta-x", "bitcoin"]);
    const items = within(await favoritesList()).getAllByRole("listitem");
    const last = items[items.length - 1];
    const text = norm(last.textContent);
    expect(text).toContain("moneta-x");
    expect(text).toContain(OUT_OF_TOP);
    expect(text).not.toContain("$");
    expect(
      within(last).getByRole("button", { name: "Прибрати з обраних: moneta-x" }),
    ).toBeInTheDocument();
    expect(norm(items[0].textContent)).toContain("Bitcoin");
  });

  test("AC-6.5 кількість монет в обраних: 0 → пояснення, як додати монету", async () => {
    await openFavorites([]);
    expect(await screen.findByText(EMPTY_TITLE, {}, LONG_WAIT)).toBeInTheDocument();
  });

  test.each([1, 50])(
    "AC-6.5 кількість монет в обраних: %i → стільки ж монет з даними",
    async (count) => {
      await openFavorites(TOP_IDS.slice(0, count));
      await waitFor(() => expect(coinLinks()).toHaveLength(count), LONG_WAIT);
      expect(norm(coinItem("Bitcoin").textContent)).toContain("$67 250,10");
    },
  );

  test("AC-6.6 монета повернулася в топ-50", async () => {
    const markets = topMarkets({
      overrides: { 50: { id: "moneta-x", name: "Монета-X", symbol: "mx" } },
    });
    await openFavorites(["moneta-x"], { markets });
    await waitFor(() => expect(coinNames()).toEqual(["Монета-X"]), LONG_WAIT);
    const card = coinItem("Монета-X");
    expect(rankElement(card, 50)).toBeInTheDocument();
    expect(norm(card.textContent)).toContain("$");
    expect(norm(card.textContent)).not.toContain(OUT_OF_TOP);
  });

  test("AC-6.7 обрані впорядковано за місцем у рейтингу", async () => {
    await openFavorites(["solana", "bitcoin"]);
    await waitFor(() => expect(coinNames()).toEqual(["Bitcoin", "Solana"]), LONG_WAIT);
  });
});
