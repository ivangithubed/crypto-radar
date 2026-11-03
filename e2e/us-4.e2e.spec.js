// Етап 8.b: US-4 «Сторінка монети з графіком за 7 днів» (02-requirements.md, @US-4) у справжньому браузері.
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, main, openApp, searchInput, waitForList } from "./support/app.js";
import { NOW, routeCoinGecko } from "./support/coingecko.js";

const CHART_TITLE = "Графік за 7 днів";
const CHART_ALT = /Ціна за 7 днів: на початку/;
const OUT_OF_TOP = "Монета зараз поза топ-50";

/** Підміна джерела й годинника без переходу: «збережене посилання» відкривається окремим кроком. */
async function routeOnly(page) {
  await routeCoinGecko(page);
  await page.clock.setFixedTime(NOW);
}

const coinHeading = (page, name) => page.getByRole("heading", { level: 1, name, exact: true });

/** Графік: заголовок, SVG (aria-hidden, ролі немає) і текстова альтернатива. */
async function expectChart(page) {
  await expect(main(page).getByRole("heading", { level: 2, name: CHART_TITLE })).toBeVisible();
  await expect(main(page).locator("svg").first()).toBeVisible();
  await expect(main(page).getByText(CHART_ALT)).toBeVisible();
}

test.describe("US-4: Сторінка монети з графіком за 7 днів", () => {
  test("@US-4 @AC-4.1 @smoke Відвідувач бачить дані монети й графік за 7 днів", async ({
    page,
  }) => {
    await test.step('Дано джерело даних має свіжі дані монети "Bitcoin" і її ціни за останні 7 днів', async () => {
      await openApp(page, "#/");
      await waitForList(page);
    });

    await test.step('Коли відвідувач відкриває сторінку монети "Bitcoin" зі списку монет', async () => {
      await main(page).getByRole("link", { name: "Bitcoin", exact: true }).click();
      await expect(coinHeading(page, "Bitcoin")).toBeVisible();
    });

    await test.step('Тоді відвідувач бачить назву "Bitcoin", тікер "BTC", місце в рейтингу, ціну, зміну за 7 днів і капіталізацію', async () => {
      const content = main(page);
      await expect(content).toContainText("$67 250,10");
      await expect(content).toContainText("+4,2 %");
      // Список даних <dl>: місце, тікер, зміна за 7 днів, капіталізація.
      await expect(content.getByRole("term")).toHaveText([
        /Місце в рейтингу/,
        /Тікер/,
        /Зміна за 7 днів/,
        /Капіталізація/,
      ]);
      const values = content.getByRole("definition");
      await expect(values.nth(0)).toHaveText("1");
      await expect(values.nth(1)).toHaveText("BTC");
      await expect(values.nth(2)).toContainText("+4,2 %");
      await expect(values.nth(3)).toHaveText("$1,32 трлн");
    });

    await test.step("І відвідувач бачить графік за 7 днів, що охоплює останні 7 днів", async () => {
      await expectChart(page);
      const alt = main(page).getByText(CHART_ALT);
      await expect(alt).toContainText("на початку $64 560,10");
      await expect(alt).toContainText("наприкінці $67 250,10");
      await expect(alt).toContainText("мінімум $64 560,10");
      await expect(alt).toContainText("максимум $67 250,10");
      // Підписи меж періоду: остання точка — 2 листопада, перша — рівно на 7 днів раніше.
      await expect(main(page).getByText(/^26 жовт/)).toBeVisible();
      await expect(main(page).getByText(/^2 лист/)).toBeVisible();
      await expectNoA11yViolations(page);
    });
  });

  test("@US-4 @AC-4.2 Інших періодів графіка немає", async ({ page }) => {
    await test.step('Дано джерело даних має свіжі дані монети "Bitcoin" і її ціни за останні 7 днів', async () => {
      await openApp(page, "#/coin/bitcoin");
    });

    await test.step('Коли відвідувач відкриває сторінку монети "Bitcoin"', async () => {
      await expect(coinHeading(page, "Bitcoin")).toBeVisible();
      await expectChart(page);
    });

    await test.step("Тоді відвідувачу недоступний вибір іншого періоду графіка", async () => {
      const content = main(page);
      await expect(content.getByRole("combobox")).toHaveCount(0);
      await expect(content.getByRole("radio")).toHaveCount(0);
      await expect(content.getByRole("tab")).toHaveCount(0);
      await expect(content.getByText(/24 год|30 днів|90 днів|1 рік|за місяць|за рік/)).toHaveCount(
        0,
      );
    });
  });

  test("@US-4 @AC-4.3 Сторінка монети на межі топ-50: Монета-50 | 50 | дані монети й графік за 7 днів", async ({
    page,
  }) => {
    await test.step('Дано джерело даних має свіжі дані про монету "Монета-50" з місцем за капіталізацією 50', async () => {
      await routeOnly(page);
    });

    await test.step('Коли відвідувач відкриває сторінку монети "Монета-50" за збереженим посиланням', async () => {
      await page.goto("#/coin/moneta-50");
      await expect(coinHeading(page, "Монета-50")).toBeVisible();
    });

    await test.step("Тоді відвідувач бачить дані монети й графік за 7 днів", async () => {
      const content = main(page);
      await expect(content.getByRole("definition").nth(0)).toHaveText("50");
      await expect(content).toContainText("$");
      await expectChart(page);
    });
  });

  test('@US-4 @AC-4.3 Сторінка монети на межі топ-50: Монета-51 | 51 | повідомлення "Монета зараз поза топ-50" без ціни й графіка', async ({
    page,
  }) => {
    await test.step('Дано джерело даних має свіжі дані про монету "Монета-51" з місцем за капіталізацією 51', async () => {
      await routeOnly(page);
    });

    await test.step('Коли відвідувач відкриває сторінку монети "Монета-51" за збереженим посиланням', async () => {
      await page.goto("#/coin/moneta-51");
    });

    await test.step('Тоді відвідувач бачить повідомлення "Монета зараз поза топ-50" без ціни й графіка', async () => {
      await expect(coinHeading(page, OUT_OF_TOP)).toBeVisible();
      const content = main(page);
      await expect(content.getByRole("status")).toContainText("Даних про цю монету немає");
      await expect(content).not.toContainText("$");
      await expect(content.getByText(CHART_ALT)).toHaveCount(0);
      await expect(content.getByRole("heading", { name: CHART_TITLE })).toHaveCount(0);
      await expect(content.locator("svg")).toHaveCount(0);
      await expectNoA11yViolations(page);
    });
  });

  test("@US-4 @AC-4.4 Сторінку монети відкривають із результатів пошуку", async ({ page }) => {
    await test.step('Дано відвідувач шукав "btc"', async () => {
      await openApp(page, "#/");
      await waitForList(page);
      await searchInput(page).fill("btc");
      await expect(main(page).getByRole("link", { name: "Ethereum", exact: true })).toHaveCount(0);
      await expect(main(page).getByRole("link", { name: "Bitcoin", exact: true })).toBeVisible();
    });

    await test.step('Коли відвідувач відкриває монету "Bitcoin" з результатів пошуку', async () => {
      await main(page).getByRole("link", { name: "Bitcoin", exact: true }).click();
    });

    await test.step('Тоді відвідувач бачить сторінку монети "Bitcoin" з графіком за 7 днів', async () => {
      await expect(coinHeading(page, "Bitcoin")).toBeVisible();
      await expectChart(page);
    });
  });
});
