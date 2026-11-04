import { chromium, devices } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:4173/crypto-radar/";
const M = JSON.parse(readFileSync("D:/crypto-radar/src/test/fixtures/markets-top50.json", "utf8"));
const ST = JSON.parse(readFileSync("D:/crypto-radar/src/test/fixtures/stablecoins.json", "utf8"));
const fresh = () => M.map((c) => ({ ...c, last_updated: new Date(Date.now() - 60000).toISOString() }));
const b = await chromium.launch();
const out = {};
for (const pause of [0, 300]) {
  const c = await b.newContext({ ...devices["Desktop Chrome"] });
  await c.route("https://api.coingecko.com/**", (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.get("category") ? ST : fresh(), headers: { "access-control-allow-origin": "*" } }),
  );
  await c.route("https://coin-images.coingecko.com/**", (r) => r.abort());
  const p = await c.newPage();
  await p.goto(BASE);
  await p.locator("main tbody tr").first().waitFor();
  await p.getByLabel("Сортування").selectOption("cap");
  await p.getByRole("button", { name: "Показати більше" }).click();
  await p.waitForTimeout(300);
  const yAfterMore = await p.evaluate(() => Math.round(scrollY));
  const link = p.getByRole("link", { name: "Bitcoin", exact: true });
  if (pause) await link.scrollIntoViewIfNeeded();
  if (pause) await p.waitForTimeout(pause);
  const yBeforeClick = await p.evaluate(() => Math.round(scrollY));
  await link.click();
  await p.getByRole("heading", { level: 1, name: "Bitcoin" }).waitFor();
  await p.waitForTimeout(300);
  await p.getByRole("link", { name: /До списку монет/ }).click();
  await p.locator("main tbody tr").first().waitFor();
  await p.waitForTimeout(500);
  out[`pause${pause}`] = {
    yAfterMore,
    yBeforeClick,
    yAfterBack: await p.evaluate(() => Math.round(scrollY)),
    focus: await p.evaluate(() => `${document.activeElement.tagName}:${document.activeElement.textContent.trim().slice(0, 20)}`),
  };
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
