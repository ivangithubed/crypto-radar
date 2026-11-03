// Одноразовий ручний прогін етапу 8.a: керовані стани CoinGecko через route (не входить у проєкт).
import { chromium, devices } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:4173/crypto-radar/";
const FIX = "D:/crypto-radar/src/test/fixtures/";
const MARKETS = JSON.parse(readFileSync(FIX + "markets-top50.json", "utf8"));
const STABLE = JSON.parse(readFileSync(FIX + "stablecoins.json", "utf8"));
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const only = process.argv[2];

const clone = () => JSON.parse(JSON.stringify(MARKETS));
const fresh = (list, ageMs = 60_000, now = Date.now()) =>
  list.map((c) => ({ ...c, last_updated: new Date(now - ageMs).toISOString() }));

/** handler(url) → {status, json, cors} | 'abort' | 'pending' */
async function setup(context, state) {
  state.top = 0;
  state.stable = 0;
  await context.route("https://api.coingecko.com/**", async (route) => {
    const url = new URL(route.request().url());
    const isStable = url.searchParams.get("category") === "stablecoins";
    if (isStable) state.stable += 1;
    else state.top += 1;
    const r = isStable ? (state.stableHandler?.() ?? { json: STABLE }) : state.handler();
    if (r === "pending") return;
    if (r === "abort") return route.abort("failed");
    const headers = r.cors === false ? {} : { "access-control-allow-origin": "*" };
    await route.fulfill({ status: r.status ?? 200, json: r.json ?? {}, headers });
  });
  await context.route("https://coin-images.coingecko.com/**", (route) =>
    route.fulfill({ body: PIXEL, contentType: "image/png" }),
  );
}

async function newPage(browser, state, opts = {}) {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], ...opts.ctx });
  await setup(context, state);
  if (opts.favorites) {
    await context.addInitScript((f) => {
      if (!sessionStorage.getItem("qa-init")) {
        localStorage.setItem("crypto-radar:favorites", JSON.stringify(f));
        sessionStorage.setItem("qa-init", "1");
      }
    }, opts.favorites);
  }
  const page = await context.newPage();
  state.console = [];
  state.csp = 0;
  page.on("console", (m) => m.type() === "error" && state.console.push(m.text().slice(0, 120)));
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", () => (window.__csp = (window.__csp ?? 0) + 1)),
  );
  return { context, page };
}

const mainText = (page) => page.locator("main").innerText();
const hasPrice = async (page) => /\$\d/.test(await mainText(page));
const alertText = async (page) => (await page.locator("[role=alert]").allInnerTexts()).join(" / ");
const rowsOf = (page) => page.locator("main tbody tr");

const results = {};
const scenarios = {};

scenarios.format = async (browser) => {
  const s = {};
  const list = clone();
  Object.assign(list[0], { current_price: 67250.1, market_cap: 1.32e12, price_change_percentage_7d_in_currency: 4.2 });
  const changes = [4.2, 0.06, 0.05, 0.04, 0, -0.04, -0.05, -0.06, -3.7];
  changes.forEach((v, i) => (list[i + 1].price_change_percentage_7d_in_currency = v));
  s.handler = () => ({ json: fresh(list) });
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE);
  await rowsOf(page).first().waitFor();
  const btc = await rowsOf(page).filter({ hasText: "Bitcoin" }).first().innerText();
  const byId = {};
  for (let i = 1; i <= 9; i += 1) {
    const name = list[i].name;
    const row = page.locator(`main tbody tr:has(a[data-coin-id="${list[i].id}"])`);
    if (!(await row.count())) await page.getByRole("button", { name: "Показати більше" }).click();
    byId[`${changes[i - 1]}`] = (await row.innerText()).replace(/\s+/g, " ").replace(/^.*?\$[\d\s,.]+/, "").replace(/\$.*$/, "").trim() + ` (${name})`;
  }
  const out = {
    btcRow: btc.replace(/\s+/g, " "),
    changes: byId,
    consoleErrors: state(s).console,
    csp: await page.evaluate(() => window.__csp ?? 0),
    requests: { top: s.top, stable: s.stable },
  };
  await context.close();
  return out;
};
const state = (s) => s;

