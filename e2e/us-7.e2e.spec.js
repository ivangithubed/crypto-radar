// Етап 8.b: US-7 «Підказки до термінів» (02-requirements.md, @US-7) у справжньому браузері.
import { expect, test } from "@playwright/test";
import {
  coinItem,
  coinLinks,
  coinNames,
  expectNoA11yViolations,
  hintButton,
  showMore,
  sortSelect,
  waitForList,
} from "./support/app.js";
import { NOW, routeCoinGecko } from "./support/coingecko.js";

// Початок тексту кожної підказки — дослівно UX §5.1 (як в оракулі етапу 6).
const HINTS = {
  Капіталізація: "Скільки коштують усі монети цього виду разом",
  "Зміна за 7 днів":
    "На скільки відсотків ціна монети зараз вища (+) або нижча (−), ніж рівно тиждень тому.",
  Тікер: "Коротке позначення монети з кількох латинських літер",
  "Місце в рейтингу": "Номер монети серед усіх криптовалют за капіталізацією.",
  Стейблкоїн: "Монета, ціна якої прив",
  Волатильність: "Наскільки сильно й часто стрибає ціна.",
};

const SCREENS = {
  "список монет": { hash: "#/", heading: "Топ-50 монет" },
  'сторінку монети "Bitcoin"': { hash: "#/coin/bitcoin", heading: "Bitcoin" },
  'сторінку монети "Tether"': { hash: "#/coin/tether", heading: "Tether" },
};

/** Панель відкритої підказки: `role="region"` з ім'ям терміна. */
const hintPanel = (page, term) => page.getByRole("region", { name: term, exact: true });

/** Передумова: підмінене джерело зі свіжими даними топ-50, годинник сторінки — NOW. */
async function freshSource(page) {
  const source = await routeCoinGecko(page);
  await page.clock.setFixedTime(NOW);
  return source;
}

async function openScreen(page, screen) {
  const { hash, heading } = SCREENS[screen];
  await page.goto(hash);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  if (hash === "#/") await waitForList(page);
}

async function expectHint(page, term) {
  const button = hintButton(page, term);
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = hintPanel(page, term);
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(HINTS[term]);
}

test.describe("US-7: Підказки до термінів", () => {
  const EXAMPLES = [
    ["список монет", "Капіталізація"],
    ["список монет", "Зміна за 7 днів"],
    ["список монет", "Тікер"],
    ["список монет", "Місце в рейтингу"],
    ['сторінку монети "Bitcoin"', "Волатильність"],
    ['сторінку монети "Tether"', "Стейблкоїн"],
  ];

  for (const [screen, term] of EXAMPLES) {
    test(`@US-7 @AC-7.1 Підказка до кожного з 6 термінів: ${screen}, ${term}`, async ({ page }) => {
      await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
        await freshSource(page);
      });
      await test.step(`Дано відвідувач відкрив ${screen}`, async () => {
        await openScreen(page, screen);
        await expect(hintButton(page, term)).toBeVisible();
        await expect(hintPanel(page, term)).toHaveCount(0);
      });
      await test.step(`Коли відвідувач відкриває підказку до терміна "${term}"`, async () => {
        await hintButton(page, term).click();
      });
      await test.step(`Тоді відвідувач бачить коротке пояснення терміна "${term}" українською`, async () => {
        await expectHint(page, term);
        await expectNoA11yViolations(page);
      });
    });
  }

  test("@US-7 @AC-7.2 Підказку можна закрити", async ({ page }) => {
    let namesBefore;
    let sortBefore;
    await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
      await freshSource(page);
    });
    await test.step('Дано відвідувач відкрив підказку до терміна "Капіталізація"', async () => {
      await openScreen(page, "список монет");
      namesBefore = await coinNames(page);
      sortBefore = await sortSelect(page).inputValue();
      await hintButton(page, "Капіталізація").click();
      await expectHint(page, "Капіталізація");
    });
    await test.step("Коли відвідувач закриває підказку", async () => {
      await hintPanel(page, "Капіталізація")
        .getByRole("button", { name: "Закрити підказку" })
        .click();
    });
    await test.step("Тоді відвідувач не бачить підказки", async () => {
      await expect(hintPanel(page, "Капіталізація")).toHaveCount(0);
      await expect(page.getByText(HINTS.Капіталізація)).toHaveCount(0);
      await expect(hintButton(page, "Капіталізація")).toHaveAttribute("aria-expanded", "false");
    });
    await test.step("І відвідувач бачить список монет у тому самому стані", async () => {
      await expect(coinLinks(page)).toHaveCount(25);
      expect(await coinNames(page)).toEqual(namesBefore);
      await expect(sortSelect(page)).toHaveValue(sortBefore);
    });
  });

  test("@US-7 @AC-7.3 Підказка про стейблкоїн лише біля стейблкоїнів", async ({ page }) => {
    const stableHint = { name: "Що означає «Стейблкоїн»?" };
    let source;
    await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
      source = await freshSource(page);
    });
    await test.step('Дано джерело даних відносить монету "Tether" до стейблкоїнів, а монету "Bitcoin" — ні', async () => {
      // Підміна віддає перелік стейблкоїнів Tether і USD Coin, без Bitcoin (e2e/support/coingecko.js).
      expect(source.mode).toBe("ok");
    });
    await test.step("Коли відвідувач переглядає список монет", async () => {
      await openScreen(page, "список монет");
      // Tether ($1) за типовим сортуванням за ціною — серед других 25 монет.
      await showMore(page).click();
      await expect(coinLinks(page)).toHaveCount(50);
      await expect.poll(() => source.stableRequests).toBeGreaterThan(0);
    });
    await test.step('Тоді біля монети "Tether" є підказка до терміна "Стейблкоїн"', async () => {
      await expect(coinItem(page, "Tether").getByRole("button", stableHint)).toBeVisible();
    });
    await test.step('Але біля монети "Bitcoin" немає підказки до терміна "Стейблкоїн"', async () => {
      await expect(coinItem(page, "Bitcoin")).toBeVisible();
      await expect(coinItem(page, "Bitcoin").getByRole("button", stableHint)).toHaveCount(0);
    });
  });

  test.describe("на телефоні", () => {
    // L-007: мобільна емуляція (isMobile, hasTouch). Firefox не підтримує isMobile — лише вузький екран і дотик.
    test.use({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      // Перевизначення фікстури Playwright; другий аргумент — її колбек, не React-хук.
      isMobile: async ({ browserName }, provide) => {
        await provide(browserName !== "firefox");
      },
    });

    test("@US-7 @AC-7.4 Підказку можна відкрити на телефоні", async ({ page }) => {
      await test.step("Дано джерело даних має свіжі дані топ-50", async () => {
        await freshSource(page);
      });
      await test.step("Дано відвідувач відкрив список монет на телефоні", async () => {
        await openScreen(page, "список монет");
        expect(await page.evaluate(() => document.documentElement.clientWidth)).toBeLessThan(768);
      });
      await test.step('Коли відвідувач відкриває підказку до терміна "Зміна за 7 днів"', async () => {
        await hintButton(page, "Зміна за 7 днів").tap();
      });
      await test.step('Тоді відвідувач бачить коротке пояснення терміна "Зміна за 7 днів" українською', async () => {
        await expectHint(page, "Зміна за 7 днів");
        const box = await hintPanel(page, "Зміна за 7 днів").boundingBox();
        const width = await page.evaluate(() => document.documentElement.clientWidth);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      });
    });
  });
});
