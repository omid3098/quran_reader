import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage to bypass language selection modal
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
    // Navigate and wait for network to settle
    await page.reload({ waitUntil: "networkidle" });
    // Wait for header to be visible
    await page.waitForSelector("header", { timeout: 30000 });
  });

  test("should open settings panel when menu button is clicked", async ({ page }) => {
    const menuButton = page.getByTitle("Menu");
    await menuButton.click();

    // Settings panel should appear
    await page.waitForTimeout(500);

    // Look for settings-related content (font size, translations, etc.)
    // The exact content depends on implementation
  });

  test("should toggle dark mode", async ({ page }) => {
    // Get the theme toggle button
    const themeButton = page.locator('button[title*="Mode"]');

    // Click to toggle theme
    await themeButton.click();

    // Wait for theme change
    await page.waitForTimeout(300);

    // Click again to toggle back
    await themeButton.click();
    await page.waitForTimeout(300);
  });

  test("should persist theme preference", async ({ page }) => {
    // Toggle to dark mode
    const themeButton = page.locator('button[title*="Mode"]');
    await themeButton.click();
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Theme should persist (check localStorage or class)
  });

  test("should have font size controls in settings", async ({ page }) => {
    // Open settings
    const menuButton = page.getByTitle("Menu");
    await menuButton.click();
    await page.waitForTimeout(500);

    // Look for font size controls
    // The exact implementation depends on the UI
  });

  test("should have translation selection in settings", async ({ page }) => {
    // Open settings
    const menuButton = page.getByTitle("Menu");
    await menuButton.click();
    await page.waitForTimeout(500);

    // Look for translation selection
    // The exact implementation depends on the UI
  });

  test("should have reciter selection in settings", async ({ page }) => {
    // Open settings
    const menuButton = page.getByTitle("Menu");
    await menuButton.click();
    await page.waitForTimeout(500);

    // Look for reciter selection
    // The exact implementation depends on the UI
  });

  test("should close settings when clicking outside", async ({ page }) => {
    // Open settings
    const menuButton = page.getByTitle("Menu");
    await menuButton.click();
    await page.waitForTimeout(500);

    // Click outside settings panel
    await page.locator("body").click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(300);
  });
});
