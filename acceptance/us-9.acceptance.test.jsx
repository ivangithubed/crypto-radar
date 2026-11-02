import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { topMarkets } from "./support/fake-coingecko.js";
import { DISCLAIMER, LONG_WAIT, norm, openApp, waitForError } from "./support/app.jsx";

const SCREENS = [
  { screen: "список монет", hash: "#/", heading: "Топ-50 монет", favorites: undefined },
  { screen: "обрані", hash: "#/favorites", heading: "Обрані", favorites: ["bitcoin"] },
  {
    screen: "сторінку монети Bitcoin",
    hash: "#/coin/bitcoin",
    heading: "Bitcoin",
    favorites: undefined,
  },
];

// Латиницею дозволено лише назви монет, тікери, атрибуцію (трекер, 2026-11-02 19:46) і слова
// схваленої примітки про приватність UX §5.2 `footer.privacy` («cookies», «GitHub», «CoinGecko»).
const ALLOWED_LATIN = [
  "Powered by CoinGecko",
  "CoinGecko",
  "GitHub",
  "cookies",
  ...topMarkets().flatMap((coin) => [coin.name, coin.symbol.toUpperCase()]),
].sort((a, b) => b.length - a.length);

async function openScreen({ hash, heading, favorites }) {
  openApp(hash, { favorites });
  await screen.findByRole("heading", { level: 1, name: heading }, LONG_WAIT);
}

function expectAttribution() {
  const link = screen.getByRole("link", { name: /Powered by CoinGecko/ });
  expect(link).toHaveAttribute("href", "https://www.coingecko.com/en/api");
}

describe("US-9: Дисклеймер, джерело даних і чистий інтерфейс", () => {
  test.each(SCREENS)("AC-9.1 дисклеймер і джерело даних: $screen", async (params) => {
    await openScreen(params);
    await waitFor(() => expect(norm(document.body.textContent)).toContain("$"), LONG_WAIT);
    expect(screen.getByText(DISCLAIMER, { exact: false })).toBeInTheDocument();
    expectAttribution();
  });

  test("AC-9.2 дисклеймер видно й під час помилки даних", async () => {
    openApp("#/", { mode: "429" });
    await waitForError();
    expect(screen.getByText(DISCLAIMER, { exact: false })).toBeInTheDocument();
    expectAttribution();
  });

  test.each(SCREENS)("AC-9.3 інтерфейс українською без реклами: $screen", async (params) => {
    await openScreen(params);
    await waitFor(() => expect(norm(document.body.textContent)).toContain("$"), LONG_WAIT);
    let text = norm(document.body.textContent);
    for (const allowed of ALLOWED_LATIN) {
      text = text.split(allowed).join(" ");
    }
    expect(text.match(/[A-Za-z]+/g) ?? []).toEqual([]);
    // Реклама й банери сторонніх сервісів: жодних iframe, сторонніх зображень і спливних діалогів.
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
    const images = Array.from(document.querySelectorAll("img")).map(
      (img) => img.getAttribute("src") ?? "",
    );
    expect(
      images.filter(
        (src) => /^https?:/.test(src) && !src.startsWith("https://coin-images.coingecko.com/"),
      ),
    ).toEqual([]);
  });
});
