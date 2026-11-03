import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routeCoinGecko } from "./support/fake-coingecko.js";

// NFR-6: теги WCAG 2.2 AA; поріг — 0 порушень рівнів critical і serious на кожному екрані й стані
// (UX §3, план етапу 6 розділ 9, TD-002) в обох темах і на обох макетах (картки < 768 px, таблиця ≥ 768 px).
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const BLOCKING_IMPACTS = new Set(["critical", "serious"]);
const FAVORITES = JSON.stringify(["bitcoin", "ethereum", "moneta-x"]);

const SCREENS = [
  { name: "список", hash: "#/", ready: { role: "link", name: "Bitcoin" } },
  { name: "пошук без збігів", hash: "#/", search: "zzzz", ready: { text: "Нічого не знайдено" } },
  { name: "завантаження", hash: "#/", mode: "pending", ready: { text: "Завантажуємо ціни…" } },
  { name: "помилка", hash: "#/", mode: "error", ready: { role: "alert" } },
  { name: "сторінка монети", hash: "#/coin/bitcoin", ready: { heading: "Bitcoin" } },
  { name: "поза топ-50", hash: "#/coin/moneta-x", ready: { heading: "Монета зараз поза топ-50" } },
  { name: "обрані порожні", hash: "#/favorites", ready: { text: "Тут поки порожньо" } },
  {
    name: "обрані заповнені",
    hash: "#/favorites",
    favorites: FAVORITES,
    ready: { role: "link", name: "Bitcoin" },
  },
  { name: "сторінку не знайдено", hash: "#/abc", ready: { heading: "Сторінку не знайдено" } },
];

const VIEWPORTS = [
  { name: "телефон", size: { width: 375, height: 812 } },
  { name: "ПК", size: { width: 1280, height: 900 } },
];

function readyLocator(page, ready) {
  if (ready.heading) return page.getByRole("heading", { level: 1, name: ready.heading });
  if (ready.role)
    return page.getByRole(ready.role, ready.name ? { name: ready.name, exact: true } : {}).first();
  return page.getByText(ready.text).first();
}

for (const theme of ["light", "dark"]) {
  for (const viewport of VIEWPORTS) {
    for (const screen of SCREENS) {
      test(`${screen.name}: 0 critical/serious (${theme}, ${viewport.name})`, async ({ page }) => {
        await page.setViewportSize(viewport.size);
        await routeCoinGecko(page, { mode: screen.mode });
        // Тему й обрані кладемо до завантаження: тему ставить theme-init.js з localStorage (UX UF-7.3).
        await page.addInitScript(
          ({ value, favorites }) => {
            window.localStorage.setItem("crypto-radar:theme", value);
            if (favorites) window.localStorage.setItem("crypto-radar:favorites", favorites);
          },
          { value: theme, favorites: screen.favorites },
        );
        await page.goto(`./${screen.hash}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        if (screen.search) {
          await page.getByRole("link", { name: "Bitcoin", exact: true }).waitFor();
          await page.getByLabel("Пошук монети").fill(screen.search);
        }
        await expect(readyLocator(page, screen.ready)).toBeVisible();

        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        const blocking = violations
          .filter((violation) => BLOCKING_IMPACTS.has(violation.impact))
          .map(
            (violation) =>
              `${violation.impact}: ${violation.id} (${violation.nodes.length}) ${violation.nodes
                .slice(0, 3)
                .map((node) => node.target.join(" "))
                .join(" | ")}`,
          );

        expect(blocking).toEqual([]);
      });
    }
  }
}
