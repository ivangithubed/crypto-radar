// Етап 8.b: наскрізні сценарії US-3 «Пошук монети» (02-requirements.md) у справжньому браузері.
import { expect, test } from "@playwright/test";
import {
  coinItem,
  coinLinks,
  coinNames,
  expectNoA11yViolations,
  openApp,
  searchInput,
  waitForList,
} from "./support/app.js";
import { topMarkets } from "./support/coingecko.js";

const NOTHING = "Нічого не знайдено";

const nothingFound = (page) => page.getByRole("heading", { name: NOTHING });
const clearButtons = (page) => page.getByRole("button", { name: "Очистити пошук" });
const rankCell = (page, name) => coinItem(page, name).getByRole("cell").first();

/** Передумова US-3: дані топ-50 з Bitcoin (BTC, 1) і Bitcoin Cash (BCH, 30); список відкрито. */
async function background(page) {
  await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
    await openApp(page);
    await waitForList(page);
  });
  await test.step('І в топ-50 є монета "Bitcoin" з тікером "BTC" і місцем у рейтингу 1', async () => {
    expect(topMarkets()[0]).toMatchObject({ name: "Bitcoin", symbol: "btc", market_cap_rank: 1 });
  });
  await test.step('І в топ-50 є монета "Bitcoin Cash" з тікером "BCH" і місцем у рейтингу 30', async () => {
    expect(topMarkets()[29]).toMatchObject({
      name: "Bitcoin Cash",
      symbol: "bch",
      market_cap_rank: 30,
    });
  });
}

/** Звичайний список: 25 монет, Bitcoin перша, повідомлення «Нічого не знайдено» немає. */
async function expectPlainList(page) {
  await expect(coinLinks(page)).toHaveCount(25);
  await expect(coinLinks(page).first()).toHaveText("Bitcoin");
  await expect(nothingFound(page)).toHaveCount(0);
}

