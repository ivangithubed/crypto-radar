// Етап 8.b: US-8 «Недоступні або застарілі дані» (02-requirements.md, @US-8) у справжньому браузері.
// Поведінка джерела — UX §3 після запиту на зміну №5 (src/market-data/client.js):
// 429 → 1 запит; 5xx → 3 запити (повтори через 2 с і 4 с); обрив при onLine → 1 запит (L-008).
import { expect, test } from "@playwright/test";
import {
  RETRY,
  alertBlock,
  coinItem,
  coinLinks,
  coinNames,
  expectNoA11yViolations,
  expectNoPrices,
  main,
  norm,
  openApp,
  storedFavorites,
  waitForList,
} from "./support/app.js";
import { NOW, topMarkets } from "./support/coingecko.js";

const BITCOIN_PRICE = "$67 250,10";
// Після помилки 429 / обриву джерело не повторює запит само; за цей час «зайвий» повтор (2 с) уже був би.
// Час просувається керованим годинником (`fakeTimers` + `page.clock.runFor`), без реальних пауз.
const NO_RETRY_WINDOW_MS = 2_500;

/**
 * Просуває керований годинник на вікно повтору й переконується, що нового запиту топ-50 не було.
 * Точка синхронізації: очікування запиту стартує до `runFor`, тож пізній запит, що ще не дійшов до `route`, теж буде помічено.
 */
async function expectNoRetryWithinWindow(page) {
  const late = page.waitForRequest(
    (request) => request.url().includes("/coins/markets") && !request.url().includes("category="),
    { timeout: 1_000 },
  );
  await page.clock.runFor(NO_RETRY_WINDOW_MS);
  await expect(late).rejects.toThrow();
}

/** Блок помилки з кнопкою «Спробувати ще раз». */
async function expectErrorWithRetry(page, title) {
  const alert = alertBlock(page);
  await expect(alert).toBeVisible({ timeout: 15_000 });
  if (title) await expect(alert.getByRole("heading", { name: title })).toBeVisible();
  await expect(alert.getByRole("button", { name: RETRY })).toBeVisible();
  return alert;
}

async function expectBitcoinPrice(page) {
  await expect
    .poll(async () => norm(await coinItem(page, "Bitcoin").innerText()))
    .toContain(BITCOIN_PRICE);
}

