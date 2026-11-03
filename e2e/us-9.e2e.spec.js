// Етап 8.b: US-9 «Дисклеймер, джерело даних і чистий інтерфейс» (02-requirements.md, @US-9) у справжньому браузері.
import { expect, test } from "@playwright/test";
import { DISCLAIMER, alertBlock, expectNoA11yViolations, norm, openApp } from "./support/app.js";
import { topMarkets } from "./support/coingecko.js";

const SCREENS = [
  { screen: "список монет", hash: "#/", heading: "Топ-50 монет", favorites: undefined },
  { screen: "обрані", hash: "#/favorites", heading: "Обрані", favorites: ["bitcoin"] },
  {
    screen: 'сторінку монети "Bitcoin"',
    hash: "#/coin/bitcoin",
    heading: "Bitcoin",
    favorites: undefined,
  },
];

// Латиницею дозволено лише назви монет, тікери, атрибуцію (трекер, 2026-11-02 19:46) і слова схваленої
// примітки про приватність UX §5.2 `footer.privacy` («cookies», «GitHub», «CoinGecko», «IP»), як в оракулі етапу 6,
// і назва браузера в схваленій пораді S-3 UX §5.2 `safari.*` (ADR 0006): у WebKit її видно на «Обраних».
const ALLOWED_LATIN = [
  "Safari",
  "Powered by CoinGecko",
  "CoinGecko",
  "GitHub",
  "cookies",
  "IP",
  ...topMarkets().flatMap((coin) => [coin.name, coin.symbol.toUpperCase()]),
].sort((a, b) => b.length - a.length);

// Дозволені хости: сам застосунок і джерело даних (CSP connect-src, логотипи монет).
const ALLOWED_HOSTS = ["localhost:4174", "api.coingecko.com", "coin-images.coingecko.com"];

const attribution = (page) => page.getByRole("link", { name: "Powered by CoinGecko" });

async function openScreen(page, { hash, heading, favorites }) {
  const source = await openApp(page, hash, { favorites });
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  // Стан Data: на екрані є ціни.
  await expect.poll(async () => norm(await page.getByRole("main").innerText())).toContain("$");
  return source;
}

async function expectDisclaimer(page) {
  await expect(page.getByRole("contentinfo").getByText(DISCLAIMER)).toBeVisible();
}

async function expectAttribution(page) {
  await expect(attribution(page)).toBeVisible();
  await expect(attribution(page)).toHaveAttribute("href", "https://www.coingecko.com/en/api");
}

test.describe("US-9: Дисклеймер, джерело даних і чистий інтерфейс", () => {
  for (const params of SCREENS) {
    test(`@US-9 @AC-9.1 @smoke Дисклеймер і джерело даних на кожному екрані: ${params.screen}`, async ({
      page,
    }) => {
      await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
        // Типова підміна: свіжі дані (60 с до NOW).
      });
      await test.step(`Коли відвідувач відкриває ${params.screen}`, async () => {
        await openScreen(page, params);
      });
      await test.step('Тоді відвідувач бачить дисклеймер "Інформація не є інвестиційною порадою"', async () => {
        await expectDisclaimer(page);
      });
      await test.step("І відвідувач бачить назву джерела даних", async () => {
        await expectAttribution(page);
        if (params.hash === "#/") await expectNoA11yViolations(page);
      });
    });
  }

  test("@US-9 @AC-9.2 Дисклеймер видно й під час помилки даних", async ({ page }) => {
    let mode;
    await test.step("Дано джерело даних недоступне", async () => {
      mode = "429";
    });
    await test.step("Коли відвідувач відкриває список монет", async () => {
      const source = await openApp(page, "#/", { mode });
      await expect(alertBlock(page)).toBeVisible();
      // 429 — 1 запит без повторів (L-008); тут лише перевіряємо, що помилку показано вже після нього.
      expect(source.topRequests).toHaveLength(1);
    });
    await test.step('Тоді відвідувач бачить дисклеймер "Інформація не є інвестиційною порадою"', async () => {
      await expectDisclaimer(page);
      await expectAttribution(page);
    });
  });

  for (const params of SCREENS) {
    test(`@US-9 @AC-9.3 Інтерфейс українською без реклами: ${params.screen}`, async ({ page }) => {
      const foreignRequests = [];
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (url.protocol.startsWith("http") && !ALLOWED_HOSTS.includes(url.host)) {
          foreignRequests.push(request.url());
        }
      });
      await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
        // Типова підміна: свіжі дані (60 с до NOW).
      });
      await test.step(`Коли відвідувач відкриває ${params.screen}`, async () => {
        await openScreen(page, params);
      });
      await test.step("Тоді увесь текст інтерфейсу, крім назв монет і тікерів, українською", async () => {
        let text = norm(await page.evaluate(() => document.body.innerText));
        for (const allowed of ALLOWED_LATIN) {
          text = text.split(allowed).join(" ");
        }
        expect(text.match(/[A-Za-z]+/g) ?? []).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.lang)).toBe("uk");
      });
      await test.step("І відвідувач не бачить реклами чи спливних рекламних вікон", async () => {
        // Реклама й банери сторонніх сервісів: жодних фреймів, діалогів і запитів до сторонніх доменів.
        expect(page.frames()).toHaveLength(1);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        expect(foreignRequests).toEqual([]);
      });
    });
  }
});
