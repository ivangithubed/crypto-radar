// Спільні кроки E2E: відкрити застосунок із підміненим джерелом і фіксованим годинником, локатори за ролями й доступними іменами, axe.
import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import { NOW, routeCoinGecko } from "./coingecko.js";

export const FAVORITES_KEY = "crypto-radar:favorites";
export const DISCLAIMER = "Інформація не є інвестиційною порадою";
export const RETRY = "Спробувати ще раз";
export const SORT = {
  price: "Ціна: від найдорожчої",
  gain: "Зміна за 7 днів: найбільше зростання",
  loss: "Зміна за 7 днів: найбільше падіння",
  cap: "Капіталізація: від найбільшої",
};

/** Нерозривні й вузькі пробіли (U+00A0, U+202F) → звичайний пробіл. */
export const norm = (text) => (text ?? "").replace(/[  ]/g, " ").replace(/\s+/g, " ");

/**
 * Відкриває Крипто-Радар за маршрутом.
 * Годинник сторінки: Date зафіксовано на `clock` (типово NOW), таймери справжні (опитування, повтори).
 * @param {import('@playwright/test').Page} page
 * @param {string} [hash] маршрут, наприклад "#/coin/bitcoin"
 * @param {{favorites?: string[], clock?: Date | false, fakeTimers?: boolean} & Parameters<typeof routeCoinGecko>[1]} [options]
 *   `clock: false` — справжній годинник; `favorites` — id монет у localStorage до старту;
 *   `fakeTimers: true` — таймери теж керовані (`page.clock.runFor`), щоб перевіряти вікна повторів без пауз
 */
export async function openApp(
  page,
  hash = "#/",
  { favorites, clock = NOW, fakeTimers = false, ...sourceOptions } = {},
) {
  const source = await routeCoinGecko(page, sourceOptions);
  if (clock && fakeTimers) await page.clock.install({ time: clock });
  else if (clock) await page.clock.setFixedTime(clock);
  if (favorites) {
    await page.addInitScript(
      ([key, value]) => {
        if (!window.sessionStorage.getItem("e2e:seeded")) {
          window.localStorage.setItem(key, value);
          window.sessionStorage.setItem("e2e:seeded", "1");
        }
      },
      [FAVORITES_KEY, JSON.stringify(favorites)],
    );
  }
  // У режимі «pending» запит preload (index.html) не завершується, і WebKit може не дати подію load:
  // чекаємо лише DOMContentLoaded — застосунок уже показує стан Loading.
  await page.goto(hash, { waitUntil: source.mode === "pending" ? "domcontentloaded" : "load" });
  return source;
}

export const main = (page) => page.getByRole("main");

/** Посилання на сторінки монет у вмісті екрана, у порядку DOM. */
export const coinLinks = (page) => main(page).locator('a[href*="#/coin/"]');

/** Назви монет у порядку показу. */
export async function coinNames(page) {
  return (await coinLinks(page).allInnerTexts()).map((text) => norm(text).trim());
}

/** Чекає стан Data списку: посилання на Bitcoin (місце 1). */
export const waitForList = (page) =>
  expect(main(page).getByRole("link", { name: "Bitcoin", exact: true })).toBeVisible();

/** Блок помилки даних (role="alert"). */
export const alertBlock = (page) => page.getByRole("alert");

/** Картка (li) або рядок (tr) монети за назвою. */
export const coinItem = (page, name) =>
  main(page)
    .locator("li, tr")
    .filter({ has: page.getByRole("link", { name, exact: true }) });

export const sortSelect = (page) => page.getByLabel("Сортування");

export async function chooseSort(page, label) {
  await sortSelect(page).selectOption({ label });
}

export const searchInput = (page) => page.getByLabel("Пошук монети");

export const showMore = (page) => page.getByRole("button", { name: "Показати більше" });

export async function openFavoritesTab(page) {
  await page.getByRole("link", { name: /^Обрані/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Обрані" })).toBeVisible();
}

export const hintButton = (page, term) =>
  page.getByRole("button", { name: `Що означає «${term}»?` }).first();

/** id обраних монет у localStorage. */
export async function storedFavorites(page) {
  return page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "[]"),
    FAVORITES_KEY,
  );
}

/** Текст вмісту екрана без цін: жодних «$», відсотків зміни й скорочень капіталізації (AC-8.x). */
export async function expectNoPrices(page) {
  const text = norm(await main(page).innerText());
  expect(text).not.toContain("$");
  expect(text).not.toMatch(/\d+,\d %/);
  expect(text).not.toMatch(/трлн|млрд|млн/);
}

/** axe-core, WCAG 2.2 AA: 0 порушень critical / serious (NFR-6). Правила не вимикаються. */
export async function expectNoA11yViolations(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}
