// Ретест BUG-002, BUG-005, BUG-007 і 320 px після Revise №4 етапу 7 (фікстура замість живого CoinGecko під 429).
import { chromium, devices } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:4173/crypto-radar/";
const FIX = "D:/crypto-radar/src/test/fixtures/";
const M = JSON.parse(readFileSync(FIX + "markets-top50.json", "utf8"));
const ST = JSON.parse(readFileSync(FIX + "stablecoins.json", "utf8"));
const fresh = () => M.map((c) => ({ ...c, last_updated: new Date(Date.now() - 60000).toISOString() }));

async function context(browser, opts) {
  const c = await browser.newContext(opts);
  await c.route("https://api.coingecko.com/**", (r) =>
    r.fulfill({
      json: new URL(r.request().url()).searchParams.get("category") ? ST : fresh(),
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await c.route("https://coin-images.coingecko.com/**", (r) => r.fulfill({ status: 404 }));
  return c;
}
const focus = (p) => p.evaluate(() => `${document.activeElement.tagName}:${(document.activeElement.textContent || "").slice(0, 30)}`);
const rows = (p) => p.locator("main tbody tr").count();
const sortVal = (p) => p.getByLabel("Сортування").inputValue();

const out = {};
const b = await chromium.launch();
{
  const c = await context(b, { ...devices["Desktop Chrome"] });
  const p = await c.newPage();
  await p.goto(BASE);
  await p.locator("main tbody tr").first().waitFor();
  out.firstLoadFocus = await focus(p);
  await p.getByLabel("Сортування").selectOption("cap");
  await p.getByRole("button", { name: "Показати більше" }).click();
  out.before = { rows: await rows(p), sort: await sortVal(p) };
  await p.getByRole("link", { name: "Bitcoin", exact: true }).click();
  await p.getByRole("heading", { level: 1, name: "Bitcoin" }).waitFor();
  await p.waitForTimeout(500);
  out.coinFocus = await focus(p);
  out.coinActive = await p.evaluate(() => document.activeElement.closest("main") ? document.activeElement.outerHTML.slice(0, 120) : "поза main");
  out.chartLabels = await p.locator("main svg[aria-hidden=true] + *").first().innerText().catch(() => "—");
  await p.getByRole("link", { name: /До списку монет/ }).click();
  await p.locator("main tbody tr").first().waitFor();
  out.afterBackLink = { rows: await rows(p), sort: await sortVal(p), focus: await focus(p) };
  await p.getByLabel("Пошук монети").fill("sol");
  await p.waitForTimeout(400);
  await p.getByRole("link", { name: "Solana", exact: true }).click();
  await p.getByRole("heading", { level: 1, name: "Solana" }).waitFor();
  await p.goBack();
  await p.locator("main tbody tr").first().waitFor();
  await p.waitForTimeout(500);
  out.afterHistoryBack = { query: await p.getByLabel("Пошук монети").inputValue(), rows: await rows(p), sort: await sortVal(p), focus: await focus(p) };
  await p.getByRole("link", { name: /Обрані/ }).click();
  await p.waitForTimeout(500);
  out.favFocus = await focus(p);
  await p.goto(BASE + "#/coin/kaspa");
  await p.waitForTimeout(500);
  out.outOfTopFocus = await focus(p);
  await p.reload();
  await p.goto(BASE + "#/");
  await p.locator("main tbody tr").first().waitFor();
  out.afterReload = { sort: await sortVal(p), query: await p.getByLabel("Пошук монети").inputValue(), rows: await rows(p) };
  await c.close();
}
{
  const c = await context(b, { ...devices["Pixel 7"], viewport: { width: 320, height: 640 } });
  const p = await c.newPage();
  out.mobile = {};
  for (const r of ["#/", "#/coin/bitcoin", "#/coin/tether", "#/favorites", "#/abc"]) {
    await p.goto(BASE + r);
    await p.waitForTimeout(800);
    const hints = p.locator('main button[aria-label^="Що означає"]');
    let worst = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (let i = 0; i < (await hints.count()); i += 1) {
      await hints.nth(i).click();
      worst = Math.max(worst, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
      await p.keyboard.press("Escape");
    }
    out.mobile[r] = worst;
  }
  await p.goto(BASE + "#/coin/bitcoin");
  await p.waitForTimeout(800);
  out.mobileChartLabels = await p.locator("main svg[aria-hidden=true] + *").first().innerText().catch(() => "—");
  await p.screenshot({ path: "D:/crypto-radar/.agentic/qa/evidence/BUG-007-retest-chart-labels-320px.png" });
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