test.describe("US-8: Недоступні або застарілі дані", () => {
  test("@US-8 @AC-8.1 @smoke Джерело даних недоступне", async ({ page }) => {
    let mode;
    let source;
    await test.step("Дано джерело даних недоступне", async () => {
      mode = "503";
    });
    await test.step("Коли відвідувач відкриває список монет", async () => {
      source = await openApp(page, "#/", { mode });
    });
    await test.step('Тоді відвідувач бачить повідомлення про помилку даних з дією "Спробувати ще раз"', async () => {
      await expectErrorWithRetry(page, "Не вдалося отримати ціни");
      // 5xx: перший запит і 2 повтори (2 с і 4 с), не більше.
      expect(source.topRequests).toHaveLength(3);
    });
    await test.step("Але відвідувач не бачить жодної ціни, зміни за 7 днів чи капіталізації", async () => {
      await expect(coinLinks(page)).toHaveCount(0);
      await expectNoPrices(page);
      await expectNoA11yViolations(page);
    });
  });

  test("@US-8 @AC-8.2 Спробувати ще раз після відновлення джерела", async ({ page }) => {
    let source;
    await test.step("Дано відвідувач бачить повідомлення про помилку даних", async () => {
      // Обрив при onLine === true — так браузер бачить 429 CoinGecko без CORS (L-008).
      source = await openApp(page, "#/", { mode: "abort", fakeTimers: true });
      await expectErrorWithRetry(page, "Не вдалося отримати ціни");
      // За вікно повтору (2 с) запитів не стало більше за 1.
      await expectNoRetryWithinWindow(page);
      expect(source.topRequests).toHaveLength(1);
    });
    await test.step("І джерело даних знову має свіжі дані топ-50", async () => {
      source.mode = "ok";
    });
    await test.step('Коли відвідувач обирає "Спробувати ще раз"', async () => {
      await alertBlock(page).getByRole("button", { name: RETRY }).click();
    });
    await test.step("Тоді відвідувач бачить список монет зі свіжими цінами", async () => {
      await waitForList(page);
      await expect(coinLinks(page)).toHaveCount(25);
      await expectBitcoinPrice(page);
      await expect(alertBlock(page)).toHaveCount(0);
      expect(source.topRequests).toHaveLength(2);
    });
  });

  test("@US-8 @AC-8.3 Спроба ще раз, коли джерело все ще недоступне", async ({ page }) => {
    let source;
    await test.step("Дано відвідувач бачить повідомлення про помилку даних", async () => {
      source = await openApp(page, "#/", { mode: "429", fakeTimers: true });
      await expectErrorWithRetry(page, "Не вдалося отримати ціни");
    });
    await test.step("І джерело даних усе ще недоступне", async () => {
      // 429 — без повторів: за вікно повтору (2 с) запитів не стало більше за 1.
      await expectNoRetryWithinWindow(page);
      expect(source.topRequests).toHaveLength(1);
      expect(source.mode).toBe("429");
    });
    await test.step('Коли відвідувач обирає "Спробувати ще раз"', async () => {
      await alertBlock(page).getByRole("button", { name: RETRY }).click();
    });
    await test.step('Тоді відвідувач знову бачить повідомлення про помилку даних з дією "Спробувати ще раз"', async () => {
      const alert = await expectErrorWithRetry(page, "Не вдалося отримати ціни");
      await expect(
        alert.getByText("Не вдалося оновити ціни. Спробуйте ще раз за хвилину."),
      ).toBeVisible();
      const retry = alert.getByRole("button", { name: RETRY });
      await expect(retry).not.toHaveAttribute("aria-disabled", "true");
      await expect(retry).toBeFocused();
      // Ручна спроба — рівно 1 запит, 429 знову без повторів.
      await expectNoRetryWithinWindow(page);
      expect(source.topRequests).toHaveLength(2);
      await expectNoPrices(page);
    });
  });

  const FRESHNESS = [
    { age: "4 хв 59 с", seconds: 299, result: "список монет із цінами" },
    { age: "5 хв 0 с", seconds: 300, result: "список монет із цінами" },
    { age: "5 хв 1 с", seconds: 301, result: "повідомлення про помилку даних без цін" },
  ];

  for (const { age, seconds, result } of FRESHNESS) {
    test(`@US-8 @AC-8.4 Межа свіжості даних 5 хвилин: ${age} → ${result}`, async ({ page }) => {
      let markets;
      await test.step(`Дано джерело даних подало ціни ${age} тому`, async () => {
        markets = topMarkets({ ageSeconds: seconds });
      });
      await test.step("Коли відвідувач відкриває список монет", async () => {
        await openApp(page, "#/", { markets });
      });
      await test.step(`Тоді відвідувач бачить ${result}`, async () => {
        if (seconds <= 300) {
          await waitForList(page);
          await expectBitcoinPrice(page);
          await expect(alertBlock(page)).toHaveCount(0);
        } else {
          await expectErrorWithRetry(page, "Ціни застаріли");
          await expect(coinLinks(page)).toHaveCount(0);
          await expectNoPrices(page);
        }
      });
    });
  }

  test("@US-8 @AC-8.4 BUG-012: одна рідко оновлювана монета не ховає список", async ({ page }) => {
    let markets;
    await test.step("Дано джерело подало свіжі ціни, але одна монета (9 місце) оновлена 3,5 години тому", async () => {
      markets = topMarkets({ ageSeconds: 60 });
      markets[8].last_updated = new Date(NOW.getTime() - 3.5 * 3600 * 1000).toISOString();
    });
    await test.step("Коли відвідувач відкриває список монет", async () => {
      await openApp(page, "#/", { markets });
    });
    await test.step("Тоді відвідувач бачить ціни, а не «Ціни застаріли»", async () => {
      await waitForList(page);
      await expectBitcoinPrice(page);
      await expect(alertBlock(page)).toHaveCount(0);
    });
  });

  test("@US-8 @AC-8.5 Дані застаріли, поки екран відкритий", async ({ page }) => {
    let source;
    await test.step("Дано відвідувач бачить список монет зі свіжими цінами", async () => {
      source = await openApp(page, "#/");
      await waitForList(page);
      await expectBitcoinPrice(page);
    });
    await test.step("Коли минає більше 5 хвилин від моменту цін, а оновити дані не вдається", async () => {
      source.mode = "503";
      // Ціни подано за 60 с до NOW: +241 с → давність 5 хв 1 с.
      await page.clock.setFixedTime(new Date(NOW.getTime() + 241 * 1000));
    });
    await test.step("Тоді відвідувач бачить повідомлення про помилку даних", async () => {
      await expectErrorWithRetry(page, "Ціни застаріли");
    });
    await test.step("Але відвідувач не бачить застарілих цін", async () => {
      await expect(coinLinks(page)).toHaveCount(0);
      await expectNoPrices(page);
    });
  });

  test("@US-8 @AC-8.6 Обрані не втрачаються під час помилки даних", async ({ page }) => {
    let source;
    await test.step('Дано в обраних є монети "Bitcoin" і "Ethereum"', async () => {
      source = await openApp(page, "#/favorites", {
        mode: "429",
        favorites: ["bitcoin", "ethereum"],
      });
    });
    await test.step("І відвідувач бачить в обраних повідомлення про помилку даних без цін", async () => {
      await expect(page.getByRole("heading", { level: 1, name: "Обрані" })).toBeVisible();
      await expectErrorWithRetry(page, "Не вдалося отримати ціни");
      await expectNoPrices(page);
      expect(source.topRequests).toHaveLength(1);
    });
    await test.step("І джерело даних знову має свіжі дані топ-50", async () => {
      source.mode = "ok";
    });
    await test.step('Коли відвідувач обирає "Спробувати ще раз"', async () => {
      await alertBlock(page).getByRole("button", { name: RETRY }).click();
    });
    await test.step('Тоді відвідувач бачить в обраних монети "Bitcoin" і "Ethereum" з цінами', async () => {
      await expect.poll(() => coinNames(page)).toEqual(["Bitcoin", "Ethereum"]);
      await expectBitcoinPrice(page);
      await expect(alertBlock(page)).toHaveCount(0);
      expect(await storedFavorites(page)).toEqual(["bitcoin", "ethereum"]);
    });
  });

  test("@US-8 @AC-8.7 Графік недоступний на сторінці монети", async ({ page }) => {
    let markets;
    await test.step('Дано джерело даних не дає цін монети "Bitcoin" за останні 7 днів', async () => {
      markets = topMarkets({ overrides: { 1: { sparkline: [] } } });
    });
    await test.step('Коли відвідувач відкриває сторінку монети "Bitcoin"', async () => {
      await openApp(page, "#/coin/bitcoin", { markets });
    });
    await test.step('Тоді відвідувач бачить повідомлення про помилку даних з дією "Спробувати ще раз"', async () => {
      await expectErrorWithRetry(page);
    });
    await test.step("Але відвідувач не бачить графіка за 7 днів", async () => {
      await expect(page.getByRole("region", { name: "Графік за 7 днів" })).toHaveCount(0);
      await expect(page.getByRole("img", { name: /Ціна за 7 днів/ })).toHaveCount(0);
      expect(norm(await main(page).innerText())).not.toContain("$");
    });
  });

  test("@US-8 @AC-8.8 Завантаження даних", async ({ page }) => {
    await test.step("Дано джерело даних ще не відповіло", async () => {
      await openApp(page, "#/", { mode: "pending" });
    });
    await test.step("Коли відвідувач відкриває список монет", async () => {
      await expect(page.getByRole("heading", { level: 1, name: "Топ-50 монет" })).toBeVisible();
    });
    await test.step("Тоді відвідувач бачить, що дані завантажуються", async () => {
      await expect(
        page.getByRole("status").filter({ hasText: "Завантажуємо ціни…" }),
      ).toBeVisible();
      await expect(coinLinks(page)).toHaveCount(0);
      await expect(alertBlock(page)).toHaveCount(0);
    });
  });
});
