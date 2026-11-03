import { chromium } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch(); const p = await b.newPage();
await p.route("https://api.coingecko.com/**", () => {});
await p.goto("http://localhost:4173/crypto-radar/"); await p.waitForTimeout(800);
console.log(JSON.stringify({ busyAnywhere: await p.locator("[aria-busy=true]").count(), insideMain: await p.locator("main [aria-busy=true]").count(), skeletonText: (await p.locator("[role=status]").allInnerTexts()).filter(Boolean) }));
await b.close();
