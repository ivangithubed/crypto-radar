import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  LONG_WAIT,
  coinItem,
  coinLinks,
  hintButton,
  openApp,
  waitForList,
} from "./support/app.jsx";

// Початок тексту кожної підказки — дослівно UX §5.1 (без апострофів, щоб не залежати від їхнього символу).
const HINTS = {
  Капіталізація: "Скільки коштують усі монети цього виду разом",
  "Зміна за 7 днів":
    "На скільки відсотків ціна монети зараз вища (+) або нижча (−), ніж рівно тиждень тому.",
  Тікер: "Коротке позначення монети з кількох латинських літер",
  "Місце в рейтингу": "Номер монети серед усіх криптовалют за капіталізацією.",
  Стейблкоїн: "Монета, ціна якої прив",
  Волатильність: "Наскільки сильно й часто стрибає ціна.",
};

async function openScreen(hash, heading) {
  openApp(hash);
  if (heading) {
    await screen.findByRole("heading", { level: 1, name: heading }, LONG_WAIT);
  } else {
    await waitForList();
  }
}

describe("US-7: Підказки до термінів", () => {
  test.each([
    { hash: "#/", heading: null, term: "Капіталізація" },
    { hash: "#/", heading: null, term: "Зміна за 7 днів" },
    { hash: "#/", heading: null, term: "Тікер" },
    { hash: "#/", heading: null, term: "Місце в рейтингу" },
    { hash: "#/coin/bitcoin", heading: "Bitcoin", term: "Волатильність" },
    { hash: "#/coin/tether", heading: "Tether", term: "Стейблкоїн" },
  ])("AC-7.1 підказка до терміна «$term» ($hash)", async ({ hash, heading, term }) => {
    await openScreen(hash, heading);
    const button = await waitFor(() => hintButton(term), LONG_WAIT);
    expect(screen.queryByText(HINTS[term], { exact: false })).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(HINTS[term], { exact: false })).toBeInTheDocument();
  });

  test("AC-7.2 підказку можна закрити", async () => {
    await openScreen("#/", null);
    const button = hintButton("Капіталізація");
    fireEvent.click(button);
    expect(screen.getByText(HINTS.Капіталізація, { exact: false })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText(HINTS.Капіталізація, { exact: false })).toBeNull(),
    );
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(coinLinks()).toHaveLength(25);
  });

  test("AC-7.3 підказка про стейблкоїн лише біля стейблкоїнів", async () => {
    await openScreen("#/", null);
    // Tether ($1) за типовим сортуванням за ціною — серед других 25 монет.
    fireEvent.click(screen.getByRole("button", { name: "Показати більше" }));
    const tether = await waitFor(() => {
      const item = coinItem("Tether");
      expect(
        within(item).getByRole("button", { name: "Що означає «Стейблкоїн»?" }),
      ).toBeInTheDocument();
      return item;
    }, LONG_WAIT);
    expect(tether).toBeInTheDocument();
    expect(
      within(coinItem("Bitcoin")).queryByRole("button", { name: "Що означає «Стейблкоїн»?" }),
    ).toBeNull();
  });

  test("AC-7.4 підказку можна відкрити на телефоні", async () => {
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(false);
    await openScreen("#/", null);
    fireEvent.click(hintButton("Зміна за 7 днів"));
    expect(screen.getByText(HINTS["Зміна за 7 днів"], { exact: false })).toBeInTheDocument();
  });
});
