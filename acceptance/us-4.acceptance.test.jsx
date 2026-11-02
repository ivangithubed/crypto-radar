import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  LONG_WAIT,
  main,
  norm,
  openApp,
  rankElement,
  search,
  waitForList,
} from "./support/app.jsx";

const CHART_ALT = /Ціна за 7 днів: на початку/;

async function openCoinFromList(name) {
  fireEvent.click(within(main()).getByRole("link", { name }));
  return screen.findByRole("heading", { level: 1, name }, LONG_WAIT);
}

describe("US-4: Сторінка монети з графіком за 7 днів", () => {
  test("AC-4.1 відвідувач бачить дані монети й графік за 7 днів", async () => {
    openApp("#/");
    await waitForList();
    await openCoinFromList("Bitcoin");
    const text = norm(main().textContent);
    expect(text).toContain("BTC");
    expect(text).toContain("$67 250,10");
    expect(text).toContain("+4,2 %");
    expect(text).toContain("$1,32 трлн");
    expect(rankElement(main(), 1)).toBeInTheDocument();
    expect(screen.getByText("Графік за 7 днів")).toBeInTheDocument();
    const alt = norm(screen.getByText(CHART_ALT).textContent);
    expect(alt).toMatch(/на початку \$64 540/);
    expect(alt).toMatch(/наприкінці \$67 250/);
    expect(alt).toMatch(/мінімум \$64 540/);
    expect(alt).toMatch(/максимум \$67 250/);
  });

  test("AC-4.2 інших періодів графіка немає", async () => {
    openApp("#/coin/bitcoin");
    await screen.findByRole("heading", { level: 1, name: "Bitcoin" }, LONG_WAIT);
    expect(screen.getByText(CHART_ALT)).toBeInTheDocument();
    const content = within(main());
    expect(content.queryAllByRole("combobox")).toHaveLength(0);
    expect(content.queryAllByRole("radio")).toHaveLength(0);
    expect(content.queryAllByRole("tab")).toHaveLength(0);
    expect(content.queryByText(/24 год|30 днів|90 днів|1 рік|за місяць|за рік/)).toBeNull();
  });

  test("AC-4.3 сторінка монети на межі топ-50: Монета-50 (місце 50)", async () => {
    openApp("#/coin/moneta-50");
    await screen.findByRole("heading", { level: 1, name: "Монета-50" }, LONG_WAIT);
    expect(rankElement(main(), 50)).toBeInTheDocument();
    expect(norm(main().textContent)).toContain("$");
    expect(screen.getByText(CHART_ALT)).toBeInTheDocument();
  });

  test("AC-4.3 сторінка монети на межі топ-50: Монета-51 (місце 51)", async () => {
    openApp("#/coin/moneta-51");
    await screen.findByRole("heading", { level: 1, name: "Монета зараз поза топ-50" }, LONG_WAIT);
    expect(norm(main().textContent)).not.toContain("$");
    expect(screen.queryByText(CHART_ALT)).toBeNull();
    expect(screen.queryByText("Графік за 7 днів")).toBeNull();
  });

  test("AC-4.4 сторінку монети відкривають із результатів пошуку", async () => {
    openApp("#/");
    await waitForList();
    search("btc");
    await screen.findByRole("link", { name: "Bitcoin" });
    await openCoinFromList("Bitcoin");
    expect(screen.getByText(CHART_ALT)).toBeInTheDocument();
  });
});
