import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// NFR-6: теги WCAG 2.2 AA; поріг — 0 порушень рівнів critical і serious, в обох темах.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

// Тему перемикає атрибут data-theme на <html> (розділ 9.2 документа UX, етап 4).
for (const theme of ["light", "dark"]) {
  test(`app shell has no critical or serious axe violations (${theme})`, async ({ page }) => {
    await page.goto("./");
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = violations
      .filter((violation) => BLOCKING_IMPACTS.has(violation.impact))
      .map((violation) => `${violation.impact}: ${violation.id} (${violation.nodes.length})`);

    expect(blocking).toEqual([]);
  });
}
