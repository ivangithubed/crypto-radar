import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  coinItem,
  coinLinks,
  coinNames,
  openApp,
  rankElement,
  search,
  waitForList,
} from "./support/app.jsx";

const NOTHING = "Нічого не знайдено";

describe("US-3: Пошук монети", () => {
  test.each([
    { query: "Bitcoin", coin: "Bitcoin" },
    { query: "bitc", coin: "Bitcoin" },
    { query: "btc", coin: "Bitcoin" },
    { query: "BCH", coin: "Bitcoin Cash" },
  ])("AC-3.1 пошук «$query» знаходить $coin без урахування регістру", async ({ query, coin }) => {
    openApp("#/");
    await waitForList();
    search(query);
    await waitFor(() => expect(coinNames()).toContain(coin));
  });

  test("AC-3.2 пошук знаходить монету, яку ще не догружено", async () => {
    openApp("#/");
    await waitForList();
    expect(coinLinks()).toHaveLength(25);
    expect(coinNames()).not.toContain("Bitcoin Cash");
    search("Bitcoin Cash");
    await waitFor(() => expect(coinNames()).toContain("Bitcoin Cash"));
    expect(rankElement(coinItem("Bitcoin Cash"), 30)).toBeInTheDocument();
  });

  test("AC-3.3 нічого не знайдено", async () => {
    openApp("#/");
    await waitForList();
    search("zzzz");
    expect(await screen.findByText(NOTHING)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Очистити пошук" }).length).toBeGreaterThan(0);
  });

  test("AC-3.4 очищений пошук повертає звичайний список", async () => {
    openApp("#/");
    await waitForList();
    search("zzzz");
    await screen.findByText(NOTHING);
    fireEvent.click(screen.getAllByRole("button", { name: "Очистити пошук" })[0]);
    await waitFor(() => expect(coinLinks()).toHaveLength(25));
    expect(screen.getByLabelText("Пошук монети")).toHaveValue("");
    expect(screen.queryByText(NOTHING)).toBeNull();
  });

  test("AC-3.5 монету поза топ-50 пошук не знаходить", async () => {
    openApp("#/");
    await waitForList();
    search("Монета-51");
    expect(await screen.findByText(NOTHING)).toBeInTheDocument();
  });

  // Браузер не дає ввести більше за maxlength; fireEvent його обходить, тож запит обрізаємо, як браузер.
  async function typeQuery(typed) {
    openApp("#/");
    await waitForList();
    const input = screen.getByLabelText("Пошук монети");
    expect(input).toHaveAttribute("maxlength", "50");
    const accepted = Math.min(typed, input.maxLength);
    search("s".repeat(Math.min(accepted, 1)) + "x".repeat(Math.max(0, accepted - 1)));
    return input;
  }

  test("AC-3.6 межі довжини запиту: введено 0 → прийнято 0, звичайний список", async () => {
    const input = await typeQuery(0);
    expect(input.value).toHaveLength(0);
    await waitFor(() => expect(coinLinks()).toHaveLength(25));
  });

  test("AC-3.6 межі довжини запиту: введено 1 → прийнято 1, результати за 1 символом", async () => {
    const input = await typeQuery(1);
    expect(input.value).toHaveLength(1);
    // «s» є в назвах Solana, Bitcoin Cash, USD Coin і в тікері USDT; у Bitcoin «s» немає.
    await waitFor(() => expect(coinNames()).not.toContain("Bitcoin"));
    expect(coinNames()).toEqual(expect.arrayContaining(["Solana", "Bitcoin Cash", "USD Coin"]));
  });

  test.each([50, 51])("AC-3.6 межі довжини запиту: введено %i → прийнято 50", async (typed) => {
    const input = await typeQuery(typed);
    expect(input.value).toHaveLength(50);
    expect(await screen.findByText(NOTHING)).toBeInTheDocument();
  });

  test("AC-3.7 запит лише з пробілів вважається порожнім", async () => {
    openApp("#/");
    await waitForList();
    search("   ");
    await waitFor(() => expect(coinLinks()).toHaveLength(25));
    expect(screen.queryByText(NOTHING)).toBeNull();
  });

  test("AC-3.8 пошук за українським написанням назви не підтримується", async () => {
    openApp("#/");
    await waitForList();
    search("біткоїн");
    expect(await screen.findByText(NOTHING)).toBeInTheDocument();
  });

  test("AC-3.9 пробіли на краях запиту ігноруються", async () => {
    openApp("#/");
    await waitForList();
    search("  btc  ");
    await waitFor(() => expect(coinNames()).toContain("Bitcoin"));
  });
});
