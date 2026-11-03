// Етап 8.b: US-5 «Додавання й прибирання обраних» (02-requirements.md, @US-5) у справжньому браузері.
import { expect, test } from "@playwright/test";
import {
  coinLinks,
  main,
  openApp,
  openFavoritesTab,
  showMore,
  storedFavorites,
  waitForList,
} from "./support/app.js";
import { topMarkets } from "./support/coingecko.js";

const PRECONDITION = "Дано джерело даних має свіжі дані топ-50";
const TOP_IDS = topMarkets()
  .slice(0, 50)
  .map((coin) => coin.id);

const addButton = (page, name) =>
  main(page).getByRole("button", { name: `Додати в обрані: ${name}`, exact: true });
const removeButton = (page, name) =>
  main(page).getByRole("button", { name: `Прибрати з обраних: ${name}`, exact: true });
const anyAdd = (page) => main(page).getByRole("button", { name: /^Додати в обрані/ });
const anyRemove = (page) => main(page).getByRole("button", { name: /^Прибрати з обраних/ });
const coinHeading = (page, name) => page.getByRole("heading", { level: 1, name, exact: true });
const favoriteLink = (page, name) => main(page).getByRole("link", { name, exact: true });

test.describe("US-5: Додавання й прибирання обраних", () => {
  test("@US-5 @AC-5.1 @smoke Додавання монети в обрані зі списку", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/");
      await waitForList(page);
    });

    await test.step('Дано монети "Bitcoin" немає в обраних', async () => {
      await expect(addButton(page, "Bitcoin")).toBeVisible();
      expect(await storedFavorites(page)).toEqual([]);
    });

    await test.step('Коли відвідувач додає монету "Bitcoin" в обрані зі списку монет', async () => {
      await addButton(page, "Bitcoin").click();
    });

    await test.step('Тоді монета "Bitcoin" позначена як обрана', async () => {
      await expect(removeButton(page, "Bitcoin")).toBeVisible();
      await expect(addButton(page, "Bitcoin")).toHaveCount(0);
      expect(await storedFavorites(page)).toEqual(["bitcoin"]);
    });

    await test.step('І відвідувач бачить монету "Bitcoin" в обраних', async () => {
      await openFavoritesTab(page);
      await expect(favoriteLink(page, "Bitcoin")).toBeVisible();
    });

    await test.step("Але відвідувачу не пропонують увійти чи зареєструватися", async () => {
      await expect(page.getByText(/увійти|увійдіть|зареєстр|вхід|пароль/i)).toHaveCount(0);
      await expect(page.getByRole("textbox")).toHaveCount(0);
    });
  });

  test("@US-5 @AC-5.2 Додавання монети в обрані зі сторінки монети", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/coin/ethereum");
      await expect(coinHeading(page, "Ethereum")).toBeVisible();
    });

    await test.step('Дано монети "Ethereum" немає в обраних', async () => {
      await expect(addButton(page, "Ethereum")).toBeVisible();
      expect(await storedFavorites(page)).toEqual([]);
    });

    await test.step('Коли відвідувач додає монету "Ethereum" в обрані зі сторінки монети', async () => {
      await addButton(page, "Ethereum").click();
      await expect(removeButton(page, "Ethereum")).toBeVisible();
    });

    await test.step('Тоді відвідувач бачить монету "Ethereum" в обраних', async () => {
      expect(await storedFavorites(page)).toEqual(["ethereum"]);
      await openFavoritesTab(page);
      await expect(favoriteLink(page, "Ethereum")).toBeVisible();
    });
  });

  test("@US-5 @AC-5.3 Прибирання монети з обраних", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: ["bitcoin"] });
      await waitForList(page);
    });

    await test.step('Дано монета "Bitcoin" є в обраних', async () => {
      await expect(removeButton(page, "Bitcoin")).toBeVisible();
      expect(await storedFavorites(page)).toEqual(["bitcoin"]);
    });

    await test.step('Коли відвідувач прибирає монету "Bitcoin" з обраних', async () => {
      await removeButton(page, "Bitcoin").click();
    });

    await test.step('Тоді монета "Bitcoin" не позначена як обрана', async () => {
      await expect(addButton(page, "Bitcoin")).toBeVisible();
      await expect(removeButton(page, "Bitcoin")).toHaveCount(0);
      expect(await storedFavorites(page)).toEqual([]);
    });

    await test.step('І монети "Bitcoin" немає в обраних', async () => {
      await openFavoritesTab(page);
      await expect(main(page).getByText("Тут поки порожньо")).toBeVisible();
      await expect(favoriteLink(page, "Bitcoin")).toHaveCount(0);
    });
  });

  test("@US-5 @AC-5.4 Монету не можна додати в обрані вдруге", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: ["bitcoin"] });
    });

    await test.step('Дано монета "Bitcoin" є в обраних', async () => {
      expect(await storedFavorites(page)).toEqual(["bitcoin"]);
    });

    await test.step('Коли відвідувач переглядає монету "Bitcoin" у списку монет', async () => {
      await waitForList(page);
    });

    await test.step('Тоді для монети "Bitcoin" доступна лише дія "Прибрати з обраних"', async () => {
      await expect(removeButton(page, "Bitcoin")).toBeVisible();
      await expect(addButton(page, "Bitcoin")).toHaveCount(0);
    });

    await test.step('І монета "Bitcoin" трапляється в обраних один раз', async () => {
      expect((await storedFavorites(page)).filter((id) => id === "bitcoin")).toHaveLength(1);
      await openFavoritesTab(page);
      await expect(favoriteLink(page, "Bitcoin")).toHaveCount(1);
    });
  });

  test("@US-5 @AC-5.5 Монету поза топ-50 не можна додати в обрані", async ({ page }) => {
    let source;
    await test.step(PRECONDITION, async () => {
      source = await openApp(page, "#/");
      await waitForList(page);
    });

    await test.step('Дано монета "Монета-51" має місце за капіталізацією 51', async () => {
      expect(source.markets.find((coin) => coin.id === "moneta-51").market_cap_rank).toBe(51);
    });

    await test.step('Коли відвідувач відкриває сторінку монети "Монета-51" за збереженим посиланням', async () => {
      await page.goto("#/coin/moneta-51");
    });

    await test.step('Тоді відвідувач бачить повідомлення "Монета зараз поза топ-50"', async () => {
      await expect(coinHeading(page, "Монета зараз поза топ-50")).toBeVisible();
    });

    await test.step('І відвідувачу недоступне додавання монети "Монета-51" в обрані', async () => {
      await expect(anyAdd(page)).toHaveCount(0);
      await expect(anyRemove(page)).toHaveCount(0);
      expect(await storedFavorites(page)).toEqual([]);
    });
  });

  for (const { before, after } of [
    { before: 0, after: 1 },
    { before: 1, after: 2 },
    { before: 49, after: 50 },
  ]) {
    test(`@US-5 @AC-5.6 Кількість обраних від 0 до 50: було ${before} | стало ${after}`, async ({
      page,
    }) => {
      const seeded = TOP_IDS.filter((id) => id !== "bitcoin").slice(0, before);

      await test.step(PRECONDITION, async () => {
        await openApp(page, "#/", { favorites: seeded });
        await waitForList(page);
      });

      await test.step(`Дано в обраних ${before} монет з топ-50`, async () => {
        expect(await storedFavorites(page)).toHaveLength(before);
      });

      await test.step("Коли відвідувач додає ще одну монету з топ-50 в обрані", async () => {
        await addButton(page, "Bitcoin").click();
        await expect(removeButton(page, "Bitcoin")).toBeVisible();
      });

      await test.step(`Тоді в обраних ${after} монет`, async () => {
        expect(await storedFavorites(page)).toHaveLength(after);
        await openFavoritesTab(page);
        await expect(coinLinks(page)).toHaveCount(after);
        await expect(
          page.getByRole("list", { name: `Обрані монети, ${after}`, exact: true }),
        ).toBeVisible();
      });
    });
  }

  test("@US-5 @AC-5.7 Коли в обраних усі 50 монет, додавати більше нічого", async ({ page }) => {
    await test.step(PRECONDITION, async () => {
      await openApp(page, "#/", { favorites: TOP_IDS });
      await waitForList(page);
    });

    await test.step("Дано в обраних усі 50 монет топ-50", async () => {
      expect(await storedFavorites(page)).toEqual(TOP_IDS);
    });

    await test.step("Коли відвідувач переглядає список монет", async () => {
      await showMore(page).click();
      await expect(coinLinks(page)).toHaveCount(50);
    });

    await test.step('Тоді для кожної монети доступна лише дія "Прибрати з обраних"', async () => {
      await expect(anyAdd(page)).toHaveCount(0);
      await expect(anyRemove(page)).toHaveCount(50);
    });
  });
});
