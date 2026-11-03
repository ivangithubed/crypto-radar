// Етап 8.b: US-6 «Перегляд обраних при наступному візиті» (02-requirements.md, @US-6) у справжньому браузері.
import { expect, test } from "@playwright/test";
import {
  coinItem,
  coinLinks,
  coinNames,
  expectNoA11yViolations,
  main,
  norm,
  openApp,
  openFavoritesTab,
  storedFavorites,
  waitForList,
} from "./support/app.js";
import { NOW, topMarkets } from "./support/coingecko.js";

const PRECONDITION = "Дано джерело даних має свіжі дані топ-50";
const EMPTY_TITLE = "Тут поки порожньо";
const EMPTY_HOW_TO = /Натисніть кнопку «Додати в обрані»/;
const OUT_OF_TOP = "Зараз поза топ-50";
const WEEK_SECONDS = 7 * 24 * 60 * 60;
const PHONE = { width: 390, height: 844 };
const TOP_IDS = topMarkets()
  .slice(0, 50)
  .map((coin) => coin.id);

const favoritesHeading = (page) => page.getByRole("heading", { level: 1, name: "Обрані" });
const favoritesList = (page) => page.getByRole("list", { name: /^Обрані монети/ });

async function openFavorites(page, favorites, sourceOptions = {}) {
  const source = await openApp(page, "#/favorites", { favorites, ...sourceOptions });
  await expect(favoritesHeading(page)).toBeVisible();
  return source;
}

async function expectEmptyFavorites(page) {
  await expect(main(page).getByRole("heading", { name: EMPTY_TITLE })).toBeVisible();
  await expect(main(page).getByText(EMPTY_HOW_TO)).toBeVisible();
  await expect(coinLinks(page)).toHaveCount(0);
}

/** Текст картки обраної монети без нерозривних пробілів. */
const cardText = async (page, name) => norm(await coinItem(page, name).innerText());

