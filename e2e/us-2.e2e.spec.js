// Етап 8.b: наскрізні сценарії US-2 «Сортування списку» (02-requirements.md) у справжньому браузері.
import { expect, test } from "@playwright/test";
import {
  SORT,
  alertBlock,
  chooseSort,
  coinItem,
  coinLinks,
  coinNames,
  expectNoPrices,
  openApp,
  searchInput,
  showMore,
  sortSelect,
  waitForList,
} from "./support/app.js";
import { topMarkets } from "./support/coingecko.js";

const NOTHING = "Нічого не знайдено";

const selectedSort = (page) =>
  sortSelect(page).evaluate((select) => select.selectedOptions[0]?.textContent.trim());
const position = async (page, name) => (await coinNames(page)).indexOf(name);

/** Передумова US-2: дані топ-50 з Bitcoin (1), Ethereum (2) і Solana (5). */
async function background() {
  await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
    expect(topMarkets()).toHaveLength(51);
  });
  await test.step('І монета "Bitcoin" має ціну "$67 250,10", зміну за 7 днів "+4,2 %" і місце в рейтингу 1', async () => {
    expect(topMarkets()[0]).toMatchObject({ name: "Bitcoin", current_price: 67250.1 });
  });
  await test.step('І монета "Ethereum" має ціну "$3 120,00", зміну за 7 днів "−6,1 %" і місце в рейтингу 2', async () => {
    expect(topMarkets()[1]).toMatchObject({ name: "Ethereum", current_price: 3120 });
  });
  await test.step('І монета "Solana" має ціну "$150,40", зміну за 7 днів "+12,8 %" і місце в рейтингу 5', async () => {
    expect(topMarkets()[4]).toMatchObject({ name: "Solana", current_price: 150.4 });
  });
}

async function openList(page) {
  await openApp(page);
  await waitForList(page);
}

