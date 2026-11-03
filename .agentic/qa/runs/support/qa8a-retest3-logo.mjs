// Скіл verify, крок 6 (Revise №5 етапу 7): BUG-003 («—» для null), BUG-009 (запасний логотип), фокус без рамки й прокрутка списку.
import { chromium, devices } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:4173/crypto-radar/";
const SHOTS = process.argv[2];
const FIX = "D:/crypto-radar/src/test/fixtures/";
const M = JSON.parse(readFileSync(FIX + "markets-top50.json", "utf8"));
const ST = JSON.parse(readFileSync(FIX + "stablecoins.json", "utf8"));
const NULL_ID = M[3].id;
const NULL_NAME = M[3].name;
const fresh = () =>
  M.map((c, i) => ({
    ...c,
    last_updated: new Date(Date.now() - 60000).toISOString(),
    price_change_percentage_7d_in_currency:
      i === 3 ? null : c.price_change_percentage_7d_in_currency,
  }));
const out = {};
const b = await chromium.launch();

async function context(device, { blockLogos }) {
  const c = await b.newContext({ ...device });
  await c.route("https://api.coingecko.com/**", (r) =>
    r.fulfill({
      json: new URL(r.request().url()).searchParams.get("category") ? ST : fresh(),
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  if (blockLogos) await c.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  const p = await c.newPage();
  const errors = [];
  p.on(
    "console",
    (m) =>
      m.type() === "error" &&
      !m.text().includes("coin-images") &&
      !m.text().includes("ERR_FAILED") &&
      errors.push(m.text()),
  );
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.addInitScript(() => {
    window.__csp = 0;
    document.addEventListener("securitypolicyviolation", () => (window.__csp += 1));
  });
  return { c, p, errors };
}

const h1State = (p) =>
  p.evaluate(() => {
    const h = document.querySelector("#main h1");
    const s = getComputedStyle(h);
    return {
      text: h.textContent,
      focused: document.activeElement === h,
      focusVisible: h.matches(":focus-visible"),
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      scrollY: Math.round(window.scrollY),
    };
  });

{
  // ПК 1280×720, логотипи заблоковано (BUG-009), монета №4 з null (BUG-003)
  const { c, p, errors } = await context(devices["Desktop Chrome"], { blockLogos: true });
  await p.goto(BASE);
  await p.locator("main tbody tr").first().waitFor();
  await p.getByRole("button", { name: "Показати більше" }).click();
  await p.waitForTimeout(800);
  out.list = await p.evaluate((id) => {
    const row = document.querySelector(`a[data-coin-id="${id}"]`).closest("tr");
    return {
      rows: document.querySelectorAll("main tbody tr").length,
      nullRowChange: row.cells[3].innerText.trim(),
      alert: Boolean(document.querySelector("[role=alert]")),
      brokenImgs: [...document.querySelectorAll("main img")].filter(
        (i) => i.complete && i.naturalWidth === 0,
      ).length,
      imgs: document.querySelectorAll("main img").length,
      fallbacks: document.querySelectorAll("main [data-logo-fallback]").length,
      firstFallback: document.querySelector("main [data-logo-fallback]")?.textContent,
    };
  }, NULL_ID);

  // Мишею: прокрутити список, відкрити монету, повернутися посиланням і кнопкою «Назад» браузера
  await p.evaluate(() => window.scrollTo(0, 1500));
  await p.waitForTimeout(300);
  const listY = await p.evaluate(() => Math.round(window.scrollY));
  const link = p.locator("main a[data-coin-id]").nth(30);
  const linkName = await link.innerText();
  await link.click();
  await p.getByRole("heading", { level: 1, name: linkName }).waitFor();
  await p.waitForTimeout(500);
  out.mouseToCoin = { listY, ...(await h1State(p)) };
  out.coinLogo = await p.evaluate(() => {
    const f = document.querySelector("main [data-logo-fallback]");
    return {
      img: Boolean(document.querySelector("main img")),
      fallback: f?.textContent,
      size: f && Math.round(f.getBoundingClientRect().width),
    };
  });
  await p.screenshot({
    path: `${SHOTS}/coin-page-mouse-focus.png`,
    clip: { x: 0, y: 0, width: 1280, height: 300 },
  });
  await p.getByRole("link", { name: "← До списку монет" }).click();
  await p.getByRole("heading", { level: 1, name: "Топ-50 монет" }).waitFor();
  await p.waitForTimeout(500);
  out.mouseBackLink = await h1State(p);
  await p.locator("main a[data-coin-id]").nth(30).click();
  await p.waitForTimeout(500);
  await p.goBack();
  await p.getByRole("heading", { level: 1, name: "Топ-50 монет" }).waitFor();
  await p.waitForTimeout(500);
  out.browserBack = await h1State(p);
  await p.screenshot({ path: `${SHOTS}/list-after-back.png` });

  // Клавіатура: Tab до посилання Bitcoin, Enter → фокус на h1 (зчитувач і клавіатура)
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.locator('main a[data-coin-id="bitcoin"]').focus();
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { level: 1, name: "Bitcoin" }).waitFor();
  await p.waitForTimeout(300);
  out.keyboard = await h1State(p);
  await p.keyboard.press("Tab");
  out.keyboardNextTab = await p.evaluate(() =>
    document.activeElement?.textContent?.trim().slice(0, 40),
  );

  // Сторінка монети з null
  await p.goto(BASE + "#/coin/" + NULL_ID);
  await p.getByRole("heading", { level: 1, name: NULL_NAME }).waitFor();
  out.nullCoinPage = await p.evaluate(() => ({
    dash: document.querySelector("main").innerText.includes("—"),
    spoken: [...document.querySelectorAll("main .sr-only")]
      .map((e) => e.textContent)
      .filter((t) => t.includes("немає даних")),
  }));
  out.desktop = { errors, csp: await p.evaluate(() => window.__csp) };
  await c.close();
}
{
  // Телефон 320×640, мобільна емуляція (L-007), логотипи заблоковано
  const { c, p, errors } = await context(
    { ...devices["iPhone SE"], viewport: { width: 320, height: 640 } },
    { blockLogos: true },
  );
  out.mobile = {};
  for (const hash of ["#/", "#/coin/bitcoin", `#/coin/${NULL_ID}`, "#/favorites", "#/abc"]) {
    await p.goto(BASE + hash);
    await p.locator("#main h1").waitFor();
    await p.waitForTimeout(700);
    out.mobile[hash] = await p.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      broken: [...document.querySelectorAll("main img")].filter(
        (i) => i.complete && i.naturalWidth === 0,
      ).length,
    }));
    if (hash === "#/") await p.screenshot({ path: `${SHOTS}/list-320-fallback.png` });
  }
  out.mobile.errors = errors;
  out.mobile.csp = await p.evaluate(() => window.__csp);
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