test.describe("US-6: Перегляд обраних при наступному візиті", () => {
  test.describe("Телефон відвідувача", () => {
    // Телефон — вузький екран; ПК в AC-6.2 — окремий контекст із налаштуваннями проєкту.
    test.use({ viewport: PHONE });

    test("@US-6 @AC-6.1 @smoke Обрані зберігаються між візитами на тому самому пристрої", async ({
      context,
    }) => {
      const phone = await context.newPage();

      await test.step(PRECONDITION, async () => {
        // Перший візит — 7 днів тому: годинник і дані джерела на тиждень раніше за NOW.
        await openApp(phone, "#/", {
          clock: new Date(NOW.getTime() - WEEK_SECONDS * 1000),
          markets: topMarkets({ ageSeconds: WEEK_SECONDS + 60 }),
        });
        await waitForList(phone);
      });

      await test.step('Дано 7 днів тому відвідувач додав в обрані монети "Bitcoin", "Ethereum" і "Solana" на своєму телефоні', async () => {
        for (const name of ["Bitcoin", "Ethereum", "Solana"]) {
          await main(phone)
            .getByRole("button", { name: `Додати в обрані: ${name}`, exact: true })
            .click();
          await expect(
            main(phone).getByRole("button", { name: `Прибрати з обраних: ${name}`, exact: true }),
          ).toBeVisible();
        }
        expect(await storedFavorites(phone)).toEqual(["bitcoin", "ethereum", "solana"]);
        await phone.close();
      });

      const again = await context.newPage();

      await test.step("Коли відвідувач знову відкриває Крипто-Радар на тому самому телефоні", async () => {
        await openApp(again, "#/");
        await waitForList(again);
      });

      await test.step('Тоді відвідувач бачить в обраних монети "Bitcoin", "Ethereum" і "Solana" з поточними цінами', async () => {
        await openFavoritesTab(again);
        await expect(coinLinks(again)).toHaveCount(3);
        expect(await coinNames(again)).toEqual(["Bitcoin", "Ethereum", "Solana"]);
        expect(await cardText(again, "Bitcoin")).toContain("$67 250,10");
        expect(await cardText(again, "Ethereum")).toContain("$3 120,00");
        expect(await cardText(again, "Solana")).toContain("$150,40");
        await expectNoA11yViolations(again);
      });
    });

    test("@US-6 @AC-6.2 На іншому пристрої обрані окремі", async ({
      browser,
      context,
    }, testInfo) => {
      const phone = await context.newPage();

      await test.step(PRECONDITION, async () => {
        await openApp(phone, "#/");
        await waitForList(phone);
      });

      await test.step('Дано відвідувач додав в обрані монету "Bitcoin" на своєму телефоні', async () => {
        await main(phone)
          .getByRole("button", { name: "Додати в обрані: Bitcoin", exact: true })
          .click();
        await expect(
          main(phone).getByRole("button", { name: "Прибрати з обраних: Bitcoin", exact: true }),
        ).toBeVisible();
        expect(await storedFavorites(phone)).toEqual(["bitcoin"]);
      });

      // ПК — окремий браузерний профіль: власне сховище сайту.
      const pcContext = await browser.newContext({ ...testInfo.project.use });
      const pc = await pcContext.newPage();

      await test.step("Коли відвідувач уперше відкриває Крипто-Радар на своєму ПК", async () => {
        await openApp(pc, "#/");
        await waitForList(pc);
      });

      await test.step("Тоді відвідувач бачить порожні обрані на ПК", async () => {
        await openFavoritesTab(pc);
        await expectEmptyFavorites(pc);
        expect(await storedFavorites(pc)).toEqual([]);
      });

      await pcContext.close();
    });
  });

  test("@US-6 @AC-6.3 Порожні обрані", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: [] });
      await waitForList(page);
    });

    await test.step("Дано в обраних немає монет", async () => {
      expect(await storedFavorites(page)).toEqual([]);
    });

    await test.step("Коли відвідувач відкриває обрані", async () => {
      await openFavoritesTab(page);
    });

    await test.step("Тоді відвідувач бачить пояснення, як додати монету в обрані", async () => {
      await expectEmptyFavorites(page);
      await expectNoA11yViolations(page);
    });
  });

  test("@US-6 @AC-6.4 Монета, що вибула з топ-50, лишається в обраних з позначкою", async ({
    page,
  }) => {
    // Монета-X стоїть на 51-му місці: джерело її віддає, а продукт показує лише топ-50.
    const markets = topMarkets({
      overrides: { 51: { id: "moneta-x", name: "Монета-X", symbol: "mx" } },
    });
    let items;

    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: ["moneta-x", "bitcoin"], markets });
      await waitForList(page);
    });

    await test.step('Дано в обраних є монети "Bitcoin" і "Монета-X"', async () => {
      expect(await storedFavorites(page)).toEqual(["moneta-x", "bitcoin"]);
    });

    await test.step('І монета "Монета-X" зараз має місце за капіталізацією 51', async () => {
      expect(markets[50]).toMatchObject({ id: "moneta-x", market_cap_rank: 51 });
    });

    await test.step("Коли відвідувач відкриває обрані", async () => {
      await openFavoritesTab(page);
      items = favoritesList(page).getByRole("listitem");
      await expect(items).toHaveCount(2);
    });

    await test.step('Тоді відвідувач бачить монету "Монета-X" унизу обраних з позначкою "Зараз поза топ-50"', async () => {
      await expect(items.first()).toContainText("Bitcoin");
      await expect(items.last()).toContainText("moneta-x");
      await expect(items.last()).toContainText(OUT_OF_TOP);
      await expect(items.first()).not.toContainText(OUT_OF_TOP);
    });

    await test.step('І для монети "Монета-X" не видно ціни й інших даних', async () => {
      const text = norm(await items.last().innerText());
      expect(text).not.toContain("$");
      expect(text).not.toMatch(/\d+,\d %/);
      expect(text).not.toMatch(/трлн|млрд|млн|Капіталізація/);
      await expectNoA11yViolations(page);
    });

    await test.step('Але відвідувач може прибрати монету "Монета-X" з обраних', async () => {
      await items
        .last()
        .getByRole("button", { name: "Прибрати з обраних: moneta-x", exact: true })
        .click();
      await expect(items).toHaveCount(1);
      await expect(favoritesList(page)).not.toContainText("moneta-x");
      expect(await storedFavorites(page)).toEqual(["bitcoin"]);
    });
  });

  test("@US-6 @AC-6.5 Кількість монет в обраних: 0 | пояснення, як додати монету в обрані", async ({
    page,
  }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: [] });
      await waitForList(page);
    });

    await test.step("Дано в обраних 0 монет з топ-50", async () => {
      expect(await storedFavorites(page)).toEqual([]);
    });

    await test.step("Коли відвідувач відкриває обрані", async () => {
      await openFavoritesTab(page);
    });

    await test.step("Тоді відвідувач бачить пояснення, як додати монету в обрані", async () => {
      await expectEmptyFavorites(page);
    });
  });

  for (const count of [1, 50]) {
    const result = `${count} ${count === 1 ? "монету" : "монет"} з поточними даними`;
    test(`@US-6 @AC-6.5 Кількість монет в обраних: ${count} | ${result}`, async ({ page }) => {
      await test.step(PRECONDITION, async () => {
        await openApp(page, "#/", { favorites: TOP_IDS.slice(0, count) });
        await waitForList(page);
      });

      await test.step(`Дано в обраних ${count} монет з топ-50`, async () => {
        expect(await storedFavorites(page)).toHaveLength(count);
      });

      await test.step("Коли відвідувач відкриває обрані", async () => {
        await openFavoritesTab(page);
      });

      await test.step(`Тоді відвідувач бачить ${result}`, async () => {
        await expect(coinLinks(page)).toHaveCount(count);
        await expect(
          page.getByRole("list", { name: `Обрані монети, ${count}`, exact: true }),
        ).toBeVisible();
        expect(await cardText(page, "Bitcoin")).toContain("$67 250,10");
        expect(await cardText(page, "Bitcoin")).toContain("+4,2 %");
        expect(await cardText(page, "Bitcoin")).toContain("$1,32 трлн");
        await expect(favoritesList(page)).not.toContainText(OUT_OF_TOP);
        if (count === 50) {
          expect(await cardText(page, "Монета-50")).toContain("$50,00");
        }
        await expectNoA11yViolations(page);
      });
    });
  }

  test("@US-6 @AC-6.6 Монета повернулася в топ-50", async ({ context, page }) => {
    let markets;
    let later;

    await test.step(PRECONDITION, async () => {
      await openFavorites(page, ["moneta-x"]);
    });

    await test.step('Дано монета "Монета-X" є в обраних з позначкою "Зараз поза топ-50"', async () => {
      const item = favoritesList(page).getByRole("listitem");
      await expect(item).toHaveCount(1);
      await expect(item).toContainText("moneta-x");
      await expect(item).toContainText(OUT_OF_TOP);
      await page.close();
    });

    await test.step('Коли монета "Монета-X" знову має місце за капіталізацією 50', async () => {
      markets = topMarkets({
        overrides: { 50: { id: "moneta-x", name: "Монета-X", symbol: "mx" } },
      });
    });

    await test.step("І відвідувач відкриває обрані", async () => {
      // Новий візит у тому самому браузері: те саме сховище, нова вкладка й нові дані джерела.
      // page.reload() у WebKit бере відповідь джерела з кешу й не робить нового запиту.
      later = await context.newPage();
      const source = await openFavorites(later, undefined, { markets });
      await expect.poll(() => source.topRequests.length).toBeGreaterThan(0);
    });

    await test.step('Тоді відвідувач бачить монету "Монета-X" з місцем у рейтингу 50 і поточною ціною', async () => {
      await expect(coinLinks(later)).toHaveText(["Монета-X"]);
      const text = await cardText(later, "Монета-X");
      expect(text).toMatch(/^50 /);
      expect(text).toContain("$50,00");
    });

    await test.step('Але позначки "Зараз поза топ-50" немає', async () => {
      await expect(favoritesList(later)).not.toContainText(OUT_OF_TOP);
    });
  });

  test("@US-6 @AC-6.7 Обрані впорядковано за місцем у рейтингу", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: ["solana", "bitcoin"] });
      await waitForList(page);
    });

    await test.step('Дано в обраних є монети "Solana" з місцем у рейтингу 5 і "Bitcoin" з місцем у рейтингу 1', async () => {
      expect(await storedFavorites(page)).toEqual(["solana", "bitcoin"]);
    });

    await test.step("Коли відвідувач відкриває обрані", async () => {
      await openFavoritesTab(page);
      await expect(coinLinks(page)).toHaveCount(2);
    });

    await test.step('Тоді монета "Bitcoin" стоїть вище за "Solana"', async () => {
      expect(await coinNames(page)).toEqual(["Bitcoin", "Solana"]);
      expect(await cardText(page, "Bitcoin")).toMatch(/^1 /);
      expect(await cardText(page, "Solana")).toMatch(/^5 /);
    });
  });
});
