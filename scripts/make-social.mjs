// One-off: render docs/assets/social.png (1200x630) from the README banner.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";

const root = fileURLToPath(new URL("..", import.meta.url));
const svg = await readFile(`${root}assets/readme/banner-zh.svg`, "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(
  `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;background:#11111b;display:grid;place-items:center}
    svg{width:1080px;height:auto;display:block}
  </style>${svg}`,
);
await page.waitForTimeout(200);
const png = await page.screenshot({ type: "png" });
await browser.close();
await writeFile(`${root}docs/assets/social.png`, png);
console.log(`social.png ${png.length} bytes`);