test.describe("US-3: Пошук монети", () => {
  for (const { query, coin } of [
    { query: "Bitcoin", coin: "Bitcoin" },
    { query: "bitc", coin: "Bitcoin" },
    { query: "btc", coin: "Bitcoin" },
    { query: "BCH", coin: "Bitcoin Cash" },
  ]) {
    test(`@US-3 @AC-3.1 @smoke Пошук за частиною назви або тікером без урахування регістру — ${query} → ${coin}`, async ({
      page,
    }) => {
      await background(page);
      await test.step(`Коли відвідувач шукає "${query}"`, async () => {
        await searchInput(page).fill(query);
      });
      await test.step(`Тоді відвідувач бачить серед результатів монету "${coin}"`, async () => {
        await expect(coinItem(page, coin)).toBeVisible();
        await expect(coinLinks(page)).not.toHaveCount(25);
      });
    });
  }

  test("@US-3 @AC-3.2 Пошук знаходить монету, яку ще не догружено", async ({ page }) => {
    await background(page);
    await test.step("Дано відвідувач бачить перші 25 монет", async () => {
      await expect(coinLinks(page)).toHaveCount(25);
      expect(await coinNames(page)).not.toContain("Bitcoin Cash");
    });
    await test.step('Коли відвідувач шукає "Bitcoin Cash"', async () => {
      await searchInput(page).fill("Bitcoin Cash");
    });
    await test.step('Тоді відвідувач бачить монету "Bitcoin Cash" з місцем у рейтингу 30', async () => {
      await expect(coinItem(page, "Bitcoin Cash")).toBeVisible();
      await expect(rankCell(page, "Bitcoin Cash")).toHaveText("30");
    });
  });

  test("@US-3 @AC-3.3 Нічого не знайдено", async ({ page }) => {
    await background(page);
    await test.step('Коли відвідувач шукає "zzzz"', async () => {
      await searchInput(page).fill("zzzz");
    });
    await test.step('Тоді відвідувач бачить повідомлення "Нічого не знайдено"', async () => {
      await expect(nothingFound(page)).toBeVisible();
      await expect(coinLinks(page)).toHaveCount(0);
      await expectNoA11yViolations(page);
    });
    await test.step("І відвідувач може очистити пошук", async () => {
      await expect(clearButtons(page).first()).toBeVisible();
      await expect(clearButtons(page).first()).toBeEnabled();
    });
  });

  test("@US-3 @AC-3.4 Очищений пошук повертає звичайний список", async ({ page }) => {
    await background(page);
    await test.step('Дано відвідувач шукав "zzzz" і бачить повідомлення "Нічого не знайдено"', async () => {
      await searchInput(page).fill("zzzz");
      await expect(nothingFound(page)).toBeVisible();
    });
    await test.step("Коли відвідувач очищає пошук", async () => {
      await page.getByRole("main").getByRole("button", { name: "Очистити пошук" }).last().click();
    });
    await test.step("Тоді відвідувач бачить 25 монет у поточному сортуванні", async () => {
      await expect(searchInput(page)).toHaveValue("");
      await expectPlainList(page);
      await expect(page.getByLabel("Сортування")).toHaveValue("price");
    });
  });

  test("@US-3 @AC-3.5 Монету поза топ-50 пошук не знаходить", async ({ page }) => {
    await background(page);
    await test.step('Дано монета "Монета-51" має місце за капіталізацією 51', async () => {
      expect(topMarkets()[50]).toMatchObject({ name: "Монета-51", market_cap_rank: 51 });
    });
    await test.step('Коли відвідувач шукає "Монета-51"', async () => {
      await searchInput(page).fill("Монета-51");
    });
    await test.step('Тоді відвідувач бачить повідомлення "Нічого не знайдено"', async () => {
      await expect(nothingFound(page)).toBeVisible();
      await expect(coinLinks(page)).toHaveCount(0);
    });
  });

  for (const { typed, accepted, result } of [
    { typed: 0, accepted: 0, result: "звичайний список монет" },
    { typed: 1, accepted: 1, result: "результати пошуку за 1 символом" },
    { typed: 50, accepted: 50, result: "результати пошуку за 50 символами" },
    { typed: 51, accepted: 50, result: "результати пошуку за 50 символами" },
  ]) {
    test(`@US-3 @AC-3.6 Межі довжини пошукового запиту — введено ${typed}, прийнято ${accepted}, ${result}`, async ({
      page,
    }) => {
      // «s» є в Solana, Bitcoin Cash, USD Coin і тікері USDT, але не в Bitcoin; «sxxx…» не має збігів.
      const typedText = "s".repeat(Math.min(typed, 1)) + "x".repeat(Math.max(0, typed - 1));
      await background(page);
      await test.step(`Коли відвідувач вводить пошуковий запит довжиною ${typed} символів`, async () => {
        await searchInput(page).click();
        // Справжні натискання клавіш: обмеження довжини застосовує браузер.
        if (typed > 0) await searchInput(page).pressSequentially(typedText);
      });
      await test.step(`Тоді пошуковий запит має довжину ${accepted} символів`, async () => {
        await expect(searchInput(page)).toHaveValue(typedText.slice(0, accepted));
      });
      await test.step(`І відвідувач бачить ${result}`, async () => {
        if (accepted === 0) {
          await expectPlainList(page);
        } else if (accepted === 1) {
          await expect(coinItem(page, "Solana")).toBeVisible();
          await expect(coinItem(page, "Bitcoin Cash")).toBeVisible();
          await expect(coinItem(page, "USD Coin")).toBeVisible();
          await expect(coinItem(page, "Bitcoin")).toHaveCount(0);
        } else {
          await expect(nothingFound(page)).toBeVisible();
          await expect(coinLinks(page)).toHaveCount(0);
        }
      });
    });
  }

  test("@US-3 @AC-3.7 Запит лише з пробілів вважається порожнім", async ({ page }) => {
    await background(page);
    await test.step('Коли відвідувач шукає "   "', async () => {
      await searchInput(page).fill("   ");
    });
    await test.step("Тоді відвідувач бачить звичайний список монет", async () => {
      await expectPlainList(page);
    });
  });

  test("@US-3 @AC-3.8 Пошук за українським написанням назви не підтримується", async ({ page }) => {
    await background(page);
    await test.step('Коли відвідувач шукає "біткоїн"', async () => {
      await searchInput(page).fill("біткоїн");
    });
    await test.step('Тоді відвідувач бачить повідомлення "Нічого не знайдено"', async () => {
      await expect(nothingFound(page)).toBeVisible();
      await expect(coinLinks(page)).toHaveCount(0);
    });
  });

  test("@US-3 @AC-3.9 Пробіли на краях запиту ігноруються", async ({ page }) => {
    await background(page);
    await test.step('Коли відвідувач шукає "  btc  "', async () => {
      await searchInput(page).fill("  btc  ");
    });
    await test.step('Тоді відвідувач бачить серед результатів монету "Bitcoin"', async () => {
      await expect(coinItem(page, "Bitcoin")).toBeVisible();
      await expect(coinLinks(page)).not.toHaveCount(25);
    });
  });
});
