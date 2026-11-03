import { chromium, devices } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
import { readFileSync } from "node:fs";
const BASE = "http://localhost:4173/crypto-radar/";
const FIX = "D:/crypto-radar/src/test/fixtures/";
const M = JSON.parse(readFileSync(FIX + "markets-top50.json", "utf8"));
const S = JSON.parse(readFileSync(FIX + "stablecoins.json", "utf8"));
const fresh = () => M.map((c) => ({ ...c, last_updated: new Date(Date.now() - 60000).toISOString() }));
async function ctx(browser, init) {
  const c = await browser.newContext({ ...devices["Desktop Chrome"] });
  await c.route("https://api.coingecko.com/**", (r) => r.fulfill({ json: new URL(r.request().url()).searchParams.get("category") ? S : fresh(), headers: { "access-control-allow-origin": "*" } }));
  await c.route("https://coin-images.coingecko.com/**", (r) => r.fulfill({ status: 404 }));
  if (init) await c.addInitScript(init);
  return c;
}
const out = {};
const b = await chromium.launch();
{ // C-TAB
  const c = await ctx(b);
  const a = await c.newPage(); const p = await c.newPage();
  await a.goto(BASE); await p.goto(BASE + "#/favorites");
  await a.locator("main tbody tr").first().waitFor();
  await a.getByRole("button", { name: "Додати в обрані: Solana" }).click();
  await p.waitForTimeout(700);
  out["C-TAB"] = { tabB: (await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 80), tabLabel: await p.locator("nav a").nth(1).innerText() };
  await c.close();
}
{ // E-STORE
  const c = await ctx(b, () => { Storage.prototype.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); }; });
  const a = await c.newPage(); await a.goto(BASE); await a.locator("main tbody tr").first().waitFor();
  await a.getByRole("button", { name: "Додати в обрані: Solana" }).click(); await a.waitForTimeout(400);
  out["E-STORE"] = { star: await a.getByRole("button", { name: /обраних: Solana|обрані: Solana/ }).getAttribute("aria-label"), status: (await a.locator("[role=status]").allInnerTexts()).filter(Boolean) };
  await c.close();
}
{ // логотип не завантажився → кружок з літерою; стейблкоїн-запит упав → Partial
  const c = await b.newContext({ ...devices["Desktop Chrome"] });
  await c.route("https://api.coingecko.com/**", (r) => new URL(r.request().url()).searchParams.get("category") ? r.fulfill({ status: 429, json: {}, headers: { "access-control-allow-origin": "*" } }) : r.fulfill({ json: fresh(), headers: { "access-control-allow-origin": "*" } }));
  await c.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  const a = await c.newPage(); await a.goto(BASE + "#/coin/tether"); await a.waitForTimeout(1200);
  out["Partial+logo"] = { alert: await a.locator("[role=alert]").count(), stableHint: await a.getByRole("button", { name: "Що означає «Стейблкоїн»?" }).count(), prices: /\$\d/.test(await a.locator("main").innerText()), imgs: await a.locator("main img").count(), fallback: (await a.locator("h1").locator("..").innerText()).slice(0, 30) };
  await c.close();
}
{ // 640 px ≈ 1280 px при 200 % (WCAG 1.4.4/1.4.10), альбомна 640×360
  const c = await ctx(b); const a = await c.newPage();
  for (const [w, h] of [[640, 800], [640, 360], [1280, 800]]) {
    await a.setViewportSize({ width: w, height: h });
    for (const r of ["#/", "#/coin/bitcoin", "#/favorites", "#/abc"]) { await a.goto(BASE + r); await a.waitForTimeout(700); out[`reflow ${w}x${h} ${r}`] = await a.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); }
  }
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