scenarios.top51 = async (browser) => {
  const s = {};
  const list = clone();
  list.push({ ...list[49], id: "moneta-51", name: "Монета-51", symbol: "m51", market_cap_rank: 51, market_cap: 1 });
  s.handler = () => ({ json: fresh(list) });
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  const out = { alert: await alertText(page) };
  if (!out.alert) {
    await page.getByRole("button", { name: "Показати більше" }).click();
    out.rows = await rowsOf(page).count();
    out.has51 = (await mainText(page)).includes("Монета-51");
    out.rank50 = (await mainText(page)).includes(list[49].name);
  }
  await context.close();
  return out;
};

scenarios.nullChange = async (browser) => {
  const s = {};
  const list = clone();
  list[40].price_change_percentage_7d_in_currency = null; // новий лістинг: CoinGecko дає null
  s.handler = () => ({ json: fresh(list) });
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  const out = { alert: await alertText(page), prices: await hasPrice(page), coin: list[40].name };
  await context.close();
  return out;
};

scenarios.stale = async (browser) => {
  const out = {};
  for (const [label, ageMs] of [["4:59", 299_000], ["5:00", 300_000], ["5:01", 301_000]]) {
    const s = {};
    const T = Date.parse("2026-11-03T03:00:00Z");
    s.handler = () => ({ json: fresh(clone(), ageMs, T) });
    const { context, page } = await newPage(browser, s);
    await page.clock.setFixedTime(T);
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    out[label] = { alert: await alertText(page), prices: await hasPrice(page), rows: await rowsOf(page).count() };
    await context.close();
  }
  return out;
};

scenarios.staleWhileOpen = async (browser) => {
  const s = {};
  const T = Date.parse("2026-11-03T03:00:00Z");
  let fail = false;
  s.handler = () => (fail ? { status: 500 } : { json: fresh(clone(), 60_000, T) });
  const { context, page } = await newPage(browser, s);
  await page.clock.install({ time: T });
  await page.goto(BASE);
  await rowsOf(page).first().waitFor();
  const before = { prices: await hasPrice(page), top: s.top };
  fail = true;
  const marks = {};
  for (const m of [1, 2, 3, 4, 5]) {
    await page.clock.runFor(60_000);
    await page.waitForTimeout(300);
    marks[`+${m}min`] = { alert: await alertText(page), prices: await hasPrice(page) };
  }
  const out = { before, marks, topRequests: s.top };
  await context.close();
  return out;
};

scenarios.errors = async (browser) => {
  const out = {};
  const cases = {
    "429+CORS": () => ({ status: 429, json: {} }),
    "429 без CORS (як CoinGecko)": () => ({ status: 429, json: {}, cors: false }),
    "500+CORS": () => ({ status: 500, json: {} }),
    "мережа (abort), онлайн": () => "abort",
    "некоректна форма": () => ({ json: [{ id: "x" }] }),
  };
  for (const [name, handler] of Object.entries(cases)) {
    const s = { handler };
    const { context, page } = await newPage(browser, s);
    await page.goto(BASE);
    await page.waitForTimeout(8000);
    out[name] = {
      alert: await alertText(page),
      prices: await hasPrice(page),
      sortPanel: await page.getByLabel("Сортування").count(),
      disclaimer: (await page.locator("footer").innerText()).includes("Інформація не є інвестиційною порадою"),
      topRequests: s.top,
      onLine: await page.evaluate(() => navigator.onLine),
    };
    await context.close();
  }
  {
    const s = { handler: () => "abort" };
    const { context, page } = await newPage(browser, s);
    await context.setOffline(true);
    await page.goto(BASE).catch(() => {});
    out["офлайн"] = "goto без мережі неможливий для локального preview — див. примітку";
    await context.close();
  }
  return out;
};

