import { chromium } from "file:///D:/crypto-radar/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://localhost:4173/crypto-radar/#/coin/solana"); await p.locator("h1").waitFor(); await p.waitForTimeout(1500);
console.log(await p.locator("main").ariaSnapshot().then((s) => s.split("\n").filter((l) => /обран/.test(l)).join("\n")));
await b.close();
