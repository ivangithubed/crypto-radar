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

/** Фокус після повернення до списку (TD-023): посилання монети, з якої повернулись, без прокрутки до нього. */
const backState = (p, coinId) =>
  p.evaluate((id) => {
    const a = document.activeElement;
    const s = getComputedStyle(a);
    const r = a.getBoundingClientRect();
    return {
      focusedCoin: a?.getAttribute("data-coin-id") ?? a?.tagName,
      expectedCoin: id,
      focusVisible: a.matches(":focus-visible"),
      outlineStyle: s.outlineStyle,
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      scrollY: Math.round(window.scrollY),
    };
  }, coinId);

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
  const linkId = await link.getAttribute("data-coin-id");
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
  out.mouseBackLink = await backState(p, linkId);
  await p.locator("main a[data-coin-id]").nth(30).click();
  await p.waitForTimeout(500);
  await p.goBack();
  await p.getByRole("heading", { level: 1, name: "Топ-50 монет" }).waitFor();
  await p.waitForTimeout(500);
  out.browserBack = await backState(p, linkId);
  await p.screenshot({ path: `${SHOTS}/list-after-back.png` });

  // Клавіатура: Tab до посилання Bitcoin, Enter → фокус на h1 (зчитувач і клавіатура)
  // Пауза: подія scroll приходить у наступному кадрі, без неї список запам'ятав би стару позицію.
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);
  await p.locator('main a[data-coin-id="bitcoin"]').focus();
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { level: 1, name: "Bitcoin" }).waitFor();
  await p.waitForTimeout(300);
  out.keyboard = await h1State(p);
  await p.keyboard.press("Tab");
  out.keyboardNextTab = await p.evaluate(() =>
    document.activeElement?.textContent?.trim().slice(0, 40),
  );
  // Клавіатура назад: Enter на «← До списку монет» → фокус на посиланні Bitcoin з рамкою, наступний Tab — його ☆
  await p.getByRole("link", { name: "← До списку монет" }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("heading", { level: 1, name: "Топ-50 монет" }).waitFor();
  await p.waitForTimeout(500);
  out.keyboardBack = await backState(p, "bitcoin");
  await p.keyboard.press("Tab");
  out.keyboardBackNextTab = await p.evaluate(() =>
    document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent,
  );

  // TD-025: 50 обраних → остання монета → «Назад»: її картка нижче екрана, тож фокус на h1 «Обрані»
  await p.evaluate((ids) => localStorage.setItem("crypto-radar:favorites", JSON.stringify(ids)), M.map((c) => c.id));
  await p.goto(BASE + "#/favorites");
  await p.getByRole("heading", { level: 1, name: "Обрані" }).waitFor();
  await p.locator("main a[href^='#/coin/']").last().click();
  await p.waitForTimeout(500);
  await p.goBack();
  await p.getByRole("heading", { level: 1, name: "Обрані" }).waitFor();
  await p.waitForTimeout(500);
  out.favoritesBack = await p.evaluate(() => ({
    active: document.activeElement?.tagName,
    text: document.activeElement?.textContent?.trim().slice(0, 30),
    scrollY: Math.round(window.scrollY),
  }));
  await p.evaluate(() => localStorage.removeItem("crypto-radar:favorites"));

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

// Очікування кроку 6 скіла verify: кожна розбіжність — рядок FAIL і код виходу 1.
const near = (a, b) => Math.abs(a - b) <= 2;
const checks = [
  ["list.rows = 50", out.list.rows === 50],
  ["list.alert = false", out.list.alert === false],
  ["list.nullRowChange починається з «—»", out.list.nullRowChange.startsWith("—")],
  ["list.brokenImgs = 0", out.list.brokenImgs === 0],
  ["list.fallbacks = 50", out.list.fallbacks === 50],
  ["coinLogo: без img, 40 px", out.coinLogo.img === false && out.coinLogo.size === 40],
  ["mouseToCoin: фокус h1 без рамки, scrollY 0", out.mouseToCoin.focused && out.mouseToCoin.outlineStyle === "none" && out.mouseToCoin.scrollY === 0],
  ...["mouseBackLink", "browserBack"].map((k) => [
    `${k}: фокус на посиланні монети без рамки, на екрані, scrollY = listY`,
    out[k].focusedCoin === out[k].expectedCoin && !out[k].focusVisible && out[k].outlineStyle === "none" && out[k].inViewport && near(out[k].scrollY, out.mouseToCoin.listY),
  ]),
  ["keyboard: h1 з рамкою solid 2px", out.keyboard.focused && out.keyboard.focusVisible && out.keyboard.outlineStyle === "solid" && out.keyboard.outlineWidth === "2px"],
  ["keyboardBack: посилання bitcoin з рамкою, на екрані, scrollY 0", out.keyboardBack.focusedCoin === "bitcoin" && out.keyboardBack.focusVisible && out.keyboardBack.outlineStyle === "solid" && out.keyboardBack.inViewport && out.keyboardBack.scrollY === 0],
  ["keyboardBackNextTab = «Додати в обрані: Bitcoin»", out.keyboardBackNextTab === "Додати в обрані: Bitcoin"],
  ["favoritesBack: фокус на h1 «Обрані», scrollY 0", out.favoritesBack.active === "H1" && out.favoritesBack.text === "Обрані" && out.favoritesBack.scrollY === 0],
  ["nullCoinPage: «—» і «немає даних»", out.nullCoinPage.dash && out.nullCoinPage.spoken.some((t) => t.includes("немає даних"))],
  ["desktop: консоль 0, CSP 0", out.desktop.errors.length === 0 && out.desktop.csp === 0],
  ["mobile: консоль 0, CSP 0", out.mobile.errors.length === 0 && out.mobile.csp === 0],
  ...Object.entries(out.mobile)
    .filter(([k]) => k.startsWith("#"))
    .map(([k, v]) => [`mobile ${k}: overflow 0, broken 0`, v.overflow === 0 && v.broken === 0]),
];
for (const [name, ok] of checks) console.log(`${ok ? "OK  " : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok).length;
console.log(`CHECKS ${checks.length - failed}/${checks.length}`);
process.exit(failed ? 1 : 0);