scenarios.retryStillDown = async (browser) => {
  const s = { handler: () => ({ status: 429, json: {} }) };
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE);
  await page.locator("[role=alert]").waitFor();
  const btn = page.getByRole("button", { name: "Спробувати ще раз" });
  await btn.click();
  await page.waitForTimeout(1500);
  const out = {
    alert: await alertText(page),
    status: (await page.locator("[role=status]").allInnerTexts()).filter(Boolean),
    focusOnRetry: await page.evaluate(() => document.activeElement?.textContent),
    topRequests: s.top,
  };
  await context.close();
  return out;
};

scenarios.loading = async (browser) => {
  const s = { handler: () => "pending" };
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const out = {
    busy: await page.locator("main[aria-busy=true]").count(),
    status: (await page.locator("[role=status]").allInnerTexts()).filter(Boolean),
    prices: await hasPrice(page),
    emptyScreen: (await mainText(page)).trim().length === 0,
  };
  await context.close();
  return out;
};

scenarios.chartEmpty = async (browser) => {
  const s = {};
  const list = clone();
  list[0].sparkline_in_7d.price = [];
  s.handler = () => ({ json: fresh(list) });
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE + "#/coin/bitcoin");
  await page.waitForTimeout(1500);
  const out = {
    h1: await page.locator("h1").innerText(),
    alert: await alertText(page),
    svg: await page.locator("main svg").count(),
    prices: await hasPrice(page),
  };
  await page.goto(BASE + "#/coin/ethereum");
  await page.waitForTimeout(800);
  out.ethereumOk = (await page.locator("main svg").count()) > 0;
  await context.close();
  return out;
};

scenarios.favorites = async (browser) => {
  const out = {};
  // AC-8.6: обрані під час помилки й після повтору
  {
    let down = true;
    const s = { handler: () => (down ? { status: 429, json: {} } : { json: fresh(clone()) }) };
    const { context, page } = await newPage(browser, s, { favorites: ["bitcoin", "ethereum"] });
    await page.goto(BASE + "#/favorites");
    await page.locator("[role=alert]").waitFor();
    const during = { alert: await alertText(page), text: await mainText(page), prices: await hasPrice(page) };
    down = false;
    await page.getByRole("button", { name: "Спробувати ще раз" }).click();
    await page.locator("main ol > li, main tbody tr").first().waitFor();
    out["AC-8.6"] = { during: { ...during, text: during.text.replace(/\s+/g, " ").slice(0, 160) }, after: (await page.locator("main ol > li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").slice(0, 60)) };
    await context.close();
  }
  // AC-6.4 / AC-6.6: вибула монета, потім повернулась на місце 50; AC-4.3 сторінка місця 50
  {
    const list = clone();
    const dropped = { ...list[49], id: "moneta-x", name: "Монета-X", symbol: "mx" };
    let back = false;
    const s = { handler: () => {
      const l = clone();
      if (back) l[49] = { ...dropped, market_cap_rank: 50 };
      return { json: fresh(l) };
    } };
    const { context, page } = await newPage(browser, s, { favorites: ["moneta-x", "solana", "bitcoin"] });
    await page.goto(BASE + "#/favorites");
    await page.locator("main ol > li").first().waitFor();
    out["AC-6.4/6.7"] = (await page.locator("main ol > li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").slice(0, 70));
    back = true;
    await page.reload();
    await page.locator("main ol > li").first().waitFor();
    out["AC-6.6"] = (await page.locator("main ol > li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").slice(0, 70));
    await page.goto(BASE + "#/coin/moneta-x");
    await page.waitForTimeout(800);
    out["AC-4.3 місце 50"] = { h1: await page.locator("h1").innerText(), chart: await page.locator("main svg").count(), prices: await hasPrice(page) };
    // AC-6.1: обрані між візитами (новий контекст зі збереженим сховищем, годинник +7 днів)
    const storage = await context.storageState();
    await context.close();
    const s2 = { handler: () => ({ json: fresh(clone(), 60_000, Date.now() + 7 * 86400_000) }) };
    const c2 = await browser.newContext({ ...devices["Desktop Chrome"], storageState: storage });
    await setup(c2, s2);
    const p2 = await c2.newPage();
    await p2.clock.setFixedTime(Date.now() + 7 * 86400_000);
    await p2.goto(BASE + "#/favorites");
    await p2.locator("main ol > li").first().waitFor();
    out["AC-6.1 (+7 днів)"] = (await p2.locator("main ol > li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").slice(0, 50));
    await c2.close();
    // AC-6.2: інший пристрій (чистий контекст)
    const s3 = { handler: () => ({ json: fresh(clone()) }) };
    const { context: c3, page: p3 } = await newPage(browser, s3);
    await p3.goto(BASE + "#/favorites");
    await p3.waitForTimeout(1000);
    out["AC-6.2"] = (await mainText(p3)).replace(/\s+/g, " ").slice(0, 60);
    await c3.close();
  }
  return out;
};

