// Етап 8.b: наскрізні сценарії US-1 «Перегляд списку топ-50» (02-requirements.md) у справжньому браузері.
import { expect, test } from "@playwright/test";
import {
  coinItem,
  coinLinks,
  coinNames,
  expectNoA11yViolations,
  main,
  norm,
  openApp,
  showMore,
  waitForList,
} from "./support/app.js";
import { topMarkets } from "./support/coingecko.js";

/** Перша клітинка рядка монети — місце в рейтингу (таблиця на десктопі). */
const rankCell = (page, name) => coinItem(page, name).getByRole("cell").first();

test.describe("US-1: Перегляд списку топ-50", () => {
  test("@US-1 @AC-1.1 @smoke Відвідувач бачить дані монет у списку", async ({ page }) => {
    await test.step("Дано джерело даних має свіжі дані топ-50", async () => {});
    await test.step('І монета "Bitcoin" з тікером "BTC" має місце в рейтингу 1, ціну "$67 250,10", зміну за 7 днів "+4,2 %" і капіталізацію "$1,32 трлн"', async () => {});
    await test.step("Коли відвідувач відкриває список монет", async () => {
      await openApp(page);
      await waitForList(page);
    });
    await test.step('Тоді відвідувач бачить монету "Bitcoin" з тікером "BTC", місцем у рейтингу 1, ціною "$67 250,10", зміною за 7 днів "+4,2 %" і капіталізацією "$1,32 трлн"', async () => {
      const row = coinItem(page, "Bitcoin");
      await expect(row).toHaveCount(1);
      await expect(rankCell(page, "Bitcoin")).toHaveText("1");
      const text = norm(await row.textContent());
      expect(text).toContain("BTC");
      expect(text).toContain("$67 250,10");
      expect(text).toContain("+4,2 %");
      expect(text).toContain("$1,32 трлн");
      await expectNoA11yViolations(page);
    });
  });

  test("@US-1 @AC-1.2 Список відкривається без входу й реєстрації", async ({ page }) => {
    await test.step("Дано відвідувач ще ніколи не відкривав Крипто-Радар", async () => {
      // Новий контекст браузера: порожні localStorage, sessionStorage і cookies.
      expect(await page.context().cookies()).toEqual([]);
    });
    await test.step("Коли відвідувач відкриває список монет", async () => {
      await openApp(page);
    });
    await test.step("Тоді відвідувач бачить список монет", async () => {
      await waitForList(page);
      await expect(coinLinks(page)).toHaveCount(25);
    });
    await test.step("Але відвідувачу не пропонують увійти чи зареєструватися", async () => {
      const auth = /увійти|увійдіть|зареєстр|вхід|пароль|sign in|log in/i;
      await expect(page.getByText(auth)).toHaveCount(0);
      await expect(page.getByRole("button", { name: auth })).toHaveCount(0);
      await expect(page.getByRole("link", { name: auth })).toHaveCount(0);
      await expect(page.getByLabel(/пароль|password/i)).toHaveCount(0);
    });
  });

  for (const { clicks, visible, button } of [
    { clicks: 0, visible: 25, button: "бачить" },
    { clicks: 1, visible: 50, button: "не бачить" },
  ]) {
    test(`@US-1 @AC-1.3 Кнопка «Показати більше» в межах топ-50 — натискань ${clicks}, видно ${visible}, кнопка ${button}`, async ({
      page,
    }) => {
      await test.step("Дано джерело даних має свіжі дані топ-50", async () => {});
      await test.step("І відвідувач відкрив список монет", async () => {
        await openApp(page);
        await waitForList(page);
      });
      await test.step(`Коли відвідувач обирає «Показати більше» ${clicks} раз`, async () => {
        for (let i = 0; i < clicks; i += 1) await showMore(page).click();
      });
      await test.step(`Тоді відвідувач бачить ${visible} монет`, async () => {
        await expect(coinLinks(page)).toHaveCount(visible);
      });
      await test.step(`І відвідувач ${button} кнопку «Показати більше»`, async () => {
        if (button === "бачить") await expect(showMore(page)).toBeVisible();
        else await expect(showMore(page)).toHaveCount(0);
      });
    });
  }

  for (const { coin, rank, result } of [
    { coin: "Bitcoin", rank: 1, result: "є в списку на місці 1" },
    { coin: "Монета-49", rank: 49, result: "є в списку на місці 49" },
    { coin: "Монета-50", rank: 50, result: "є в списку на місці 50" },
    { coin: "Монета-51", rank: 51, result: "відсутня в списку" },
  ]) {
    test(`@US-1 @AC-1.4 До списку потрапляють лише монети топ-50 — ${coin}, місце ${rank}, ${result}`, async ({
      page,
    }) => {
      const source = { current: null };
      await test.step(`Дано джерело даних має свіжі дані про монету "${coin}" з місцем за капіталізацією ${rank}`, async () => {
        // topMarkets віддає місця 1–51: Монета-51 приходить від джерела, продукт має її відкинути.
        const markets = topMarkets();
        expect(markets.find((m) => m.name === coin)?.market_cap_rank).toBe(rank);
        source.current = markets;
      });
      await test.step("Коли відвідувач відкриває список монет і обирає «Показати більше»", async () => {
        await openApp(page, "#/", { markets: source.current });
        await waitForList(page);
        await showMore(page).click();
        await expect(coinLinks(page)).toHaveCount(50);
      });
      await test.step(`Тоді монета "${coin}" ${result}`, async () => {
        if (rank <= 50) {
          await expect(coinItem(page, coin)).toHaveCount(1);
          await expect(rankCell(page, coin)).toHaveText(String(rank));
        } else {
          expect(await coinNames(page)).not.toContain(coin);
          await expect(main(page).getByText(coin, { exact: true })).toHaveCount(0);
        }
      });
    });
  }

  for (const { change, shown, direction } of [
    { change: "4,2", shown: "+4,2 %", direction: "зростання" },
    { change: "0,06", shown: "+0,1 %", direction: "зростання" },
    { change: "0,05", shown: "+0,1 %", direction: "зростання" },
    { change: "0,04", shown: "0,0 %", direction: "без змін" },
    { change: "0", shown: "0,0 %", direction: "без змін" },
    { change: "-0,04", shown: "0,0 %", direction: "без змін" },
    { change: "-0,05", shown: "−0,1 %", direction: "падіння" },
    { change: "-0,06", shown: "−0,1 %", direction: "падіння" },
    { change: "-3,7", shown: "−3,7 %", direction: "падіння" },
  ]) {
    test(`@US-1 @AC-1.5 Знак зміни за 7 днів — ${change} → ${shown}, ${direction}`, async ({
      page,
    }) => {
      const value = Number(change.replace(",", "."));
      await test.step(`Дано монета "Bitcoin" має зміну за 7 днів ${change}`, async () => {});
      await test.step("Коли відвідувач відкриває список монет", async () => {
        await openApp(page, "#/", {
          markets: topMarkets({ overrides: { 1: { change: value } } }),
        });
        await waitForList(page);
      });
      await test.step(`Тоді відвідувач бачить для монети "Bitcoin" зміну за 7 днів "${shown}" як ${direction}`, async () => {
        // Зміна — 4-та клітинка рядка: видимий текст і напрям для зчитувача.
        const cell = coinItem(page, "Bitcoin").getByRole("cell").nth(3);
        const text = norm(await cell.textContent());
        expect(text).toContain(shown);
        expect(text).toContain(direction);
        // Округлене 0,0 % показується без знака.
        expect(text).not.toMatch(/[+−-]0,0 %/);
      });
    });
  }
});
