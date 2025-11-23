import { test, expect } from "@playwright/test";

test.describe("Language Selection", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("should show language selection modal for first-time users", async ({ page }) => {
    // Reload after clearing storage
    await page.reload({ waitUntil: "networkidle" });

    // Wait for the language modal to appear
    const modal = page.locator("text=Welcome");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Should show both language options
    await expect(page.locator("text=English")).toBeVisible();
    await expect(page.locator("text=فارسی")).toBeVisible();
  });

  test("should set English as language and apply English translation", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" });

    // Wait for modal
    await page.waitForSelector("text=Welcome", { timeout: 10000 });

    // Click English
    await page.locator("button:has-text('English')").click();

    // Modal should close
    await expect(page.locator("text=Welcome")).not.toBeVisible();

    // Wait for content to load
    await page.waitForSelector("header", { timeout: 10000 });

    // Verify localStorage has English setting
    const settings = await page.evaluate(() => localStorage.getItem("luminaSettings"));
    expect(settings).toContain('"userLanguage":"en"');
    expect(settings).toContain('"translationIds":["en.sahih"]');
  });

  test("should set Persian as language and apply Persian translation", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" });

    // Wait for modal
    await page.waitForSelector("text=Welcome", { timeout: 10000 });

    // Click Persian (فارسی)
    await page.locator('button:has-text("فارسی")').click();

    // Modal should close
    await expect(page.locator("text=Welcome")).not.toBeVisible();

    // Wait for content to load
    await page.waitForSelector("header", { timeout: 10000 });

    // Verify localStorage has Persian setting
    const settings = await page.evaluate(() => localStorage.getItem("luminaSettings"));
    expect(settings).toContain('"userLanguage":"fa"');
    expect(settings).toContain('"translationIds":["fa.makarem"]');
  });

  test("should not show language modal for returning users", async ({ page }) => {
    // Set up existing settings
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

    // Wait for header to appear
    await page.waitForSelector("header", { timeout: 10000 });

    // Language modal should NOT appear
    await expect(page.locator("text=Welcome")).not.toBeVisible();
  });

  test("should allow changing language in settings", async ({ page }) => {
    // Set up existing settings with English
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
    await page.waitForSelector("header", { timeout: 10000 });

    // Open settings
    const menuButton = page.getByTitle("Menu");
    await menuButton.click();
    await page.waitForTimeout(500);

    // Click on Language section to expand it
    await page.locator("text=Language").click();
    await page.waitForTimeout(300);

    // Both language options should be visible
    await expect(page.locator("button:has-text('English')")).toBeVisible();
    await expect(page.locator('button:has-text("فارسی")')).toBeVisible();

    // English should be highlighted (has emerald styling)
    const englishButton = page.locator("button:has-text('English')");
    await expect(englishButton).toHaveClass(/emerald/);

    // Click Persian to change language
    await page.locator('button:has-text("فارسی")').click();
    await page.waitForTimeout(300);

    // Verify localStorage has Persian setting
    const settings = await page.evaluate(() => localStorage.getItem("luminaSettings"));
    expect(settings).toContain('"userLanguage":"fa"');
  });
});
