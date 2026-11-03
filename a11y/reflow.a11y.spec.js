import { expect, test } from "@playwright/test";
import { routeCoinGecko } from "./support/fake-coingecko.js";

// NFR-7, WCAG 1.4.10 і 1.4.13: відкрита підказка «?» не дає горизонтальної прокрутки й не обрізається
// (Red-Team RT-2, етап 7). Кожну підказку відкривають по черзі на S-1 і S-2 на 320 і 1280 px.
const SCREENS = [
  {
    name: "список",
    hash: "#/",
    ready: (page) => page.getByRole("link", { name: "Bitcoin", exact: true }),
  },
  {
    name: "сторінка монети",
    hash: "#/coin/tether",
    ready: (page) => page.getByRole("heading", { level: 1, name: "Tether" }),
  },
];
const WIDTHS = [320, 1280];
const MARGIN = 1;

/** Положення панелі: межі вікна, прокрутка сторінки й чи видно кути панелі (не обрізані предком). */
function measure(panelId) {
  const panel = document.getElementById(panelId);
  const rect = panel.getBoundingClientRect();
  const inset = 4;
  const corners = [
    [rect.left + inset, rect.top + inset],
    [rect.right - inset, rect.top + inset],
    [rect.left + inset, rect.bottom - inset],
    [rect.right - inset, rect.bottom - inset],
  ];
  const hidden = corners.filter(([x, y]) => {
    const hit = document.elementFromPoint(x, y);
    return !hit || !panel.contains(hit);
  }).length;
  return {
    left: rect.left,
    right: rect.right,
    width: document.documentElement.clientWidth,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hiddenCorners: hidden,
  };
}

for (const width of WIDTHS) {
  for (const screen of SCREENS) {
    test(`підказки без прокрутки й обрізання: ${screen.name}, ${width} px`, async ({ browser }) => {
      // 320 px — мобільна емуляція (isMobile): на телефоні layout viewport (`innerWidth`) розширюється
      // разом із переповненням, а десктопний профіль цього не показує (перевірка в браузері, етап 7).
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        isMobile: width < 768,
        hasTouch: width < 768,
        baseURL: test.info().project.use.baseURL,
      });
      const page = await context.newPage();
      await routeCoinGecko(page);
      await page.goto(`./${screen.hash}`);
      await expect(screen.ready(page)).toBeVisible();

      const buttons = page.getByRole("button", { name: /^Що означає «/ });
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
      const failures = [];
      for (let i = 0; i < count; i += 1) {
        const button = buttons.nth(i);
        const name = (await button.getAttribute("aria-label")) ?? (await button.textContent());
        await button.scrollIntoViewIfNeeded();
        await button.click();
        const panelId = await button.getAttribute("aria-controls");
        await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
        await page.locator(`[id="${panelId}"]`).scrollIntoViewIfNeeded();
        const m = await page.evaluate(measure, panelId);
        if (
          m.overflowX > 0 ||
          m.left < -MARGIN ||
          m.right > m.width + MARGIN ||
          m.hiddenCorners > 0
        ) {
          failures.push(
            `${name}: overflowX ${m.overflowX}, left ${Math.round(m.left)}, right ${Math.round(m.right)} / ${m.width}, прихованих кутів ${m.hiddenCorners}`,
          );
        }
        await page.keyboard.press("Escape");
        await expect(page.locator(`[id="${panelId}"]`)).toHaveCount(0);
      }
      await context.close();
      expect(failures).toEqual([]);
    });
  }
}
