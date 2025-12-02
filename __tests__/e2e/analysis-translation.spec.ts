import { test, expect } from "@playwright/test";

test.describe("Analysis Panel Translation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/quran_reader/");
    // Wait for the app to load
    await page.waitForSelector('[data-testid="ayah-card"], .font-quran', { timeout: 10000 });
  });

  test("should open translation menu for selected word", async ({ page }) => {
    // Find a word in the Quran text and click it to analyze
    const arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();

    // Wait for SmartContextMenu to appear
    await page.waitForSelector("text=Analyze", { timeout: 5000 });

    // Click "Analyze" button
    await page.click("text=Analyze");

    // Wait for analysis sidebar to open
    await page.waitForSelector("text=Research Panel", { timeout: 5000 });

    // Wait for the selected word to appear
    await page.waitForSelector("text=Selected Word", { timeout: 5000 });

    // Find and click on the selected word in the analysis sidebar
    const selectedWord = page
      .locator('button:has-text("Selected Word")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await selectedWord.click();

    // Wait for translation menu to appear
    await page.waitForSelector("text=Translate", { timeout: 3000 });

    // Verify all 5 translation services are listed
    await expect(page.locator("text=Abadis")).toBeVisible();
    await expect(page.locator("text=Vajehyab")).toBeVisible();
    await expect(page.locator("text=Wiki Ahlolbait")).toBeVisible();
    await expect(page.locator("text=Almaany")).toBeVisible();
    await expect(page.locator("text=Google Translate")).toBeVisible();
  });

  test("should open translation menu for root word", async ({ page }) => {
    // Find a word in the Quran text and click it to analyze
    const arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();

    // Wait for SmartContextMenu and click Analyze
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");

    // Wait for analysis sidebar to open and show root
    await page.waitForSelector("text=Root", { timeout: 5000 });

    // Find and click on the root word (inside the emerald-colored section)
    const rootWord = page
      .locator('button:has-text("Root")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await rootWord.click();

    // Wait for translation menu to appear
    await page.waitForSelector("text=Translate", { timeout: 3000 });

    // Verify translation services are listed
    await expect(page.locator("text=Abadis")).toBeVisible();
    await expect(page.locator("text=Google Translate")).toBeVisible();
  });

  test("should close menu when clicking outside", async ({ page }) => {
    // Open analysis panel
    const arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");
    await page.waitForSelector("text=Research Panel", { timeout: 5000 });

    // Click on selected word to open menu
    const selectedWord = page
      .locator('button:has-text("Selected Word")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await selectedWord.click();

    // Wait for translation menu
    await page.waitForSelector("text=Translate", { timeout: 3000 });

    // Click elsewhere in the sidebar (outside the menu)
    await page.click("text=Research Panel");

    // Menu should close
    await expect(page.locator("text=Translate")).not.toBeVisible({ timeout: 2000 });
  });

  test("should open translation service in new tab", async ({ context, page }) => {
    // Open analysis panel
    const arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");
    await page.waitForSelector("text=Research Panel", { timeout: 5000 });

    // Click on root word to open menu
    const rootWord = page
      .locator('button:has-text("Root")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await rootWord.click();

    // Wait for translation menu
    await page.waitForSelector("text=Translate", { timeout: 3000 });

    // Listen for new tab/page
    const pagePromise = context.waitForEvent("page");

    // Click on Google Translate service
    await page.click("text=Google Translate");

    // Wait for new page and verify URL
    const newPage = await pagePromise;
    await newPage.waitForLoadState();

    // Verify the URL contains translate.google.com
    expect(newPage.url()).toContain("translate.google.com");

    // Close the new tab
    await newPage.close();
  });

  test("should switch from word menu to root menu", async ({ page }) => {
    // Open analysis panel
    const arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");
    await page.waitForSelector("text=Research Panel", { timeout: 5000 });

    // Click on selected word to open menu
    const selectedWord = page
      .locator('button:has-text("Selected Word")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await selectedWord.click();

    // Wait for translation menu
    await page.waitForSelector("text=Translate", { timeout: 3000 });

    // Verify menu is open with word
    await expect(page.locator("text=Translate")).toBeVisible();

    // Click on root word to switch menu
    const rootWord = page
      .locator('button:has-text("Root")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await rootWord.click();

    // Menu should still be visible (switched, not closed)
    await expect(page.locator("text=Translate")).toBeVisible();

    // Should still show all services
    await expect(page.locator("text=Abadis")).toBeVisible();
  });

  test("should close menu when new analysis is performed", async ({ page }) => {
    // Open analysis panel
    let arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");
    await page.waitForSelector("text=Research Panel", { timeout: 5000 });

    // Click on selected word to open menu
    const selectedWord = page
      .locator('button:has-text("Selected Word")')
      .locator("..")
      .locator("button.font-quran")
      .first();
    await selectedWord.click();

    // Wait for translation menu
    await page.waitForSelector("text=Translate", { timeout: 3000 });
    await expect(page.locator("text=Translate")).toBeVisible();

    // Close the research panel
    const closeButton = page.locator('button[aria-label="Close"], button:has-text("×")').first();
    await closeButton.click();

    // Click on a different word to analyze
    arabicWord = page.locator(".font-quran").nth(5);
    await arabicWord.click();
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");

    // Wait for new analysis to load
    await page.waitForSelector("text=Root", { timeout: 5000 });

    // Translation menu should not be visible (new analysis clears menu state)
    await expect(page.locator("text=Translate")).not.toBeVisible({ timeout: 2000 });
  });

  test("should show hover effect on word and root buttons", async ({ page }) => {
    // Open analysis panel
    const arabicWord = page.locator(".font-quran").first();
    await arabicWord.click();
    await page.waitForSelector("text=Analyze", { timeout: 5000 });
    await page.click("text=Analyze");
    await page.waitForSelector("text=Research Panel", { timeout: 5000 });

    // Find selected word button
    const selectedWord = page
      .locator('button:has-text("Selected Word")')
      .locator("..")
      .locator("button.font-quran")
      .first();

    // Hover over it
    await selectedWord.hover();

    // Check that the button exists and is visible
    await expect(selectedWord).toBeVisible();

    // Find root word button
    const rootWord = page
      .locator('button:has-text("Root")')
      .locator("..")
      .locator("button.font-quran")
      .first();

    // Hover over it
    await rootWord.hover();

    // Check that the button exists and is visible
    await expect(rootWord).toBeVisible();
  });
});
