import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const release = "https://github.com/LiuTouo/PaceDock-releases/releases/latest";
const locales = [
  {
    path: "./",
    lang: "zh-Hant",
    done: "未變更任何系統設定",
    empty: "至少勾選一個候選",
    closeRace: "前兩名差異接近",
    closePill: "差異接近",
    solo: "無比較對象",
  },
  {
    path: "en/",
    lang: "en",
    done: "No system settings were changed",
    empty: "at least one candidate",
    closeRace: "close—no preset winner",
    closePill: "close",
    solo: "no comparison",
  },
];
const candidate = (page, id) =>
  page.locator(`input[name="candidate"][value="${id}"]`);
const winner = (page) =>
  page.locator('#winner-picker:not([hidden]) input[name="winner"]');

for (const locale of locales) {
  test.describe(locale.lang, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(locale.path);
    });

    test("readable content, metadata, links, and a functioning language route", async ({
      page,
    }) => {
      await expect(page.locator("html")).toHaveAttribute("lang", locale.lang);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator(".repo-link")).toBeVisible();
      await expect(page.locator(".repo-link")).toHaveAttribute(
        "href",
        "https://github.com/LiuTouo/PaceDock-releases",
      );
      await expect(page.locator("#demo-app")).toBeVisible();
      await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
        "href",
        /https:\/\/liutouo\.github\.io\/PaceDock-releases\//,
      );
      await expect(page.locator("meta[name=description]")).toHaveAttribute(
        "content",
        /PaceDock/,
      );
      expect(
        await page.locator(`a[href="${release}"]`).count(),
      ).toBeGreaterThanOrEqual(4);
      for (const id of ["features", "demo", "download"]) {
        await expect(page.locator(`#${id}`)).toHaveCount(1);
      }
      await expect(page.locator(".flow-strip li")).toHaveCount(4);
      await expect(page.locator(".hero .gauge-row")).toHaveCount(3);
      const brokenAnchors = await page
        .locator('a[href^="#"]')
        .evaluateAll((anchors) =>
          anchors
            .filter((a) => !document.getElementById(a.hash.slice(1)))
            .map((a) => a.hash),
        );
      expect(brokenAnchors).toEqual([]);
      await page.locator(".language-link").click();
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        locale.lang === "en" ? "zh-Hant" : "en",
      );
      await page.reload();
      await expect(page.locator("#demo-app")).toBeVisible();
    });

    test("scroll reveals settle visible", async ({ page }) => {
      await expect(page.locator("html")).toHaveClass(/js/);
      await page.locator("#features").scrollIntoViewIfNeeded();
      const first = page.locator(".feature").first();
      await expect(first).toHaveClass(/in-view/);
      await expect
        .poll(() => first.evaluate((e) => getComputedStyle(e).opacity))
        .toBe("1");
    });

    test("default test ranks three candidates and a close race needs a choice", async ({
      page,
    }) => {
      await page.locator("#test-button").click();
      await expect(page.locator(".rank-card")).toHaveCount(3);
      await expect(page.locator("#ranking-title")).toBeFocused();
      await expect(
        page.locator(".rank-card .pill.warning").first(),
      ).toContainText(locale.closePill);
      await expect(page.locator("#apply-button")).toBeDisabled();
      await expect(page.locator("#demo-status")).toContainText(
        locale.closeRace,
      );
      await winner(page).first().check();
      await expect(page.locator("#apply-button")).toBeEnabled();
      await page.locator("#apply-button").click();
      await expect(page.locator("#demo-result")).toBeVisible();
      await expect(page.locator("#demo-status")).toContainText(locale.done);
      await expect(page.locator("#result-list li")).toHaveCount(2);
      await expect(candidate(page, "core3")).toBeDisabled();
      await expect(page.locator("#test-button")).toBeDisabled();
      await expect(page.locator("#result-title")).toBeFocused();
      await expect(page.locator('[data-step="complete"]')).toHaveAttribute(
        "aria-current",
        "step",
      );
    });

    test("empty selection blocks the test with a localized explanation", async ({
      page,
    }) => {
      await candidate(page, "core1").uncheck();
      await candidate(page, "core3").uncheck();
      await candidate(page, "core5").uncheck();
      await expect(page.locator("#test-button")).toBeDisabled();
      await expect(page.locator("#demo-status")).toContainText(locale.empty);
      await expect(page.locator("#ranking-panel")).toBeHidden();
    });

    test("decisive ranking applies directly and a solo candidate is labeled", async ({
      page,
    }) => {
      await candidate(page, "core5").uncheck();
      await page.locator("#test-button").click();
      await expect(page.locator(".rank-card")).toHaveCount(2);
      await expect(page.locator("#winner-picker")).toBeHidden();
      await expect(page.locator("#apply-button")).toBeEnabled();
      await page.locator("#apply-button").click();
      await expect(page.locator("#demo-result")).toBeVisible();

      await page.locator("#reset-demo").click();
      await candidate(page, "core3").uncheck();
      await candidate(page, "core5").uncheck();
      await page.locator("#test-button").click();
      await expect(page.locator(".rank-card")).toHaveCount(1);
      await expect(page.locator(".rank-card")).toContainText(locale.solo);
      await expect(page.locator("#winner-picker")).toBeHidden();
      await expect(page.locator("#apply-button")).toBeEnabled();
      await page.locator("#apply-button").click();
      await expect(page.locator("#result-list li")).toHaveCount(2);
    });

    test("selection changes invalidate rankings and reset restores the initial state", async ({
      page,
    }) => {
      await page.locator("#test-button").click();
      await winner(page).first().check();
      await candidate(page, "core5").uncheck();
      await expect(page.locator("#ranking-panel")).toBeHidden();
      await expect(page.locator(".rank-card")).toHaveCount(0);
      await expect(page.locator("#winner-picker")).toBeHidden();
      await page.locator("#test-button").click();
      await expect(page.locator(".rank-card")).toHaveCount(2);
      await expect(page.locator("#winner-picker")).toBeHidden();
      await page.locator("#apply-button").click();
      await page.locator("#reset-demo").click();
      for (const id of ["core1", "core3", "core5"]) {
        await expect(candidate(page, id)).toBeChecked();
        await expect(candidate(page, id)).toBeEnabled();
      }
      await expect(page.locator("#demo-result")).toBeHidden();
      await expect(page.locator("#ranking-panel")).toBeHidden();
      await expect(page.locator("#result-list li")).toHaveCount(0);
      await expect(candidate(page, "core1")).toBeFocused();
    });

    test("the solo workflow is operable by keyboard", async ({ page }) => {
      await page.locator("#reset-demo").focus();
      await page.keyboard.press("Tab");
      await expect(candidate(page, "core1")).toBeFocused();
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(candidate(page, "core5")).toBeFocused();
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await expect(page.locator("#test-button")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#ranking-title")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("#apply-button")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#demo-result")).toBeVisible();
    });

    test("reduced motion, FAQ, and focus indicators", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await page
          .locator("html")
          .evaluate((e) => getComputedStyle(e).scrollBehavior),
      ).toBe("auto");
      await page.locator(".faq-list summary").first().click();
      await expect(page.locator(".faq-list details").first()).toHaveAttribute(
        "open",
        "",
      );
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      expect(
        await focused.evaluate((e) =>
          parseFloat(getComputedStyle(e).outlineWidth),
        ),
      ).toBeGreaterThanOrEqual(2);
    });

    for (const width of [360, 768, 1024, 1440]) {
      test(`layout at ${width}px remains readable during a close race`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath("landing.png"),
          fullPage: false,
          animations: "disabled",
        });
        await page.locator("#test-button").click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(winner(page).first()).toBeVisible();
        await page.locator("#demo").screenshot({
          path: testInfo.outputPath("demo.png"),
          animations: "disabled",
        });
        await winner(page).first().check();
        await page.locator("#apply-button").click();
        await expect(page.locator("#demo-result")).toBeVisible();
      });
    }
  });

  test(`${locale.lang}: static content and downloads work without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(new URL(locale.path, baseURL).href);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("noscript")).toBeVisible();
    await expect(page.locator("#demo-app")).toBeHidden();
    await expect(page.locator(".scene-panel")).toHaveCount(3);
    for (const panel of await page.locator(".scene-panel").all()) {
      await expect(panel).toBeVisible();
      expect(await panel.evaluate((el) => getComputedStyle(el).opacity)).toBe(
        "1",
      );
    }
    await expect(page.locator(`a[href="${release}"]`).first()).toBeVisible();
    await page.locator(".language-link").click();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale.lang === "en" ? "zh-Hant" : "en",
    );
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    await context.close();
  });
}

test("only local static resources load; no console or page errors", async ({
  page,
  baseURL,
}) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => requests.push(request));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()}: ${response.url()}`);
  });
  for (const locale of locales) {
    await page.goto(locale.path);
    await expect(page.locator("#demo-app")).toBeVisible();
    await page.locator("#test-button").click();
    await winner(page).first().check();
    await page.locator("#apply-button").click();
    await expect(page.locator("#demo-result")).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(
    requests.every((r) => new URL(r.url()).origin === new URL(baseURL).origin),
  ).toBe(true);
  expect(
    requests.every(
      (r) => !["fetch", "xhr", "websocket"].includes(r.resourceType()),
    ),
  ).toBe(true);
});

