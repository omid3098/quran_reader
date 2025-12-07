import { test, expect } from "@playwright/test";

test.describe("Header visibility on scroll", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "luminaSettings",
        JSON.stringify({
          fontSize: 32,
          translationIds: ["en.sahih"],
          reciterId: "alafasy",
          scriptType: "simple",
          showTranslation: true,
          autoPlay: true,
          theme: "dark",
          userLanguage: "en",
        })
      );
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("header", { timeout: 30000 });
  });

  test("hides on scroll down and shows on scroll up", async ({ page }) => {
    const header = page.locator("header");
    const main = page.locator("main");

    await page.evaluate(() => {
      const container = document.querySelector("main");
      if (!container) return;
      container.scrollTop = 0;
      container.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await expect(main).toBeVisible();
    await main.evaluate((el) => {
      el.scrollTop = 800;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await expect(header).toBeVisible();
    await expect
      .poll(async () => (await header.getAttribute("class")) || "")
      .toContain("-translate-y-full");

    await main.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await expect
      .poll(async () => (await header.getAttribute("class")) || "")
      .not.toContain("-translate-y-full");
  });
});