scenarios.sortFixture = async (browser) => {
  const s = {};
  const list = clone();
  list[47].price_change_percentage_7d_in_currency = 55; // місце 48
  s.handler = () => ({ json: fresh(list) });
  const { context, page } = await newPage(browser, s);
  await page.goto(BASE);
  await rowsOf(page).first().waitFor();
  await page.getByRole("button", { name: "Показати більше" }).click();
  await page.getByLabel("Сортування").selectOption({ label: "Зміна за 7 днів: найбільше зростання" });
  const first = await rowsOf(page).first().innerText();
  const out = { "AC-2.3": { first: first.replace(/\s+/g, " ").slice(0, 50), rows: await rowsOf(page).count() } };
  await page.getByRole("button", { name: "Показати більше" }).click();
  const names = await page.locator("main tbody tr a[data-coin-id]").evaluateAll((as) => as.map((a) => a.dataset.coinId));
  const order = ["tether", "usd-coin", "global-dollar", "blackrock-usd-institutional-digital-liquidity-fund", "usds", "bitcoin-cash"]
    .map((id) => [id, names.indexOf(id) + 1]);
  out["AC-2.4 (позиції в сортуванні «зростання»)"] = Object.fromEntries(order);
  out.tetherAboveUsdc = names.indexOf("tether") < names.indexOf("usd-coin");
  await context.close();
  return out;
};

scenarios.nfr3 = async (browser) => {
  const s = { handler: () => ({ json: fresh(clone()) }) };
  const { context, page } = await newPage(browser, s);
  await page.clock.install();
  await page.goto(BASE);
  await rowsOf(page).first().waitFor();
  const start = { top: s.top, stable: s.stable };
  await page.clock.runFor(5 * 60_000);
  await page.waitForTimeout(500);
  const hosts = new Set();
  page.context().on("request", (r) => hosts.add(new URL(r.url()).host));
  await page.goto(BASE + "#/coin/bitcoin");
  await page.goto(BASE + "#/favorites");
  await page.waitForTimeout(500);
  const out = {
    onOpen: start,
    after5min: { top: s.top, stable: s.stable },
    cookies: (await context.cookies()).length,
    localStorageKeys: await page.evaluate(() => Object.keys(localStorage)),
    iframes: await page.locator("iframe").count(),
    consoleErrors: s.console,
    csp: await page.evaluate(() => window.__csp ?? 0),
  };
  await context.close();
  return out;
};

const browser = await chromium.launch();
for (const [name, fn] of Object.entries(scenarios)) {
  if (only && only !== name) continue;
  try {
    results[name] = await fn(browser);
  } catch (e) {
    results[name] = { ERROR: String(e).slice(0, 300) };
  }
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