test("page copy never leaks local paths, credentials, or private internals", async ({
  page,
}) => {
  for (const locale of locales) {
    await page.goto(locale.path);
    expect(await page.locator("body").textContent()).not.toMatch(
      /Users[\\/]|Downloads[\\/]|C:\\|password|api[_-]?key|secret|token|release-patch|deepsec|LiuTouo\/PaceDock\.git|Cargo\.toml|tauri\.conf/i,
    );
  }
});

test("preview server serves only site files and rejects invalid requests", async ({
  request,
}) => {
  test.skip(Boolean(process.env.SITE_URL), "Local preview server only");
  for (const path of [
    "/package.json",
    "/PaceDock-releases/../package.json",
    "/PaceDock-releases/%2e%2e%2fpackage.json",
    "/PaceDock-releases/%2e%2e%5cpackage.json",
    "/PaceDock-releases/missing.js",
    "/PaceDock-releases/assets/site.exe",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.get("/PaceDock-releases/%zz")).status()).toBe(400);
  expect((await request.post("./")).status()).toBe(405);
  for (const [asset, type] of [
    ["assets/site.css", "text/css; charset=utf-8"],
    ["assets/site.js", "text/javascript; charset=utf-8"],
    ["assets/icon.png", "image/png"],
    ["assets/favicon.png", "image/png"],
  ]) {
    const response = await request.get(asset);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe(type);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect((await response.body()).length).toBeGreaterThan(0);
  }
  expect(
    (
      await request.get("/PaceDock-releases/%2e%2e%2fpackage-lock.json")
    ).status(),
  ).toBe(404);
  const head = await request.head("./");
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe("");
});

test("serve.mjs rejects invalid PORT values before binding", () => {
  for (const port of ["", "0", "-1", "65536", "1.5", "not-a-port"]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../scripts/serve.mjs", import.meta.url))],
      {
        env: { ...process.env, PORT: port },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PORT must be an integer from 1 to 65535");
  }
});
