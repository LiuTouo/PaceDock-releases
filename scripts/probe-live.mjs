// One-off: verify effects are live on the published site.
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://liutouo.github.io/PaceDock-releases/");
await page.waitForTimeout(1000);
const htmlClass = await page.evaluate(() => document.documentElement.className);
const h1 = await page.evaluate(() => getComputedStyle(document.querySelector(".hero h1")).animationName);
const reveal = await page.evaluate(() => getComputedStyle(document.querySelector(".feature")).animationName);
const scan = await page.evaluate(() => getComputedStyle(document.querySelector(".hero .gauge-panel"), "::after").animationName);
await page.mouse.move(720, 400);
await page.mouse.wheel(0, 1200);
const s = [];
for (let i = 0; i < 10; i++) { s.push(await page.evaluate(() => Math.round(scrollY))); await page.waitForTimeout(50); }
console.log("html:", htmlClass);
console.log("h1:", h1, "| reveal:", reveal, "| scan:", scan);
console.log("live wheel easing:", s.join(" → "));
await browser.close();
