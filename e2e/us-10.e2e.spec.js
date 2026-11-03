// Етап 8.b: US-10 «Світла й темна тема» (02-requirements.md, @US-10) у справжньому браузері.
// Спринт 1: лише AC-10.1 (тема пристрою, public/theme-init.js); перемикача теми в продукті ще немає.
import { expect, test } from "@playwright/test";
import { main, openApp, waitForList } from "./support/app.js";

const THEME_KEY = "crypto-radar:theme";

// Фон сторінки (токен --kr-surface, src/index.css): світла #f7f5fb, темна #15121f.
const THEMES = {
  світлу: { colorScheme: "light", dataTheme: "light", surface: "rgb(247, 245, 251)" },
  темну: { colorScheme: "dark", dataTheme: "dark", surface: "rgb(21, 18, 31)" },
};

test.describe("US-10: Світла й темна тема", () => {
  for (const [theme, expected] of Object.entries(THEMES)) {
    test(`@US-10 @AC-10.1 Тема першого візиту як на пристрої: ${theme}`, async ({ page }) => {
      await test.step(`Дано на пристрої відвідувача обрано ${theme} тему`, async () => {
        await page.emulateMedia({ colorScheme: expected.colorScheme });
      });
      await test.step("І відвідувач ще не перемикав тему в Крипто-Радарі", async () => {
        // Новий контекст браузера: localStorage порожній, збереженого вибору теми немає.
        const { origins } = await page.context().storageState();
        expect(origins).toEqual([]);
      });
      await test.step("Коли відвідувач відкриває список монет", async () => {
        await openApp(page, "#/");
        await waitForList(page);
      });
      await test.step(`Тоді відвідувач бачить ${theme} тему`, async () => {
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(
          expected.dataTheme,
        );
        // Фон каркаса (предок <main>) — колір теми.
        const surface = await main(page).evaluate(
          (el) => getComputedStyle(el.parentElement).backgroundColor,
        );
        expect(surface).toBe(expected.surface);
        expect(
          await page.evaluate((key) => window.localStorage.getItem(key), THEME_KEY),
        ).toBeNull();
      });
    });
  }

  // AC-10.2 — спринт 2, US-10 Should (backlog)
  test.fixme("@US-10 @AC-10.2 Перемикання теми запам'ятовується", async ({ page }) => {
    await test.step("Дано відвідувач бачить світлу тему", async () => {
      await page.emulateMedia({ colorScheme: "light" });
      await openApp(page, "#/");
    });
    await test.step("Коли відвідувач перемикає тему на темну", async () => {
      await page.getByRole("button", { name: /тема/i }).click();
    });
    await test.step("І наступного візиту знову відкриває Крипто-Радар на тому самому пристрої", async () => {
      await page.reload();
    });
    await test.step("Тоді відвідувач бачить темну тему на всіх екранах", async () => {
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    });
  });
});