test.describe("US-2: Сортування списку", () => {
  test("@US-2 @AC-2.1 @smoke Типове сортування за ціною від найдорожчої", async ({ page }) => {
    await background();
    await test.step("Коли відвідувач відкриває список монет", async () => {
      await openList(page);
    });
    await test.step('Тоді список упорядковано "Ціна: від найдорожчої"', async () => {
      await expect.poll(() => selectedSort(page)).toBe(SORT.price);
    });
    await test.step('І монета "Bitcoin" стоїть вище за "Ethereum", а "Ethereum" вище за "Solana"', async () => {
      const names = await coinNames(page);
      expect(names.indexOf("Bitcoin")).toBeGreaterThanOrEqual(0);
      expect(names.indexOf("Bitcoin")).toBeLessThan(names.indexOf("Ethereum"));
      expect(names.indexOf("Ethereum")).toBeLessThan(names.indexOf("Solana"));
    });
  });

  for (const { sort, first, last } of [
    { sort: SORT.gain, first: "Solana", last: "Ethereum" },
    { sort: SORT.loss, first: "Ethereum", last: "Solana" },
    { sort: SORT.cap, first: "Bitcoin", last: "Solana" },
  ]) {
    test(`@US-2 @AC-2.2 Відвідувач змінює сортування — ${sort}, перша ${first}, остання ${last}`, async ({
      page,
    }) => {
      await background();
      await test.step("Дано відвідувач відкрив список монет", async () => {
        await openList(page);
      });
      await test.step(`Коли відвідувач обирає сортування "${sort}"`, async () => {
        await chooseSort(page, sort);
        await expect.poll(() => selectedSort(page)).toBe(sort);
      });
      await test.step(`Тоді серед монет "Bitcoin", "Ethereum" і "Solana" першою стоїть "${first}", а останньою "${last}"`, async () => {
        // Після зміни сортування видно 25 монет (AC-2.3); щоб порівняти всі три, показуємо 50.
        await expect(coinLinks(page)).toHaveCount(25);
        await showMore(page).click();
        await expect(coinLinks(page)).toHaveCount(50);
        const names = await coinNames(page);
        const three = ["Bitcoin", "Ethereum", "Solana"];
        expect(three.every((name) => names.includes(name))).toBe(true);
        three.sort((a, b) => names.indexOf(a) - names.indexOf(b));
        expect(three[0]).toBe(first);
        expect(three[2]).toBe(last);
      });
    });
  }

  test("@US-2 @AC-2.3 Сортування охоплює весь топ-50 і повертає до перших 25", async ({ page }) => {
    await background();
    await test.step("Дано монета з найбільшим зростанням за 7 днів має місце в рейтингу 48", async () => {
      const markets = topMarkets();
      const best = markets
        .slice(0, 50)
        .reduce((a, b) =>
          b.price_change_percentage_7d_in_currency > a.price_change_percentage_7d_in_currency
            ? b
            : a,
        );
      expect(best.market_cap_rank).toBe(48);
    });
    await test.step("І відвідувач відкрив список монет і обрав «Показати більше»", async () => {
      await openList(page);
      await showMore(page).click();
      await expect(coinLinks(page)).toHaveCount(50);
    });
    await test.step('Коли відвідувач обирає сортування "Зміна за 7 днів: найбільше зростання"', async () => {
      await chooseSort(page, SORT.gain);
    });
    await test.step("Тоді монета з місцем у рейтингу 48 стоїть першою", async () => {
      await expect(coinLinks(page).first()).toHaveText("Монета-48");
      await expect(coinItem(page, "Монета-48").getByRole("cell").first()).toHaveText("48");
    });
    await test.step("І відвідувач бачить 25 монет", async () => {
      await expect(coinLinks(page)).toHaveCount(25);
    });
  });

  test("@US-2 @AC-2.4 Монети з однаковою зміною впорядковані за місцем у рейтингу", async ({
    page,
  }) => {
    await background();
    await test.step('Дано монета "Tether" з місцем у рейтингу 3 має зміну за 7 днів "0,0 %"', async () => {
      expect(topMarkets()[2]).toMatchObject({
        name: "Tether",
        price_change_percentage_7d_in_currency: 0,
      });
    });
    await test.step('І монета "USD Coin" з місцем у рейтингу 7 має зміну за 7 днів "0,0 %"', async () => {
      expect(topMarkets()[6]).toMatchObject({
        name: "USD Coin",
        price_change_percentage_7d_in_currency: 0,
      });
    });
    await test.step('Коли відвідувач обирає сортування "Зміна за 7 днів: найбільше зростання"', async () => {
      await openList(page);
      await chooseSort(page, SORT.gain);
      await expect.poll(() => selectedSort(page)).toBe(SORT.gain);
    });
    await test.step('Тоді монета "Tether" стоїть вище за "USD Coin"', async () => {
      await showMore(page).click();
      await expect(coinLinks(page)).toHaveCount(50);
      expect(await position(page, "Tether")).toBeGreaterThanOrEqual(0);
      expect(await position(page, "Tether")).toBeLessThan(await position(page, "USD Coin"));
    });
  });

  test("@US-2 @AC-2.5 Новий візит повертає типове сортування", async ({ page, context }) => {
    await background();
    await test.step('Дано минулого візиту відвідувач обрав сортування "Капіталізація: від найбільшої"', async () => {
      await openList(page);
      await chooseSort(page, SORT.cap);
      await expect.poll(() => selectedSort(page)).toBe(SORT.cap);
      await page.close();
    });
    const next = await context.newPage();
    await test.step("Коли відвідувач знову відкриває список монет", async () => {
      await openList(next);
    });
    await test.step('Тоді список упорядковано "Ціна: від найдорожчої"', async () => {
      await expect.poll(() => selectedSort(next)).toBe(SORT.price);
      await expect(coinLinks(next).first()).toHaveText("Bitcoin");
    });
  });

  test("@US-2 @AC-2.6 Сортування недоступне під час помилки даних", async ({ page }) => {
    await background();
    let source;
    await test.step("Дано джерело даних стало недоступним", async () => {});
    await test.step("Коли відвідувач відкриває список монет", async () => {
      // CoinGecko без CORS-заголовка браузер бачить як обрив з'єднання при onLine = true (L-008).
      source = await openApp(page, "#/", { mode: "abort" });
    });
    await test.step("Тоді відвідувач бачить повідомлення про помилку даних замість списку монет", async () => {
      await expect(alertBlock(page)).toBeVisible();
      await expect(coinLinks(page)).toHaveCount(0);
    });
    await test.step("І відвідувачу недоступна зміна сортування", async () => {
      await expect(sortSelect(page)).toHaveCount(0);
    });
    await test.step("Але відвідувач не бачить жодної ціни", async () => {
      await expectNoPrices(page);
      expect(source.topRequests).toHaveLength(1);
    });
  });

  test("@US-2 @AC-2.7 Сортування результатів пошуку без збігів", async ({ page }) => {
    await background();
    await test.step('Дано відвідувач шукав "zzzz" і бачить повідомлення "Нічого не знайдено"', async () => {
      await openList(page);
      await searchInput(page).fill("zzzz");
      await expect(page.getByRole("heading", { name: NOTHING })).toBeVisible();
    });
    await test.step('Коли відвідувач обирає сортування "Капіталізація: від найбільшої"', async () => {
      await chooseSort(page, SORT.cap);
      await expect.poll(() => selectedSort(page)).toBe(SORT.cap);
    });
    await test.step('Тоді відвідувач і далі бачить повідомлення "Нічого не знайдено"', async () => {
      await expect(page.getByRole("heading", { name: NOTHING })).toBeVisible();
      await expect(coinLinks(page)).toHaveCount(0);
    });
  });

  test("@US-2 @AC-2.8 Результати пошуку впорядковані за обраним сортуванням", async ({ page }) => {
    await background();
    await test.step('Дано відвідувач обрав сортування "Зміна за 7 днів: найбільше зростання"', async () => {
      await openList(page);
      await chooseSort(page, SORT.gain);
      await expect.poll(() => selectedSort(page)).toBe(SORT.gain);
    });
    await test.step('Коли відвідувач шукає "o"', async () => {
      await searchInput(page).fill("o");
      await expect(coinItem(page, "Ethereum")).toHaveCount(0);
    });
    await test.step('Тоді серед результатів монета "Solana" стоїть вище за "Bitcoin"', async () => {
      await expect(coinItem(page, "Solana")).toHaveCount(1);
      await expect(coinItem(page, "Bitcoin")).toHaveCount(1);
      expect(await position(page, "Solana")).toBeLessThan(await position(page, "Bitcoin"));
    });
    await test.step('І монети "Ethereum" серед результатів немає', async () => {
      expect(await coinNames(page)).not.toContain("Ethereum");
    });
  });
});
