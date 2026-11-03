// TC-091 (E-NET офлайн після Revise №4) і TC-078 (запасний логотип, UX §8) — Chromium, фікстура.
import { chromium, devices } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:4173/crypto-radar/";
const FIX = "D:/crypto-radar/src/test/fixtures/";
const M = JSON.parse(readFileSync(FIX + "markets-top50.json", "utf8"));
const ST = JSON.parse(readFileSync(FIX + "stablecoins.json", "utf8"));
const fresh = () => M.map((c) => ({ ...c, last_updated: new Date(Date.now() - 60000).toISOString() }));
const out = {};
const b = await chromium.launch();
{
  // TC-091: перше відкриття — 500 (Error), далі браузер офлайн → «Спробувати ще раз»
  const c = await b.newContext({ ...devices["Desktop Chrome"] });
  let top = 0;
  let offline = false;
  await c.route("https://api.coingecko.com/**", (r) => {
    if (new URL(r.request().url()).searchParams.get("category")) return r.fulfill({ json: ST, headers: { "access-control-allow-origin": "*" } });
    top += 1;
    // route обходить setOffline: в офлайні обриваємо запит, як це зробив би браузер без мережі
    if (offline) return r.abort("internetdisconnected");
    return r.fulfill({ status: 500, json: {}, headers: { "access-control-allow-origin": "*" } });
  });
  const p = await c.newPage();
  await p.goto(BASE);
  await p.locator("[role=alert]").waitFor({ timeout: 20000 });
  out.beforeOffline = { alert: (await p.locator("[role=alert] h2").innerText()), top };
  await c.setOffline(true);
  offline = true;
  const topBefore = top;
  await p.getByRole("button", { name: "Спробувати ще раз" }).click();
  await p.waitForTimeout(8000);
  out.offline = {
    onLine: await p.evaluate(() => navigator.onLine),
    alert: await p.locator("[role=alert] h2").innerText(),
    status: (await p.locator("[role=status]").allInnerTexts()).filter(Boolean),
    prices: /\$\d/.test(await p.locator("main").innerText()),
    attemptsWhileOffline: top - topBefore,
  };
  await c.close();
}
{
  // TC-078: логотипи coin-images не завантажились
  const c = await b.newContext({ ...devices["Desktop Chrome"] });
  await c.route("https://api.coingecko.com/**", (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.get("category") ? ST : fresh(), headers: { "access-control-allow-origin": "*" } }),
  );
  await c.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  const p = await c.newPage();
  await p.goto(BASE + "#/coin/bitcoin");
  await p.getByRole("heading", { level: 1, name: "Bitcoin" }).waitFor();
  await p.waitForTimeout(800);
  out.logo = await p.evaluate(() => {
    const img = document.querySelector("main img");
    return {
      img: Boolean(img),
      broken: img ? img.complete && img.naturalWidth === 0 : null,
      fallbackLetter: [...document.querySelectorAll("main [aria-hidden=true], main span")].some((e) => e.textContent.trim() === "B" && e.children.length === 0),
    };
  });
  await p.screenshot({ path: "D:/crypto-radar/.agentic/qa/evidence/BUG-009-broken-logo.png", clip: { x: 0, y: 0, width: 1280, height: 260 } });
  await p.goto(BASE);
  await p.locator("main tbody tr").first().waitFor();
  await p.waitForTimeout(800);
  out.listBrokenImgs = await p.evaluate(() => [...document.querySelectorAll("main img")].filter((i) => i.complete && i.naturalWidth === 0).length);
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
